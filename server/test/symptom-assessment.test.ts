import { describe, expect, it } from "vitest";

import type { StoredQuestion } from "../src/db/schema.js";
import { alertsContent } from "../src/modules/alerts/content.js";
import { type AssessmentInput, assess, trafficLightFor } from "../src/modules/symptoms/assessment.js";
import { type Answer, findTemplate, symptomContent } from "../src/modules/symptoms/content.js";

const general = symptomContent.generalQuestions.map((question) => ({ question, source: "general" as const }));
const DATE = "2026-10-17";
const NOW = Date.parse("2026-10-17T12:00:00+03:00");

const input = (overrides: Partial<AssessmentInput> = {}, history: Partial<AssessmentInput["history"]> = {}): AssessmentInput => ({
  pet: { name: "Mirri", species: "cat", ageMonths: 60 },
  date: DATE,
  now: NOW,
  questions: general,
  answers: {},
  emergencySymptoms: [],
  extraSymptoms: [],
  ...overrides,
  history: {
    diagnoses: [],
    medications: [],
    surgeryDates: [],
    hasRecords: true,
    logs: [],
    exposures: [],
    ...history,
  },
});

const allUsual = { appetite: 1, energy: 1, drinking: 1, toilet: 1, pain: 0, vomiting: 0 } as Record<string, Answer>;
const codes = (result: ReturnType<typeof assess>) => result.reasons.map((r) => r.code);
const daysBefore = (days: number) =>
  new Date(Date.parse(`${DATE}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10);

describe("severity assessment", () => {
  it("is normal when everything is as usual", () => {
    const result = assess(input({ answers: allUsual }));
    expect(result).toMatchObject({ level: "normal", symptoms: [], insufficientData: false });
    expect(codes(result)).toEqual(["allClear"]);
  });

  it("uses the questions' thresholds", () => {
    expect(assess(input({ answers: { ...allUsual, appetite: 0 } })).level).toBe("monitor");
    expect(assess(input({ answers: { ...allUsual, vomiting: 2 } })).level).toBe("contactVet");
    const result = assess(input({ answers: { ...allUsual, vomiting: 2 } }));
    expect(result.symptoms).toEqual(["vomiting", "repeatedVomiting"]);
  });

  it("treats emergency symptoms as an emergency whatever else is logged", () => {
    const result = assess(input({ answers: allUsual, emergencySymptoms: ["breathingDifficulty"] }));
    expect(result.level).toBe("emergency");
    expect(codes(result)).toEqual(["emergencySymptom"]);
  });

  it("treats an emergency symptom added by hand as an emergency", () => {
    expect(assess(input({ extraSymptoms: ["seizures"] })).level).toBe("emergency");
    expect(assess(input({ extraSymptoms: ["coughing"] })).level).toBe("monitor");
  });

  it("follows the vet's thresholds on a watch list question", () => {
    const uti = findTemplate("urinary-tract")!;
    const questions = [...uti.questions.map((question) => ({ question, source: "watchList" as const, condition: uti.condition })), ...general];
    expect(assess(input({ questions, answers: { "uti-straining": 1 } })).level).toBe("monitor");
    const blocked = assess(input({ questions, answers: { "uti-straining": 2 } }));
    expect(blocked.level).toBe("emergency");
    expect(blocked.reasons[0].code).toBe("vetThreshold");
  });

  it("does not raise the vet's own limits with history, but does raise the same symptom from a general question", () => {
    const vetQuestion: StoredQuestion = {
      id: "custom-appetite",
      label: { fi: "Syöminen", sv: "Ätande", en: "Eating" },
      options: [
        { fi: "Vähän", sv: "Lite", en: "Little" },
        { fi: "Normaalisti", sv: "Normalt", en: "Normally" },
        { fi: "Paljon", sv: "Mycket", en: "A lot" },
      ],
      usualAnswer: 1,
      yellowIf: [0],
      redIf: [],
      emergencyIf: [],
      symptoms: { "0": ["appetiteLoss"] },
    };
    const kidney = { diagnoses: ["Krooninen munuaisten vajaatoiminta"] };
    const questions = [{ question: vetQuestion, source: "watchList" as const }, ...general];

    expect(assess(input({ questions, answers: { "custom-appetite": 0 } }, kidney)).level).toBe("monitor");
    const fromGeneral = assess(input({ questions, answers: { appetite: 0 } }, kidney));
    expect(fromGeneral.level).toBe("contactVet");
    expect(fromGeneral.reasons[0]).toMatchObject({ code: "condition", params: { symptom: ["appetiteLoss"] } });
  });

  it("raises the level for long-term illnesses found from diagnoses or medication", () => {
    // Constant thirst is usually "monitor", but tiredness in a diabetic cat means contacting a vet.
    const diabetic = assess(input({ answers: { ...allUsual, energy: 0 } }, { medications: ["Caninsulin 40 IU/ml"] }));
    expect(diabetic.level).toBe("contactVet");
    expect(diabetic.reasons[0].params.condition).toMatchObject({ en: "diabetes" });
    expect(assess(input({ answers: { ...allUsual, energy: 0 } })).level).toBe("monitor");
  });

  it("raises the level shortly after surgery", () => {
    const result = assess(input({ answers: { ...allUsual, pain: 1 } }, { surgeryDates: [daysBefore(5)] }));
    expect(result.level).toBe("contactVet");
    expect(result.reasons[0]).toMatchObject({ code: "recentSurgery", params: { days: 5 } });
    expect(assess(input({ answers: { ...allUsual, pain: 1 } }, { surgeryDates: [daysBefore(40)] })).level).toBe("monitor");
  });

  it("raises the level for young and old animals", () => {
    const answers = { ...allUsual, toilet: 2 as Answer };
    expect(assess(input({ answers, pet: { name: "Pentu", species: "dog", ageMonths: 3 } })).level).toBe("contactVet");
    expect(assess(input({ answers, pet: { name: "Rekku", species: "dog", ageMonths: 40 } })).level).toBe("monitor");
    const senior = assess(input({ answers: { ...allUsual, drinking: 2 }, pet: { name: "Mirri", species: "cat", ageMonths: 150 } }));
    expect(senior.reasons[0].code).toBe("ageSenior");
  });

  it("treats symptoms after eating something dangerous as possible poisoning", () => {
    const xylitol = { substanceName: { fi: "Ksylitoli", sv: "Xylitol", en: "Xylitol" }, riskLevel: "dangerous" };
    const recent = assess(
      input({ answers: { ...allUsual, vomiting: 1 } }, { exposures: [{ ...xylitol, occurredAt: NOW - 5 * 3_600_000 }] }),
    );
    expect(recent.level).toBe("emergency");
    expect(recent.reasons[0]).toMatchObject({ code: "exposure", params: { hours: 72 } });

    const old = assess(input({ answers: { ...allUsual, vomiting: 1 } }, { exposures: [{ ...xylitol, occurredAt: NOW - 100 * 3_600_000 }] }));
    expect(old.level).toBe("monitor");
    const noSymptoms = assess(input({ answers: allUsual }, { exposures: [{ ...xylitol, occurredAt: NOW - 3_600_000 }] }));
    expect(noSymptoms.level).toBe("normal");
  });

  it("raises a symptom that has lasted several days, sooner for a cat that does not eat", () => {
    const tired = (days: number) => ({ loggedOn: daysBefore(days), answers: { energy: 0 as Answer }, symptoms: ["tiredness"] });
    const dog = { name: "Rekku", species: "dog" as const, ageMonths: 40 };
    expect(assess(input({ pet: dog, answers: { energy: 0 } }, { logs: [tired(1)] })).level).toBe("monitor");
    const result = assess(input({ pet: dog, answers: { energy: 0 } }, { logs: [tired(1), tired(2)] }));
    expect(result.level).toBe("contactVet");
    expect(result.reasons[0]).toMatchObject({ code: "persistent", params: { days: 3 } });
    // A gap breaks the run.
    expect(assess(input({ pet: dog, answers: { energy: 0 } }, { logs: [tired(1), tired(3)] })).level).toBe("monitor");

    const notEating = { loggedOn: daysBefore(1), answers: { appetite: 0 as Answer }, symptoms: ["appetiteLoss"] };
    expect(assess(input({ answers: { appetite: 0 } }, { logs: [notEating] })).level).toBe("contactVet");
  });

  it("notices a change from the pet's own normal over several days", () => {
    const calm = [5, 6, 7, 8, 9, 10].map((days) => ({ loggedOn: daysBefore(days), answers: { energy: 1 as Answer }, symptoms: [] }));
    const restlessYesterday = { loggedOn: daysBefore(1), answers: { energy: 2 as Answer }, symptoms: ["restlessness"] };

    // One restless day is not yet a change.
    expect(assess(input({ answers: { energy: 2 } }, { logs: calm })).level).toBe("normal");
    const result = assess(input({ answers: { energy: 2 } }, { logs: [...calm, restlessYesterday] }));
    expect(result.level).toBe("monitor");
    expect(result.reasons[0]).toMatchObject({ code: "baselineDeviation", params: { days: 2 } });

    // A pet that is usually restless is not flagged for being restless.
    const usuallyRestless = calm.map((log) => ({ ...log, answers: { energy: 2 as Answer } }));
    expect(assess(input({ answers: { energy: 2 } }, { logs: [...usuallyRestless, restlessYesterday] })).level).toBe("normal");
    // Too few earlier logs to know the pet's normal.
    expect(assess(input({ answers: { energy: 2 } }, { logs: [...calm.slice(0, 3), restlessYesterday] })).level).toBe("normal");
  });

  it("chooses the more serious level when there is too little information", () => {
    const unknownPet = { name: "Uusi", species: "cat" as const, ageMonths: null };
    const result = assess(input({ pet: unknownPet, answers: { appetite: 0 } }, { hasRecords: false }));
    expect(result).toMatchObject({ level: "contactVet", insufficientData: true });
    expect(codes(result)).toContain("insufficientData");
    expect(assess(input({ pet: unknownPet, answers: allUsual }, { hasRecords: false })).level).toBe("normal");
  });

  it("maps the four levels to the three traffic light colours", () => {
    expect(["normal", "monitor", "contactVet", "emergency"].map((l) => trafficLightFor(l as never))).toEqual([
      "green",
      "yellow",
      "red",
      "red",
    ]);
  });
});

describe("symptom content", () => {
  it("is marked as sample content until a vet has reviewed it", () => {
    expect(symptomContent.meta.status).toBe("sample");
  });

  it("knows every symptom tag the seasonal alerts use, so log entries can match them", () => {
    const known = new Set(symptomContent.symptoms.map((s) => s.id));
    expect(alertsContent.symptomTags.filter((tag) => !known.has(tag))).toEqual([]);
  });

  it("has every text in Finnish, Swedish and English", () => {
    for (const reason of Object.values(symptomContent.reasons)) {
      expect(reason.fi && reason.sv && reason.en).toBeTruthy();
    }
  });
});
