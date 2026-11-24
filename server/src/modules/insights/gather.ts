import type { Db } from "../../db/client.js";
import type { PetRow } from "../../db/schema.js";
import { listCarePlans, listVisits } from "../care/service.js";
import { addDays } from "../care/time.js";
import { ageInMonths } from "../diet/calculations.js";
import { listRecords } from "../passport/service.js";
import { daysBetween } from "../symptoms/assessment.js";
import { type SeverityLevel, symptomContent, symptomLabel } from "../symptoms/content.js";
import {
  activeWatchLists,
  healthStatus,
  type Language,
  listLogs,
  questionsFor,
} from "../symptoms/service.js";

/** How far back the AI looks at the daily logs */
export const INSIGHT_DAYS = 14;
/** The vet's text is cut to this many characters to keep the request small */
const MAX_VET_TEXT = 6000;

/** Everything the AI gets about one pet: what the vet said and how the pet has been. Plain text only. */
export type InsightInput = {
  pet: { name: string; species: string; ageMonths: number | null };
  today: string;
  rules: { level: SeverityLevel; reasons: string[]; stale: boolean };
  vet: {
    visits: { date: string; title: string; clinic: string }[];
    /** The latest care plan, with the vet's own text as it was written */
    carePlan: { diagnosis: string; findings: string; homeCare: string[]; vetText: string } | null;
    medications: { name: string; dosage: string | null; startDate: string | null; endDate: string | null }[];
    watchLists: { condition: string; day: number | null; totalDays: number | null }[];
    allergies: string[];
  };
  behaviour: { date: string; level: SeverityLevel; answers: string[]; symptoms: string[]; note: string | null }[];
};

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value : null);

export const gatherInsightInput = (db: Db, pet: PetRow, lang: Language, today: string): InsightInput => {
  const status = healthStatus(db, pet, lang, today);
  const records = listRecords(db, pet.id);
  const plans = listCarePlans(db, pet);
  const latestPlan = plans[0]?.plan ?? null;

  // Question labels for the answers, also for watch lists that have ended since.
  const labels = new Map(questionsFor(db, pet.id, today).questions.map(({ question }) => [question.id, question]));
  for (const list of activeWatchLists(db, pet.id, addDays(today, -INSIGHT_DAYS))) {
    for (const question of list.questions) labels.set(question.id, question);
  }

  const logs = listLogs(db, pet.id, addDays(today, -(INSIGHT_DAYS - 1)), today);

  return {
    pet: { name: pet.name, species: pet.species, ageMonths: ageInMonths(pet.birthDate, today) },
    today,
    rules: {
      level: status.level,
      reasons: status.latestLog && !status.stale ? status.latestLog.assessment.reasons.map((r) => r.text) : [],
      stale: status.stale,
    },
    vet: {
      visits: listVisits(db, pet)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 3)
        .map((v) => ({ date: v.date, title: v.title, clinic: v.clinicName })),
      carePlan: latestPlan
        ? {
            diagnosis: latestPlan.diagnosis,
            findings: latestPlan.findings,
            homeCare: latestPlan.homeCare,
            vetText: latestPlan.originalText.slice(0, MAX_VET_TEXT),
          }
        : null,
      medications: records
        .filter((r) => r.kind === "medication")
        .map((r) => {
          const data = r.data as Record<string, unknown>;
          return {
            name: text(data.name) ?? "",
            dosage: text(data.dosage),
            startDate: text(data.startDate),
            endDate: text(data.endDate),
          };
        })
        .filter((m) => !m.endDate || daysBetween(m.endDate, today) <= 60),
      watchLists: status.watchLists.map((w) => ({ condition: w.condition, day: w.currentDay, totalDays: w.totalDays })),
      allergies: records
        .filter((r) => r.kind === "allergy")
        .map((r) => text((r.data as Record<string, unknown>).allergen) ?? "")
        .filter(Boolean),
    },
    // Oldest first, so the AI reads the days in order.
    behaviour: [...logs].reverse().map((log) => ({
      date: log.loggedOn,
      level: log.level,
      answers: Object.entries(log.answers).flatMap(([id, answer]) => {
        const question = labels.get(id);
        return question ? [`${question.label[lang]}: ${question.options[answer][lang]}`] : [];
      }),
      symptoms: [...log.emergencySymptoms, ...log.extraSymptoms].map((id) => symptomLabel(id, lang)),
      note: log.note,
    })),
  };
};

/** The rules' level as text, for the sample writer. */
export const levelTitle = (level: SeverityLevel, lang: Language) => symptomContent.levels[level].title[lang];
