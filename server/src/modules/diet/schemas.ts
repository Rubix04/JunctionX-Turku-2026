import { z } from "zod";

import { dietTypes, species } from "../../db/schema.js";

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

const grams = z.number().positive().max(5000);
const weight = z.number().positive().max(150);
const meals = z.number().int().min(1).max(6);

// ---- Portion ----

export const portionResultSchema = z.object({
  /** The weight the amount is calculated for: the target weight on a weight-loss plan */
  feedForWeightKg: z.number(),
  gramsPerDay: z.number(),
  mealsPerDay: z.number(),
  gramsPerMeal: z.number(),
  scoopsPerMeal: z.number().nullable(),
  gramsPerDayWithTreats: z.number(),
  warnings: z.array(z.enum(["growingNoWeightLoss", "largeWeightLoss", "checkPackageTable"])),
});

/** Stand-alone calculator, e.g. for trying out a new food before saving it. */
export const portionRequestSchema = z
  .object({
    species: z.enum(species),
    weightKg: weight,
    ageMonths: z.number().int().min(0).max(400).nullish(),
    /** The daily amount printed in the package's feeding table... */
    packageDailyGrams: grams,
    /** ...and the pet weight that row is for. Defaults to weightKg. */
    packageForWeightKg: weight.nullish(),
    goal: z.enum(["maintain", "lose"]).default("maintain"),
    targetWeightKg: weight.nullish(),
    mealsPerDay: meals.default(2),
    gramsPerScoop: z.number().positive().max(500).nullish(),
  });

export const portionResponseSchema = z.object({ content: contentStatus, portion: portionResultSchema });

// ---- Diet plan ----

export const dietPlanInputSchema = z
  .object({
    dietType: z.enum(dietTypes),
    source: z.enum(["vet", "owner"]).default("owner"),
    foodName: z.string().trim().min(1).max(120),
    /** From the package's feeding table: the daily amount... */
    packageDailyGrams: grams.nullish(),
    /** ...for a pet of this weight. Defaults to the pet's current weight. */
    packageForWeightKg: weight.nullish(),
    mealsPerDay: meals.default(2),
    goal: z.enum(["maintain", "lose"]).default("maintain"),
    targetWeightKg: weight.nullish(),
    /** Optional: how many grams the owner's scoop or decilitre measure holds */
    gramsPerScoop: z.number().positive().max(500).nullish(),
    notes: z.string().trim().max(1000).nullish(),
  })
  .refine((plan) => plan.goal !== "lose" || plan.targetWeightKg, {
    path: ["targetWeightKg"],
    message: "Set a target weight for weight loss",
  });

export const dietPlanSchema = z.object({
  dietType: z.enum(dietTypes),
  source: z.enum(["vet", "owner"]),
  foodName: z.string(),
  packageDailyGrams: z.number().nullable(),
  packageForWeightKg: z.number().nullable(),
  mealsPerDay: z.number(),
  goal: z.enum(["maintain", "lose"]),
  targetWeightKg: z.number().nullable(),
  gramsPerScoop: z.number().nullable(),
  notes: z.string().nullable(),
  updatedAt: z.number(),
});

export const suggestionSchema = dietInfoSchema.extend({
  reason: z.object({ kind: z.enum(["visit", "allergy"]), date: z.string().nullable(), text: z.string() }),
  /** True if the pet is already on this diet */
  current: z.boolean(),
});

const weightPointSchema = z.object({ weighedOn: z.string(), weightKg: z.number(), source: z.enum(["vet", "owner"]) });

export const petDietSchema = z.object({
  content: contentStatus,
  /** Diets to discuss with the vet, from the passport's diagnoses and allergies */
  suggestions: z.array(suggestionSchema),
  plan: dietPlanSchema.nullable(),
  diet: dietInfoSchema.nullable(),
  portion: portionResultSchema.nullable(),
  /** Why `portion` is null */
  portionMissing: z.enum(["noPlan", "packageAmountMissing", "weightMissing"]).nullable(),
  weighIn: z.object({
    latest: weightPointSchema.nullable(),
    /** Only on a weight-loss plan */
    nextWeighInOn: z.string().nullable(),
    weighInDue: z.boolean(),
  }),
});

export const savedDietSchema = petDietSchema.extend({
  /** Set once, in the response that changed the food: how to switch foods gradually */
  foodChangeTip: z.string().nullable(),
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
  /** "vet" when it came from a passport visit */
  source: z.enum(["vet", "owner"]),
  note: z.string().nullable(),
});

const changeSchema = z.object({
  since: z.string(),
  days: z.number(),
  changeKg: z.number(),
  changePercent: z.number(),
});

export const weightsResponseSchema = z.object({
  entries: z.array(weightEntrySchema),
  summary: z
    .object({
      latest: z.object({ weighedOn: z.string(), weightKg: z.number() }),
      targetWeightKg: z.number().nullable(),
      toTargetKg: z.number().nullable(),
      sincePrevious: changeSchema.nullable(),
      lastYear: changeSchema.nullable(),
      unexpectedChange: z.boolean(),
      nextWeighInOn: z.string().nullable(),
      weighInDue: z.boolean(),
    })
    .nullable(),
});

export const weightParamsSchema = z.object({ petId: z.string(), entryId: z.string() });
