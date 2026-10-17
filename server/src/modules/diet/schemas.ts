import { z } from "zod";

import { activityLevels, dietTypes } from "../../db/schema.js";

export const languages = ["fi", "sv", "en"] as const;
export const languageQuerySchema = z.object({ lang: z.enum(languages).default("fi") });

const contentStatus = z.object({
  /** "sample" until a vet has reviewed content/diet.json; show a notice in the app while so. */
  status: z.enum(["sample", "reviewed"]),
  updatedOn: z.string(),
});

export const dietInfoSchema = z.object({
  dietType: z.enum(dietTypes),
  title: z.string(),
  summary: z.string(),
  keyPoints: z.array(z.string()),
});

export const dietCatalogSchema = z.object({ content: contentStatus, diets: z.array(dietInfoSchema) });

// ---- Portion calculator ----

const portionWarnings = ["neuteredUnknown", "growingNoWeightLoss", "largeWeightLoss", "foodEnergyMissing"] as const;

export const portionResultSchema = z.object({
  species: z.enum(["cat", "dog"]),
  lifeStage: z.enum(["growth", "adult"]),
  factorName: z.string(),
  factor: z.number(),
  basisWeightKg: z.number(),
  restingKcal: z.number(),
  dailyKcal: z.number(),
  treatsMaxKcal: z.number(),
  food: z
    .object({
      kcalPer100g: z.number(),
      mealsPerDay: z.number(),
      gramsPerDay: z.number(),
      gramsPerMeal: z.number(),
    })
    .nullable(),
  warnings: z.array(z.enum(portionWarnings)),
});

const kcal = z.number().positive().max(1000);
const weight = z.number().positive().max(150);

/** Stand-alone calculator, e.g. for trying out a new food before saving it. */
export const portionRequestSchema = z.object({
  species: z.enum(["cat", "dog", "smallAnimal"]),
  weightKg: weight,
  ageMonths: z.number().int().min(0).max(400).nullish(),
  neutered: z.boolean().nullish(),
  activityLevel: z.enum(activityLevels).default("normal"),
  goal: z.enum(["maintain", "lose"]).default("maintain"),
  targetWeightKg: weight.nullish(),
  kcalPer100g: kcal.nullish(),
  mealsPerDay: z.number().int().min(1).max(6).default(2),
});

export const portionResponseSchema = z.object({ content: contentStatus, portion: portionResultSchema });

// ---- Diet plan ----

export const dietPlanInputSchema = z.object({
  dietType: z.enum(dietTypes),
  source: z.enum(["vet", "owner"]).default("owner"),
  foodName: z.string().trim().min(1).max(120),
  kcalPer100g: kcal.nullish(),
  mealsPerDay: z.number().int().min(1).max(6).default(2),
  targetWeightKg: weight.nullish(),
  neutered: z.boolean().nullish(),
  activityLevel: z.enum(activityLevels).default("normal"),
  notes: z.string().trim().max(1000).nullish(),
  /** Switch at once instead of over a week, e.g. when the vet says so. */
  skipTransition: z.boolean().default(false),
});

export const dietPlanSchema = z.object({
  dietType: z.enum(dietTypes),
  source: z.enum(["vet", "owner"]),
  foodName: z.string(),
  kcalPer100g: z.number().nullable(),
  mealsPerDay: z.number(),
  targetWeightKg: z.number().nullable(),
  neutered: z.boolean().nullable(),
  activityLevel: z.enum(activityLevels),
  notes: z.string().nullable(),
  updatedAt: z.number(),
});

export const transitionSchema = z.object({
  previousFoodName: z.string(),
  newFoodName: z.string(),
  startedOn: z.string(),
  endsOn: z.string(),
  day: z.number(),
  totalDays: z.number(),
  newFoodPercent: z.number(),
  oldFoodPercent: z.number(),
  schedule: z.array(z.object({ fromDay: z.number(), toDay: z.number(), newFoodPercent: z.number(), date: z.string() })),
});

export const petDietSchema = z.object({
  content: contentStatus,
  plan: dietPlanSchema.nullable(),
  diet: dietInfoSchema.nullable(),
  /** Null without a plan, a known weight, or for small animals */
  portion: portionResultSchema.nullable(),
  /** Today's old/new food mix while a food change is in progress */
  transition: transitionSchema.nullable(),
});

export const suggestionsSchema = z.object({
  content: contentStatus,
  suggestions: z.array(
    dietInfoSchema.extend({
      reason: z.object({ kind: z.enum(["visit", "allergy"]), date: z.string().nullable(), text: z.string() }),
      /** True if the pet is already on this diet */
      current: z.boolean(),
    }),
  ),
});

// ---- Weight ----

export const weightInputSchema = z.object({
  weightKg: weight,
  /** Defaults to today. A second entry on the same day replaces the first. */
  weighedOn: z.iso.date().optional(),
  note: z.string().trim().max(300).nullish(),
});

export const weightEntrySchema = z.object({
  id: z.string(),
  weighedOn: z.string(),
  weightKg: z.number(),
  note: z.string().nullable(),
});

export const weightQuerySchema = z.object({
  /** Only entries from this many days back, for the chart range */
  days: z.coerce.number().int().min(1).max(3650).optional(),
});

export const weightsResponseSchema = z.object({
  entries: z.array(weightEntrySchema),
  summary: z
    .object({
      latest: z.object({ weighedOn: z.string(), weightKg: z.number() }),
      targetWeightKg: z.number().nullable(),
      toTargetKg: z.number().nullable(),
      recentChange: z
        .object({
          since: z.string(),
          changeKg: z.number(),
          changePercent: z.number(),
          unexpectedChange: z.boolean(),
        })
        .nullable(),
      weekly: z.array(z.object({ weekStart: z.string(), averageKg: z.number() })),
    })
    .nullable(),
});

export const weightParamsSchema = z.object({ petId: z.string(), entryId: z.string() });
