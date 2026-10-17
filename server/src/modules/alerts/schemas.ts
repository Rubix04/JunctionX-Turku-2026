import { z } from "zod";

import { species } from "../../db/schema.js";
import { regions } from "./content.js";

export const languages = ["fi", "sv", "en"] as const;
const lang = z.enum(languages).default("fi");

/** Where and when. The phone's location picks the region; `date` is for previews and demos. */
const whereAndWhen = {
  lat: z.coerce.number().min(-90).max(90).optional(),
  region: z.enum(regions).optional(),
  date: z.iso.date().optional(),
  lang,
};

export const currentQuerySchema = z.object({
  ...whereAndWhen,
  species: z.enum(species).optional(),
  ageMonths: z.coerce.number().int().min(0).max(400).optional(),
});

export const petAlertsQuerySchema = z.object(whereAndWhen);

export const cardsQuerySchema = z.object({
  ...whereAndWhen,
  species: z.enum(species).optional(),
});

export const cardParamsSchema = z.object({ cardId: z.string() });
export const langQuerySchema = z.object({ lang });

export const matchRequestSchema = z.object({
  symptomTags: z.array(z.string()).min(1).max(30),
  species: z.enum(species).optional(),
  ageMonths: z.number().int().min(0).max(400).optional(),
  lat: z.number().min(-90).max(90).optional(),
  region: z.enum(regions).optional(),
  date: z.iso.date().optional(),
  lang,
});

const contentStatus = z.object({ status: z.enum(["sample", "reviewed"]), updatedOn: z.string() });

export const cardSchema = z.object({
  id: z.string(),
  season: z.enum(["winter", "spring", "summer", "autumn", "holiday"]),
  species: z.array(z.enum(species)),
  title: z.string(),
  /** What the risk is */
  risk: z.string(),
  /** How to prevent it */
  prevention: z.array(z.string()),
  /** What to watch for */
  watchFor: z.array(z.string()),
  /** What to do if something happens */
  ifHappens: z.string(),
  /** Extra notes for this pet's species or age */
  notes: z.array(z.string()),
  symptomTags: z.array(z.string()),
  /** Knowledge base entries to link to */
  relatedSubstances: z.array(z.object({ id: z.string(), name: z.string() })),
  /** Last day of the current season, or null if not active now */
  activeUntil: z.string().nullable(),
});

export const cardsResponseSchema = z.object({
  content: contentStatus,
  region: z.enum(regions),
  date: z.string(),
  cards: z.array(cardSchema),
});

export const cardDetailSchema = z.object({ content: contentStatus, card: cardSchema });

export const matchResponseSchema = z.object({
  content: contentStatus,
  matches: z.array(z.object({ card: cardSchema, matchedTags: z.array(z.string()) })),
});

export const symptomTagsSchema = z.object({ symptomTags: z.array(z.string()) });

// ---- Push notifications ----

export const deviceInputSchema = z.object({
  expoPushToken: z.string().regex(/^Expo(nent)?PushToken\[[^\]]+\]$/, "must be an Expo push token"),
  platform: z.enum(["ios", "android"]),
  language: z.enum(languages),
  latitude: z.number().min(-90).max(90).nullish(),
  longitude: z.number().min(-180).max(180).nullish(),
  seasonalAlerts: z.boolean().default(true),
  /** Medication, follow-up visit and vaccination reminders (spec 2) */
  reminders: z.boolean().default(true),
});

export const deviceSchema = z.object({
  platform: z.enum(["ios", "android"]),
  language: z.enum(languages),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  region: z.enum(regions),
  seasonalAlerts: z.boolean(),
  reminders: z.boolean(),
  updatedAt: z.number(),
});
