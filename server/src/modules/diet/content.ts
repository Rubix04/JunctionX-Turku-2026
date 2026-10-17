import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

import { dietTypes } from "../../db/schema.js";

// Diet texts and nutrition numbers are medical content: they live in content/diet.json so a
// vet can review and change them without touching code. The file is validated at startup.

const localized = z.object({ fi: z.string(), sv: z.string(), en: z.string() });
const localizedList = z.object({ fi: z.array(z.string()), sv: z.array(z.string()), en: z.array(z.string()) });

const factorsSchema = z.object({
  growthUnder4Months: z.number().positive(),
  growth4MonthsToAdult: z.number().positive(),
  intactAdult: z.number().positive(),
  neuteredAdult: z.number().positive(),
  lowActivity: z.number().positive(),
  highActivity: z.number().positive(),
  weightLoss: z.number().positive(),
});

const contentSchema = z.object({
  meta: z.object({
    status: z.enum(["sample", "reviewed"]),
    reviewedBy: z.string().nullable(),
    updatedOn: z.iso.date(),
    notice: z.string(),
    sources: z.array(z.string()),
  }),
  energy: z.object({
    rerFactor: z.number().positive(),
    rerExponent: z.number().positive(),
    adultAgeMonths: z.object({ dog: z.number().int(), cat: z.number().int() }),
    factors: z.object({ dog: factorsSchema, cat: factorsSchema }),
    treatsMaxShare: z.number().min(0).max(1),
    /** Weight-loss targets more than this share below the current weight need vet supervision. */
    largeWeightLossShare: z.number().min(0).max(1),
  }),
  transition: z.object({
    steps: z
      .array(z.object({ fromDay: z.number().int(), toDay: z.number().int(), newFoodPercent: z.number().min(0).max(100) }))
      .min(1),
  }),
  weight: z.object({
    unexpectedChangeShare: z.number().positive(),
    unexpectedChangeDays: z.number().int().positive(),
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
