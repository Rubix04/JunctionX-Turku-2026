import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

import { severityLevels, species } from "../../db/schema.js";

// Daily log questions, watch list templates and severity rules are medical content (spec 1 and
// 12): they live in content/symptom-tracking.json so a vet can review and change them without
// touching code. The file is validated at startup.

export { severityLevels };
export type SeverityLevel = (typeof severityLevels)[number];

const localized = z.object({ fi: z.string(), sv: z.string(), en: z.string() });
const answer = z.union([z.literal(0), z.literal(1), z.literal(2)]);
export type Answer = z.infer<typeof answer>;

/** One question with three answers. The thresholds say which answers raise the level. */
export const questionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: localized,
  options: z.tuple([localized, localized, localized]),
  /** The answer that means "as usual" for this question; used for trends and the pet's baseline */
  usualAnswer: answer.default(1),
  yellowIf: z.array(answer).default([]),
  redIf: z.array(answer).default([]),
  emergencyIf: z.array(answer).default([]),
  /** Symptom ids each answer stands for, used by the severity rules and seasonal alerts */
  symptoms: z.partialRecord(z.enum(["0", "1", "2"]), z.array(z.string())).default({}),
});
export type Question = z.infer<typeof questionSchema>;

const ruleSchema = z.object({ symptoms: z.array(z.string()).min(1), level: z.enum(severityLevels) });
export type SeverityRule = z.infer<typeof ruleSchema>;

const perSpecies = z.object({ dog: z.number().int(), cat: z.number().int(), smallAnimal: z.number().int() });

const contentSchema = z
  .object({
    meta: z.object({
      status: z.enum(["sample", "reviewed"]),
      reviewedBy: z.string().nullable(),
      updatedOn: z.iso.date(),
      notice: z.string(),
      sources: z.array(z.string()),
    }),
    disclaimer: localized,
    /** All symptom ids with their names. Shared with the seasonal alerts' symptom tags. */
    symptoms: z.array(z.object({ id: z.string(), label: localized })).min(1),
    /** Always one tap away (spec 1). Any of these in a log means an emergency. */
    emergencyList: z.array(
      z.object({ symptom: z.string(), species: z.array(z.enum(species)).min(1), description: localized }),
    ),
    /** Asked on every daily log, with or without a watch list */
    generalQuestions: z.array(questionSchema).min(1),
    watchListTemplates: z.array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]+$/),
        species: z.array(z.enum(species)).min(1),
        condition: localized,
        /** {pet} is replaced with the pet's name */
        intro: localized,
        /** Lower-case word stems matched against visit diagnoses and surgeries (fi, sv, en) */
        diagnosisKeywords: z.array(z.string()).min(1),
        /** Null for long-term conditions that are watched until the vet ends it */
        defaultDays: z.number().int().positive().nullable(),
        questions: z.array(questionSchema).min(1),
      }),
    ),
    severity: z.object({
      /** Long-term illnesses found in the passport (visit diagnoses and medications) */
      conditions: z.array(
        z.object({
          id: z.string(),
          label: localized,
          diagnosisKeywords: z.array(z.string()),
          medicationKeywords: z.array(z.string()),
          rules: z.array(ruleSchema),
        }),
      ),
      recentSurgery: z.object({ days: z.number().int().positive(), rules: z.array(ruleSchema) }),
      age: z.array(
        z.object({
          group: z.enum(["young", "senior"]),
          maxAgeMonths: perSpecies.optional(),
          minAgeMonths: perSpecies.optional(),
          rules: z.array(ruleSchema),
        }),
      ),
      /** "My pet ate this" (spec 10) followed by symptoms */
      exposure: z.object({
        withinHours: z.number().int().positive(),
        symptoms: z.array(z.string()),
        levelByRisk: z.object({
          caution: z.enum(severityLevels),
          dangerous: z.enum(severityLevels),
          emergency: z.enum(severityLevels),
        }),
      }),
      /** The same symptom this many days in a row raises the level */
      persistence: z.object({
        days: z.number().int().min(2),
        overrides: z.array(z.object({ symptom: z.string(), species: z.enum(species), days: z.number().int().min(2) })),
        level: z.enum(severityLevels),
      }),
      /** The pet's own normal, learned from earlier logs */
      baseline: z.object({
        windowDays: z.number().int().positive(),
        recentDays: z.number().int().positive(),
        minLogs: z.number().int().positive(),
        minDeviatingDays: z.number().int().positive(),
      }),
      /** How long the latest log decides the pet's status on the home screen */
      statusValidDays: z.number().int().positive(),
    }),
    levels: z.record(z.enum(severityLevels), z.object({ title: localized, action: localized })),
    reasons: z.record(
      z.enum([
        "allClear",
        "emergencySymptom",
        "vetThreshold",
        "generalThreshold",
        "reportedSymptom",
        "condition",
        "recentSurgery",
        "ageYoung",
        "ageSenior",
        "exposure",
        "persistent",
        "baselineDeviation",
        "insufficientData",
      ]),
      localized,
    ),
  })
  .superRefine((content, ctx) => {
    const symptomIds = new Set(content.symptoms.map((s) => s.id));
    const check = (where: string, ids: string[]) => {
      for (const id of ids.filter((s) => !symptomIds.has(s))) {
        ctx.addIssue({ code: "custom", message: `${where}: unknown symptom ${id}` });
      }
    };
    const checkQuestions = (where: string, questions: Question[], seen: Set<string>) => {
      for (const question of questions) {
        if (seen.has(question.id)) {
          ctx.addIssue({ code: "custom", message: `${where}: duplicate question id ${question.id}` });
        }
        seen.add(question.id);
        check(`${where}/${question.id}`, Object.values(question.symptoms).flat());
      }
    };

    const questionIds = new Set<string>();
    checkQuestions("generalQuestions", content.generalQuestions, questionIds);
    const templateIds = new Set<string>();
    for (const template of content.watchListTemplates) {
      if (templateIds.has(template.id)) {
        ctx.addIssue({ code: "custom", message: `duplicate watch list template ${template.id}` });
      }
      templateIds.add(template.id);
      checkQuestions(`watchListTemplates/${template.id}`, template.questions, questionIds);
    }
    check("emergencyList", content.emergencyList.map((e) => e.symptom));
    const { severity } = content;
    for (const condition of severity.conditions) {
      check(`conditions/${condition.id}`, condition.rules.flatMap((r) => r.symptoms));
    }
    check("recentSurgery", severity.recentSurgery.rules.flatMap((r) => r.symptoms));
    for (const group of severity.age) {
      check(`age/${group.group}`, group.rules.flatMap((r) => r.symptoms));
    }
    check("exposure", severity.exposure.symptoms);
    check("persistence", severity.persistence.overrides.map((o) => o.symptom));
  });

export type SymptomContent = z.infer<typeof contentSchema>;
export type WatchListTemplate = SymptomContent["watchListTemplates"][number];

const contentPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../../content/symptom-tracking.json");

export const symptomContent: SymptomContent = contentSchema.parse(JSON.parse(readFileSync(contentPath, "utf8")));

export const findTemplate = (id: string) => symptomContent.watchListTemplates.find((t) => t.id === id);

export const symptomLabel = (id: string, lang: keyof z.infer<typeof localized>) =>
  symptomContent.symptoms.find((s) => s.id === id)?.label[lang] ?? id;
