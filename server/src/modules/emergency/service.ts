import { createHash } from "node:crypto";

import { and, desc, eq, gte } from "drizzle-orm";

import type { Db } from "../../db/client.js";
import { exposures, type PetRow, type Species } from "../../db/schema.js";
import { ageInMonths } from "../diet/calculations.js";
import { findSubstance } from "../knowledge/content.js";
import { listRecords, todayInFinland } from "../passport/service.js";
import { assess } from "../symptoms/assessment.js";
import { symptomContent, symptomLabel } from "../symptoms/content.js";
import { historyFor } from "../symptoms/service.js";
import { type EmergencyContent, emergencyContent, type InstructionLevel, type QuickQuestion } from "./content.js";

export type Language = "fi" | "sv" | "en";

const levelOrder: Record<InstructionLevel, number> = { monitor: 0, goNow: 1, callNow: 2 };
const higher = (a: InstructionLevel, b: InstructionLevel) => (levelOrder[a] >= levelOrder[b] ? a : b);

export const contentStatus = () => ({
  status: emergencyContent.meta.status,
  updatedOn: emergencyContent.meta.updatedOn,
});

/** Changes whenever the content file changes, so clients can cache the guides for offline use. */
export const contentEtag = `"${createHash("sha256").update(JSON.stringify(emergencyContent)).digest("hex").slice(0, 16)}"`;

/** The signs list without the server-side symptom ids (the app's EmergencySign shape). */
export const signsForApp = () => emergencyContent.signs.map(({ symptom: _symptom, ...sign }) => sign);

export const questionsFor = (species: Species | undefined) =>
  emergencyContent.quickAssessment.questions.filter((q) => !species || q.species.includes(species));

export const toQuestionDto = (question: QuickQuestion, lang: Language) => ({
  id: question.id,
  text: question.text[lang],
  dangerAnswer: question.dangerAnswer,
  topicId: question.topicId,
});

// ---- Quick assessment (stage 1) ----

export type QuickResult = {
  level: InstructionLevel;
  triggered: QuickQuestion[];
  unanswered: QuickQuestion[];
};

/**
 * Yes/no answers → one clear instruction: call the emergency clinic now, go to the emergency
 * clinic, or monitor and log the symptoms. Unknown question ids are ignored.
 */
export const quickAssess = (
  species: Species,
  answers: Record<string, boolean>,
  content: EmergencyContent = emergencyContent,
): QuickResult => {
  const questions = content.quickAssessment.questions.filter((q) => q.species.includes(species));
  const triggered = questions.filter((q) => answers[q.id] === q.dangerAnswer);
  const level = triggered.reduce<InstructionLevel>(
    (current, q) => higher(current, q.levelBySpecies?.[species] ?? q.level),
    "monitor",
  );
  return { level, triggered, unanswered: questions.filter((q) => answers[q.id] === undefined) };
};

export const renderQuickResult = (species: Species, result: QuickResult, lang: Language) => {
  const instruction = emergencyContent.quickAssessment.instructions[result.level];
  const topics = new Map(emergencyContent.topics.map((t) => [t.id, t]));
  const guideIds = [...new Set(result.triggered.map((q) => q.topicId).filter((id): id is string => id !== null))];
  return {
    level: result.level,
    title: instruction.title[lang],
    body: instruction.body[lang],
    /** Call the nearest open emergency clinic straight away */
    callEmergencyClinic: result.level === "callNow",
    /** Show the emergency clinics by distance and opening status (map, spec 7) */
    showEmergencyClinics: result.level !== "monitor",
    /** Open the daily log to write the symptoms down */
    logSymptoms: result.level === "monitor",
    /** "My pet ate this" in the knowledge base */
    openKnowledgeBase: result.triggered.some((q) => q.symptom === "suspectedPoisoning"),
    guides: guideIds.map((id) => ({ id, title: topics.get(id)!.title[lang] })),
    triggered: result.triggered.map((q) => ({
      questionId: q.id,
      text: q.text[lang],
      level: q.levelBySpecies?.[species] ?? q.level,
    })),
    unanswered: result.unanswered.map((q) => q.id),
    disclaimer: emergencyContent.disclaimer[lang],
  };
};

// ---- With the pet's history (signed in) ----

const EXPOSURE_HOURS = symptomContent.severity.exposure.withinHours;

const recentExposures = (db: Db, petId: string, now = Date.now()) =>
  db
    .select()
    .from(exposures)
    .where(and(eq(exposures.petId, petId), gte(exposures.occurredAt, now - EXPOSURE_HOURS * 3_600_000)))
    .orderBy(desc(exposures.occurredAt))
    .all()
    .filter((e) => e.riskLevel !== "harmless" && e.occurredAt <= now);

/**
 * Answers already known from the pet's history, so there are fewer questions: something
 * dangerous eaten in the last 72 hours ("My pet ate this") answers "Has it eaten something
 * dangerous?".
 */
export const knownAnswers = (
  db: Db,
  pet: PetRow,
  lang: Language,
): { answers: Record<string, boolean>; reasons: { questionId: string; text: string }[] } => {
  const exposure = recentExposures(db, pet.id)[0];
  if (!exposure) {
    return { answers: {}, reasons: [] };
  }
  const name = findSubstance(exposure.substanceId)?.names[lang][0] ?? exposure.substanceId;
  return { answers: { ateDangerous: true }, reasons: [{ questionId: "ateDangerous", text: name }] };
};

