import { z } from "zod";

import { species } from "../../db/schema.js";
import { categories, riskLevels } from "./content.js";

export const languages = ["fi", "sv", "en"] as const;

const risk = z.enum(riskLevels);
const riskOrUnknown = z.enum([...riskLevels, "unknown"]);

const contentStatus = z.object({
  /** "sample" until vets have reviewed content/knowledge-base.json; show a notice while so. */
  status: z.enum(["sample", "reviewed"]),
  updatedOn: z.string(),
});

export const searchQuerySchema = z.object({
  q: z.string().max(100).optional(),
  category: z.enum(categories).optional(),
  /** Adds `speciesRisk` for this species to each result */
  species: z.enum(species).optional(),
  lang: z.enum(languages).default("fi"),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const langQuerySchema = z.object({ lang: z.enum(languages).default("fi") });

const riskBySpecies = z.object({ dog: riskOrUnknown, cat: riskOrUnknown, smallAnimal: riskOrUnknown });

export const searchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** The name that matched, when it isn't the display name (e.g. "Burana" for Ibuprofen) */
  matchedName: z.string().nullable(),
  category: z.enum(categories),
  categoryLabel: z.string(),
  risk: riskBySpecies,
  speciesRisk: riskOrUnknown.optional(),
});

export const searchResponseSchema = z.object({ content: contentStatus, results: z.array(searchResultSchema) });

export const categoriesResponseSchema = z.object({
  categories: z.array(z.object({ id: z.enum(categories), label: z.string(), count: z.number() })),
});

export const substanceParamsSchema = z.object({ substanceId: z.string() });

export const substanceDetailSchema = z.object({
  content: contentStatus,
  id: z.string(),
  name: z.string(),
  otherNames: z.array(z.string()),
  category: z.enum(categories),
  categoryLabel: z.string(),
  risk: riskBySpecies,
  summary: z.string(),
  symptoms: z.array(z.string()),
  onset: z.string(),
  firstAid: z.string(),
  doNotInduceVomiting: z.literal(true),
  /** Amount options for "My pet ate this"; null when no reliable dose data exists */
  doseOptions: z.array(z.object({ variantId: z.string(), label: z.string(), unit: z.enum(["g", "piece"]) })).nullable(),
  sources: z.array(z.string()),
});

// ---- "My pet ate this" ----

const amountFields = {
  variantId: z.string().max(40).nullish(),
  /** In the variant's unit: grams or pieces */
  amount: z.number().positive().max(100_000).nullish(),
};

/** Public, no sign-in: emergency use (spec 6). */
export const assessRequestSchema = z.object({
  substanceId: z.string(),
  species: z.enum(species),
  weightKg: z.number().positive().max(150).nullish(),
  ...amountFields,
});

export const assessmentSchema = z.object({
  substanceId: z.string(),
  species: z.enum(species),
  riskLevel: risk,
  basis: z.enum(["dose", "substance", "noSpeciesData"]),
  dose: z
    .object({
      compound: z.string(),
      variantId: z.string(),
      amount: z.number(),
      unit: z.enum(["g", "piece"]),
      compoundMg: z.number(),
      mgPerKg: z.number(),
    })
    .nullable(),
  action: z.enum(["goToEmergencyNow", "callVetNow", "monitor", "noAction"]),
  next: z.object({ quickAssessment: z.boolean(), emergencyClinics: z.boolean(), callVet: z.boolean() }),
  notes: z.array(z.enum(["noSpeciesData", "amountUnknown", "weightUnknown", "noDoseData"])),
  doNotInduceVomiting: z.literal(true),
});

export const assessResponseSchema = z.object({ content: contentStatus, assessment: assessmentSchema });

export const exposureInputSchema = z.object({
  substanceId: z.string(),
  ...amountFields,
  /** When it happened; defaults to now */
  occurredAt: z.iso.datetime({ offset: true }).optional(),
  note: z.string().trim().max(500).nullish(),
});

export const exposureSchema = z.object({
  id: z.string(),
  substanceId: z.string(),
  substanceName: z.string(),
  variantId: z.string().nullable(),
  amount: z.number().nullable(),
  occurredAt: z.number(),
  riskLevel: risk,
  mgPerKg: z.number().nullable(),
  note: z.string().nullable(),
});

/** Short facts to show or read to the vet on the phone (spec 6). */
export const vetSummarySchema = z.object({
  pet: z.object({
    name: z.string(),
    species: z.enum(species),
    weightKg: z.number().nullable(),
    birthDate: z.string().nullable(),
  }),
  activeMedications: z.array(z.object({ name: z.string(), dosage: z.string().nullable() })),
  allergies: z.array(z.object({ allergen: z.string(), severity: z.string() })),
});

export const exposureResponseSchema = z.object({
  content: contentStatus,
  exposure: exposureSchema,
  assessment: assessmentSchema,
  vetSummary: vetSummarySchema,
});

export const exposuresListSchema = z.object({ exposures: z.array(exposureSchema) });
