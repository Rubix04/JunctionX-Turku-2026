import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

import { dietTypes } from "../../db/schema.js";

// Diet texts and nutrition numbers are medical content: they live in content/diet.json so a
// vet can review and change them without touching code. The file is validated at startup.

const localized = z.object({ fi: z.string(), sv: z.string(), en: z.string() });
const localizedList = z.object({ fi: z.array(z.string()), sv: z.array(z.string()), en: z.array(z.string()) });

const contentSchema = z.object({
  meta: z.object({
    status: z.enum(["sample", "reviewed"]),
    reviewedBy: z.string().nullable(),
    updatedOn: z.iso.date(),
    notice: z.string(),
    sources: z.array(z.string()),
  }),
  portion: z.object({
    /** Food need grows with weight^0.75, used to adjust the package amount to another weight */
    metabolicExponent: z.number().positive(),
    adultAgeMonths: z.object({ dog: z.number().int(), cat: z.number().int(), smallAnimal: z.number().int() }),
    treatsMaxShare: z.number().min(0).max(1),
    /** Weight-loss targets more than this share below the current weight need vet supervision. */
    largeWeightLossShare: z.number().min(0).max(1),
    /** Suggest re-checking the package table when the pet's weight is this far from its row */
    packageWeightFarShare: z.number().min(0).max(1),
    roundGramsTo: z.number().int().positive(),
  }),
  /** Shown once, when the food changes (spec 3: don't change food abruptly) */
  foodChangeTip: localized,
  weight: z.object({
    /** Flag a change this large between two weigh-ins... */
    betweenWeighInsShare: z.number().positive(),
    /** ...or this large within halfYearDays */
    halfYearShare: z.number().positive(),
    halfYearDays: z.number().int().positive(),
    /** Weigh-in reminder interval for pets on a weight-loss plan */
    weightLossWeighInDays: z.number().int().positive(),
  }),
  diets: z.record(
    z.enum(dietTypes),
    z.object({
      title: localized,
      summary: localized,
      keyPoints: localizedList,
      /** Lower-case word stems matched against visit diagnoses (fi, sv, en). */
      diagnosisKeywords: z.array(z.string()),
    }),
  ),
});

export type DietContent = z.infer<typeof contentSchema>;

const contentPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../../content/diet.json");

export const dietContent: DietContent = contentSchema.parse(JSON.parse(readFileSync(contentPath, "utf8")));