/**
 * Runs the symptom assessment (spec 12) on the triggered questions' symptoms, so the pet's
 * illnesses, recent surgery, age and recent exposures count. The result can only raise the
 * quick assessment's instruction, never lower it.
 */
export const assessWithHistory = (db: Db, pet: PetRow, result: QuickResult) => {
  const today = todayInFinland();
  const emergencyIds = new Set(
    symptomContent.emergencyList.filter((e) => e.species.includes(pet.species)).map((e) => e.symptom),
  );
  const symptoms = [...new Set(result.triggered.map((q) => q.symptom).filter((s): s is string => s !== null))];
  const { now, history } = historyFor(db, pet, today);
  const assessment = assess({
    pet: { name: pet.name, species: pet.species, ageMonths: ageInMonths(pet.birthDate, today) },
    date: today,
    now,
    questions: [],
    answers: {},
    emergencySymptoms: symptoms.filter((s) => emergencyIds.has(s)),
    extraSymptoms: symptoms.filter((s) => !emergencyIds.has(s)),
    history,
  });
  const fromHistory: InstructionLevel =
    assessment.level === "emergency" ? "callNow" : assessment.level === "contactVet" ? "goNow" : "monitor";
  // With no symptoms at all, the history alone doesn't call for an emergency visit.
  const level = symptoms.length === 0 ? result.level : higher(result.level, fromHistory);
  return { result: { ...result, level }, assessment };
};

// ---- Summary for the vet ----

const fill = (template: string, n: number) => template.replace("{n}", String(n));

/**
 * Short facts to show the vet or read out on the phone (spec 6): species, age, weight,
 * symptoms, medication and allergies, plus earlier diagnoses, recent surgery and anything
 * dangerous eaten in the last 72 hours.
 */
export const vetSummary = (db: Db, pet: PetRow, symptoms: string[], lang: Language, now = Date.now()) => {
  const today = todayInFinland();
  const labels = emergencyContent.summary.labels;
  const records = listRecords(db, pet.id);
  const data = (r: (typeof records)[number]) => r.data as Record<string, string | null>;

  const ageMonths = ageInMonths(pet.birthDate, today);
  const medications = records
    .filter((r) => r.kind === "medication" && (data(r).startDate ?? "") <= today && (!data(r).endDate || data(r).endDate! >= today))
    .map((r) => ({ name: data(r).name ?? "", dosage: data(r).dosage }));
  const allergies = records
    .filter((r) => r.kind === "allergy")
    .map((r) => ({ allergen: data(r).allergen ?? "", severity: data(r).severity ?? "unknown" }));
  const conditions = records
    .filter((r) => r.kind === "visit" && data(r).diagnosis)
    .slice(0, 5)
    .map((r) => ({ diagnosis: data(r).diagnosis as string, date: data(r).visitedOn as string }));
  const surgeries = records
    .filter((r) => r.kind === "surgery")
    .slice(0, 3)
    .map((r) => ({ name: data(r).name ?? "", date: data(r).performedOn as string }));
  const eaten = recentExposures(db, pet.id, now).map((e) => ({
    substance: findSubstance(e.substanceId)?.names[lang][0] ?? e.substanceId,
    hoursAgo: Math.max(0, Math.round((now - e.occurredAt) / 3_600_000)),
    riskLevel: e.riskLevel,
    amount: e.amount,
  }));

  const age =
    ageMonths === null
      ? labels.unknown[lang]
      : ageMonths < 24
        ? fill(emergencyContent.summary.months[lang], ageMonths)
        : fill(emergencyContent.summary.years[lang], Math.floor(ageMonths / 12));
  const list = (items: string[]) => (items.length ? items.join(", ") : labels.none[lang]);
  const lines = [
    `${pet.name}: ${emergencyContent.summary.species[pet.species][lang]}${pet.breed ? ` (${pet.breed})` : ""}`,
    `${labels.age[lang]}: ${age}`,
    `${labels.weight[lang]}: ${pet.weightKg === null ? labels.unknown[lang] : `${pet.weightKg} kg`}`,
    ...(symptoms.length ? [`${labels.symptoms[lang]}: ${list(symptoms.map((s) => symptomLabel(s, lang)))}`] : []),
    `${labels.medications[lang]}: ${list(medications.map((m) => (m.dosage ? `${m.name} ${m.dosage}` : m.name)))}`,
    `${labels.allergies[lang]}: ${list(allergies.map((a) => a.allergen))}`,
    ...(conditions.length ? [`${labels.conditions[lang]}: ${list(conditions.map((c) => `${c.diagnosis} (${c.date})`))}`] : []),
    ...(surgeries.length ? [`${labels.surgeries[lang]}: ${list(surgeries.map((s) => `${s.name} (${s.date})`))}`] : []),
    ...(eaten.length
      ? [`${labels.exposures[lang]}: ${list(eaten.map((e) => `${e.substance}, ${fill(emergencyContent.summary.hoursAgo[lang], e.hoursAgo)}`))}`]
      : []),
  ];

  return {
    pet: { name: pet.name, species: pet.species, breed: pet.breed, ageMonths, weightKg: pet.weightKg },
    symptoms: symptoms.map((id) => ({ id, label: symptomLabel(id, lang) })),
    medications,
    allergies,
    conditions,
    surgeries,
    exposures: eaten,
    /** One fact per line, to show on screen or read out loud on the phone */
    text: lines.join("\n"),
  };
};
