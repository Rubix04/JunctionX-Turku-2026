import type {
  LocalizedText,
  Species,
  StoredAssessment,
  StoredQuestion,
  StoredReason,
} from "../../db/schema.js";
import { type Answer, type SeverityLevel, type SeverityRule, type SymptomContent, symptomContent } from "./content.js";

// Severity assessment (spec 12). Pure functions: the routes gather the pet's history and pass it in.
//
// Order of precedence:
// 1. Emergency symptoms always mean an emergency, whatever the history.
// 2. Each answer is checked against its question's thresholds. For watch list questions these
//    are the vet's limits for this pet, and they are final: history does not raise them.
// 3. Other symptoms can be raised by the pet's history: long-term illnesses, a recent surgery,
//    age, something dangerous eaten recently, the same symptom several days in a row, and
//    changes from the pet's own normal learned from earlier logs.
// 4. Precautionary principle: with too little information about the pet, "monitor" becomes
//    "contact a vet".

const levelOrder: Record<SeverityLevel, number> = { normal: 0, monitor: 1, contactVet: 2, emergency: 3 };
export const maxLevel = (a: SeverityLevel, b: SeverityLevel) => (levelOrder[a] >= levelOrder[b] ? a : b);
export const trafficLightFor = (level: SeverityLevel): "green" | "yellow" | "red" =>
  level === "normal" ? "green" : level === "monitor" ? "yellow" : "red";

const DAY_MS = 24 * 60 * 60 * 1000;
const addDays = (isoDate: string, days: number) =>
  new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

export type AssessedQuestion = {
  question: StoredQuestion;
  /** Watch list questions carry the vet's thresholds; general questions the app's defaults */
  source: "watchList" | "general";
  condition?: LocalizedText;
};

export type PastLog = {
  loggedOn: string;
  answers: Record<string, Answer>;
  symptoms: string[];
};

export type AssessmentInput = {
  pet: { name: string; species: Species; ageMonths: number | null };
  /** ISO date of the log being assessed */
  date: string;
  /** Epoch ms used for "eaten within N hours" */
  now: number;
  questions: AssessedQuestion[];
  answers: Record<string, Answer>;
  emergencySymptoms: string[];
  extraSymptoms: string[];
  history: {
    /** Visit diagnoses and reasons up to the date */
    diagnoses: string[];
    /** Names of medications in use on the date */
    medications: string[];
    /** ISO dates of surgeries up to the date */
    surgeryDates: string[];
    /** False if the passport is empty */
    hasRecords: boolean;
    /** Logs before the date, any order */
    logs: PastLog[];
    exposures: { substanceName: LocalizedText; riskLevel: string; occurredAt: number }[];
  };
};

type SymptomSource = "vet" | "general" | "extra" | "emergency";

/** Symptom ids for each answered question. */
export const symptomsForAnswers = (questions: StoredQuestion[], answers: Record<string, Answer>) =>
  questions.flatMap((question) => {
    const answer = answers[question.id];
    return answer === undefined ? [] : (question.symptoms[String(answer) as "0" | "1" | "2"] ?? []);
  });

const thresholdLevel = (question: StoredQuestion, answer: Answer): SeverityLevel =>
  question.emergencyIf.includes(answer)
    ? "emergency"
    : question.redIf.includes(answer)
      ? "contactVet"
      : question.yellowIf.includes(answer)
        ? "monitor"
        : "normal";

/** The answer the pet gives most often. Ties go to the one closest to "usual". */
const usualAnswerOf = (question: StoredQuestion, answers: Answer[]): Answer => {
  const counts = [0, 0, 0];
  for (const answer of answers) {
    counts[answer] += 1;
  }
  const distance = (a: number) => Math.abs(a - question.usualAnswer);
  return ([0, 1, 2] as Answer[]).sort((a, b) => counts[b] - counts[a] || distance(a) - distance(b))[0];
};

