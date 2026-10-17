import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

import { species } from "../../db/schema.js";
import { symptomContent } from "../symptoms/content.js";

// First aid guides, emergency signs and the quick assessment (spec 6) are medical content: they
// live in content/first-aid.json so a vet or first aid trainer can review them without touching
// code. The guides keep the app's FirstAidTopic shape (types/first-aid.ts). Validated at startup.

export const firstAidSizes = ["cat", "smallDog", "largeDog"] as const;
export const instructionLevels = ["callNow", "goNow", "monitor"] as const;
export type InstructionLevel = (typeof instructionLevels)[number];

const localized = z.object({ fi: z.string(), sv: z.string(), en: z.string() });

const topicSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-]+$/),
  icon: z.enum(["heartPulse", "wind", "droplet", "thermometer", "bolt", "flask", "snake", "car"]),
  title: localized,
  when: localized,
  steps: z
    .array(z.object({ text: localized, bySize: z.partialRecord(z.enum(firstAidSizes), localized).optional() }))
    .min(1),
  /** CPR: compressions per minute for the guided rhythm */
  rhythmBpm: z.number().int().positive().nullable(),
  updatedOn: z.iso.date(),
  reviewed: z.boolean(),
});

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
    topics: z.array(topicSchema).min(1),
    /** Signs that always mean: go to a vet now (emergency stage 1) */
    signs: z.array(
      z.object({
        id: z.string(),
        label: localized,
        topicId: z.string().nullable(),
        /** Id in the symptom tracking vocabulary, so the assessment can use the pet's history */
        symptom: z.string().nullable(),
      }),
    ),
    quickAssessment: z.object({
      questions: z
        .array(
          z.object({
            id: z.string().regex(/^[a-zA-Z0-9]+$/),
            text: localized,
            species: z.array(z.enum(species)).min(1),
            /** The answer that means danger: "no" to "Is it breathing?", "yes" to "Is it bleeding?" */
            dangerAnswer: z.boolean(),
            level: z.enum(["callNow", "goNow"]),
            levelBySpecies: z.partialRecord(z.enum(species), z.enum(["callNow", "goNow"])).optional(),
            topicId: z.string().nullable(),
            symptom: z.string().nullable(),
          }),
        )
        .min(1),
      instructions: z.record(z.enum(instructionLevels), z.object({ title: localized, body: localized })),
    }),
    summary: z.object({
      labels: z.record(
        z.enum([
          "species",
          "age",
          "weight",
          "symptoms",
          "medications",
          "allergies",
          "conditions",
          "surgeries",
          "exposures",
          "none",
          "unknown",
        ]),
        localized,
      ),
      species: z.record(z.enum(species), localized),
      years: localized,
      months: localized,
      hoursAgo: localized,
    }),
  })
  .superRefine((content, ctx) => {
    const topicIds = new Set(content.topics.map((t) => t.id));
    const symptomIds = new Set(symptomContent.symptoms.map((s) => s.id));
    const check = (where: string, topicId: string | null, symptom: string | null) => {
      if (topicId && !topicIds.has(topicId)) {
        ctx.addIssue({ code: "custom", message: `${where}: unknown first aid topic ${topicId}` });
      }
      if (symptom && !symptomIds.has(symptom)) {
        ctx.addIssue({ code: "custom", message: `${where}: unknown symptom ${symptom}` });
      }
    };
    if (topicIds.size !== content.topics.length) {
      ctx.addIssue({ code: "custom", message: "duplicate first aid topic id" });
    }
    for (const sign of content.signs) {
      check(`signs/${sign.id}`, sign.topicId, sign.symptom);
    }
    const questionIds = new Set<string>();
    for (const question of content.quickAssessment.questions) {
      if (questionIds.has(question.id)) {
        ctx.addIssue({ code: "custom", message: `duplicate question id ${question.id}` });
      }
      questionIds.add(question.id);
      check(`quickAssessment/${question.id}`, question.topicId, question.symptom);
    }
  });

export type EmergencyContent = z.infer<typeof contentSchema>;
export type QuickQuestion = EmergencyContent["quickAssessment"]["questions"][number];

const contentPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../../content/first-aid.json");

export const emergencyContent: EmergencyContent = contentSchema.parse(JSON.parse(readFileSync(contentPath, "utf8")));