export const assess = (input: AssessmentInput, content: SymptomContent = symptomContent): StoredAssessment => {
  const { pet, date, history } = input;
  const severity = content.severity;
  const reasons: StoredReason[] = [];
  // Changed by raise(); the cast stops TypeScript from narrowing it to "normal".
  let level = "normal" as SeverityLevel;
  const raise = (to: SeverityLevel, reason: Omit<StoredReason, "level">) => {
    level = maxLevel(level, to);
    reasons.push({ ...reason, level: to });
  };

  const sources = new Map<string, Set<SymptomSource>>();
  const addSymptom = (id: string, source: SymptomSource) => {
    sources.set(id, (sources.get(id) ?? new Set()).add(source));
  };

  // 1–2. Answers against thresholds
  for (const { question, source, condition } of input.questions) {
    const answer = input.answers[question.id];
    if (answer === undefined) {
      continue;
    }
    for (const id of question.symptoms[String(answer) as "0" | "1" | "2"] ?? []) {
      addSymptom(id, source === "watchList" ? "vet" : "general");
    }
    const answerLevel = thresholdLevel(question, answer);
    if (answerLevel !== "normal") {
      raise(answerLevel, {
        code: source === "watchList" ? "vetThreshold" : "generalThreshold",
        params: {
          question: question.label,
          answer: question.options[answer],
          ...(condition && { condition }),
        },
      });
    }
  }
  for (const id of input.extraSymptoms) {
    addSymptom(id, "extra");
    raise("monitor", { code: "reportedSymptom", params: { symptom: id } });
  }
  for (const id of input.emergencySymptoms) {
    addSymptom(id, "emergency");
  }

  // 1. Emergency symptoms override everything, wherever they came from.
  const emergencyIds = new Set(
    content.emergencyList.filter((entry) => entry.species.includes(pet.species)).map((entry) => entry.symptom),
  );
  for (const id of sources.keys()) {
    if (emergencyIds.has(id) || sources.get(id)?.has("emergency")) {
      raise("emergency", { code: "emergencySymptom", params: { symptom: id } });
    }
  }

  // 3. History. Symptoms that only come from the vet's own thresholds are left as the vet set them.
  const escalatable = [...sources.entries()]
    .filter(([, from]) => !(from.size === 1 && from.has("vet")))
    .map(([id]) => id);
  const applyRules = (rules: SeverityRule[], reason: (symptoms: string[]) => Omit<StoredReason, "level">) => {
    for (const rule of rules) {
      const matched = escalatable.filter((id) => rule.symptoms.includes(id));
      if (matched.length > 0) {
        raise(rule.level, reason(matched));
      }
    }
  };

  const diagnosisText = history.diagnoses.join(" ").toLowerCase();
  const medicationText = history.medications.join(" ").toLowerCase();
  for (const condition of severity.conditions) {
    const hasIt =
      condition.diagnosisKeywords.some((keyword) => diagnosisText.includes(keyword)) ||
      condition.medicationKeywords.some((keyword) => medicationText.includes(keyword));
    if (hasIt) {
      applyRules(condition.rules, (symptoms) => ({
        code: "condition",
        params: { pet: pet.name, condition: condition.label, symptom: symptoms },
      }));
    }
  }

  const surgeryAgo = history.surgeryDates
    .map((surgeryDate) => daysBetween(surgeryDate, date))
    .filter((days) => days >= 0 && days <= severity.recentSurgery.days)
    .sort((a, b) => a - b)[0];
  if (surgeryAgo !== undefined) {
    applyRules(severity.recentSurgery.rules, (symptoms) => ({
      code: "recentSurgery",
      params: { pet: pet.name, days: surgeryAgo, symptom: symptoms },
    }));
  }

  if (pet.ageMonths !== null) {
    for (const group of severity.age) {
      const inGroup =
        group.group === "young"
          ? group.maxAgeMonths !== undefined && pet.ageMonths <= group.maxAgeMonths[pet.species]
          : group.minAgeMonths !== undefined && pet.ageMonths >= group.minAgeMonths[pet.species];
      if (inGroup) {
        applyRules(group.rules, (symptoms) => ({
          code: group.group === "young" ? "ageYoung" : "ageSenior",
          params: { symptom: symptoms },
        }));
      }
    }
  }

  // Something dangerous eaten recently plus a poisoning symptom: emergency symptoms override
  // history, so every symptom counts here, also those from the vet's thresholds.
  const exposureSymptoms = [...sources.keys()].filter((id) => severity.exposure.symptoms.includes(id));
  if (exposureSymptoms.length > 0) {
    const windowMs = severity.exposure.withinHours * 60 * 60 * 1000;
    const recent = history.exposures
      .filter((e) => e.occurredAt <= input.now && input.now - e.occurredAt <= windowMs)
      .filter((e): e is typeof e & { riskLevel: keyof typeof severity.exposure.levelByRisk } =>
        e.riskLevel in severity.exposure.levelByRisk,
      )
      .sort((a, b) => levelOrder[severity.exposure.levelByRisk[b.riskLevel]] - levelOrder[severity.exposure.levelByRisk[a.riskLevel]]);
    if (recent[0]) {
      raise(severity.exposure.levelByRisk[recent[0].riskLevel], {
        code: "exposure",
        params: {
          pet: pet.name,
          substance: recent[0].substanceName,
          hours: severity.exposure.withinHours,
          symptom: exposureSymptoms,
        },
      });
    }
  }

  const logsByDate = new Map(history.logs.map((log) => [log.loggedOn, log]));
  for (const id of escalatable) {
    const needed =
      severity.persistence.overrides.find((o) => o.symptom === id && o.species === pet.species)?.days ??
      severity.persistence.days;
    let run = 1;
    while (logsByDate.get(addDays(date, -run))?.symptoms.includes(id)) {
      run += 1;
    }
    if (run >= needed) {
      raise(severity.persistence.level, { code: "persistent", params: { symptom: id, days: run } });
    }
  }

  // Changes from the pet's own normal. Learned from logs before the recent days, compared with
  // the recent days. Only general questions: watch list limits come from the vet.
  const { baseline } = severity;
  const baselineFrom = addDays(date, -baseline.windowDays);
  const recentFrom = addDays(date, -(baseline.recentDays - 1));
  for (const { question, source } of input.questions) {
    const today = input.answers[question.id];
    if (source !== "general" || today === undefined || thresholdLevel(question, today) !== "normal") {
      continue;
    }
    const earlier = history.logs
      .filter((log) => log.loggedOn >= baselineFrom && log.loggedOn < recentFrom)
      .map((log) => log.answers[question.id])
      .filter((answer): answer is Answer => answer !== undefined);
    if (earlier.length < baseline.minLogs) {
      continue;
    }
    const usual = usualAnswerOf(question, earlier);
    const distance = (a: number) => Math.abs(a - question.usualAnswer);
    // Different from the pet's normal and not a step back towards "as usual"
    const deviates = (a: Answer) => a !== usual && distance(a) >= distance(usual);
    if (!deviates(today)) {
      continue;
    }
    const recentAnswers = history.logs
      .filter((log) => log.loggedOn >= recentFrom && log.loggedOn < date)
      .map((log) => log.answers[question.id])
      .filter((answer): answer is Answer => answer !== undefined);
    const deviatingDays = 1 + recentAnswers.filter(deviates).length;
    if (deviatingDays >= baseline.minDeviatingDays) {
      raise("monitor", {
        code: "baselineDeviation",
        params: { pet: pet.name, question: question.label, days: deviatingDays },
      });
    }
  }

  // 4. Precautionary principle
  const insufficientData = !history.hasRecords && pet.ageMonths === null;
  if (insufficientData && level === "monitor") {
    raise("contactVet", { code: "insufficientData", params: {} });
  }

  if (level === "normal") {
    reasons.push({ code: "allClear", level: "normal", params: {} });
  }
  reasons.sort((a, b) => levelOrder[b.level] - levelOrder[a.level]);

  return { level, symptoms: [...sources.keys()], reasons, insufficientData };
};
