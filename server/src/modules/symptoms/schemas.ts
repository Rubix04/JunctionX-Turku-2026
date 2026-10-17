import { z } from "zod";

import { severityLevels, species } from "../../db/schema.js";

// Response schemas are kept free of transforms for the serializer.

export const languages = ["fi", "sv", "en"] as const;
const lang = z.enum(languages).default("fi");
const answer = z.union([z.literal(0), z.literal(1), z.literal(2)]);
const isoDate = z.iso.date();

export const langQuerySchema = z.object({ lang });
export const speciesLangQuerySchema = z.object({ lang, species: z.enum(species).optional() });

export const logParamsSchema = z.object({ petId: z.string(), date: isoDate });
export const attachmentParamsSchema = logParamsSchema.extend({ attachmentId: z.string() });
export const watchListParamsSchema = z.object({ petId: z.string(), watchListId: z.string() });

export const logsQuerySchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  lang,
});

export const questionsQuerySchema = z.object({ date: isoDate.optional(), lang });

export const trendsQuerySchema = z.object({
  weeks: z.coerce.number().int().min(1).max(52).default(8),
  lang,
});

/** The phone's latitude picks the region for matching seasonal alerts (spec 9). */
export const saveLogQuerySchema = z.object({
  lang,
  lat: z.coerce.number().min(-90).max(90).optional(),
});

const symptomIds = z.array(z.string()).max(30).default([]);

export const logInputSchema = z.object({
  /** Question id → index of the chosen option (0, 1 or 2) */
  answers: z.record(z.string(), answer).default({}),
  /** Ticked from the emergency list */
  emergencySymptoms: symptomIds,
  /** Other symptoms, e.g. coughing */
  symptoms: symptomIds,
  note: z.string().trim().max(1000).nullish(),
});

export const assessInputSchema = logInputSchema.omit({ note: true });

export const outcomeInputSchema = z.object({
  /** The level the vet found to be right */
  level: z.enum(severityLevels),
  /** The passport visit where it was found */
  recordId: z.string().nullish(),
  note: z.string().trim().max(1000).nullish(),
});

const customQuestionInput = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(40)
    .optional(),
  label: z.string().trim().min(1).max(100),
  options: z.tuple([z.string().trim().min(1).max(60), z.string().trim().min(1).max(60), z.string().trim().min(1).max(60)]),
  usualAnswer: answer.optional(),
  yellowIf: z.array(answer).optional(),
  redIf: z.array(answer).optional(),
  emergencyIf: z.array(answer).optional(),
  symptoms: z.partialRecord(z.enum(["0", "1", "2"]), z.array(z.string())).optional(),
});

export const createWatchListSchema = z.object({
  /** A template from GET /symptoms/watch-list-templates... */
  templateId: z.string().optional(),
  /** ...or the condition and questions written from the vet's instructions */
  condition: z.string().trim().min(1).max(120).optional(),
  questions: z.array(customQuestionInput).max(10).optional(),
  startDate: isoDate.optional(),
  /** Either an end date or a number of days; null means no end (long-term condition) */
  endDate: isoDate.nullish(),
  days: z.number().int().min(1).max(365).optional(),
  vetName: z.string().trim().min(1).max(120).optional(),
  /** The passport visit or surgery it belongs to */
  recordId: z.string().optional(),
});

export const updateWatchListSchema = z.object({
  /** True ends the list today */
  end: z.boolean().optional(),
  endDate: isoDate.nullish(),
  vetName: z.string().trim().min(1).max(120).nullish(),
  /** The vet's own limits for this pet; they replace the template's */
  thresholds: z
    .array(
      z.object({
        questionId: z.string(),
        yellowIf: z.array(answer),
        redIf: z.array(answer),
        emergencyIf: z.array(answer).optional(),
      }),
    )
    .optional(),
});

// ---- Responses ----

const contentStatusSchema = z.object({ status: z.enum(["sample", "reviewed"]), updatedOn: z.string() });
const levelSchema = z.enum(severityLevels);
const trafficLight = z.enum(["green", "yellow", "red"]);

export const questionSchema = z.object({
  id: z.string(),
  label: z.string(),
  options: z.array(z.string()),
  usualAnswer: answer,
  yellowIf: z.array(answer),
  redIf: z.array(answer),
  emergencyIf: z.array(answer),
  source: z.enum(["watchList", "general"]),
  watchListId: z.string().nullable(),
});

const emergencyEntrySchema = z.object({
  symptom: z.string(),
  label: z.string(),
  description: z.string(),
  species: z.array(z.enum(species)),
});

const symptomSchema = z.object({ id: z.string(), label: z.string() });

export const emergencyListResponseSchema = z.object({
  content: contentStatusSchema,
  emergencyList: z.array(emergencyEntrySchema),
});

export const templatesResponseSchema = z.object({
  content: contentStatusSchema,
  templates: z.array(
    z.object({
      id: z.string(),
      species: z.array(z.enum(species)),
      condition: z.string(),
      intro: z.string(),
      defaultDays: z.number().nullable(),
      questions: z.array(questionSchema),
    }),
  ),
});

export const watchListSchema = z.object({
  id: z.string(),
  templateId: z.string().nullable(),
  condition: z.string(),
  intro: z.string().nullable(),
  source: z.enum(["guidance", "vet"]),
  vetName: z.string().nullable(),
  recordId: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  totalDays: z.number().nullable(),
  currentDay: z.number().nullable(),
  active: z.boolean(),
  questions: z.array(questionSchema),
});

export const watchListsResponseSchema = z.object({
  active: z.array(watchListSchema),
  past: z.array(watchListSchema),
  /** Templates that fit the passport's diagnoses but are not being watched */
  suggestions: z.array(
    z.object({
      templateId: z.string(),
      condition: z.string(),
      reason: z.object({ recordId: z.string(), kind: z.string(), date: z.string().nullable() }),
    }),
  ),
});

export const questionsResponseSchema = z.object({
  content: contentStatusSchema,
  date: z.string(),
  questions: z.array(questionSchema),
  watchLists: z.array(watchListSchema),
  emergencyList: z.array(emergencyEntrySchema),
  /** For adding other symptoms to the log */
  symptoms: z.array(symptomSchema),
});

export const assessmentSchema = z.object({
  level: levelSchema,
  trafficLight,
  title: z.string(),
  action: z.string(),
  showEmergencyClinics: z.boolean(),
  reasons: z.array(z.object({ code: z.string(), level: levelSchema, text: z.string() })),
  symptoms: z.array(symptomSchema),
  insufficientData: z.boolean(),
  disclaimer: z.string(),
});

export const attachmentSchema = z.object({
  id: z.string(),
  mediaType: z.enum(["image", "video"]),
  contentType: z.string(),
  sizeBytes: z.number(),
  /** Load with the access token, like the pet photo */
  url: z.string(),
  createdAt: z.number(),
});

export const logSchema = z.object({
  id: z.string(),
  date: z.string(),
  answers: z.record(z.string(), answer),
  emergencySymptoms: z.array(z.string()),
  symptoms: z.array(z.string()),
  note: z.string().nullable(),
  assessment: assessmentSchema,
  attachments: z.array(attachmentSchema),
  outcome: z
    .object({
      level: levelSchema,
      recordId: z.string().nullable(),
      note: z.string().nullable(),
      recordedAt: z.number(),
      matched: z.boolean(),
    })
    .nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const savedLogSchema = z.object({
  log: logSchema,
  /** Seasonal alerts whose risks match the logged symptoms (spec 9) */
  seasonalAlerts: z.array(z.object({ id: z.string(), title: z.string(), matchedSymptoms: z.array(z.string()) })),
});

export const logsResponseSchema = z.object({ from: z.string(), to: z.string(), logs: z.array(logSchema) });

export const healthStatusSchema = z.object({
  petId: z.string(),
  level: levelSchema,
  trafficLight,
  title: z.string(),
  action: z.string(),
  showEmergencyClinics: z.boolean(),
  stale: z.boolean(),
  loggedToday: z.boolean(),
  latestLog: logSchema.nullable(),
  watchLists: z.array(watchListSchema),
  disclaimer: z.string(),
});

export const trendsResponseSchema = z.object({
  weeks: z.array(
    z.object({
      weekStart: z.string(),
      weekEnd: z.string(),
      loggedDays: z.number(),
      worstLevel: levelSchema.nullable(),
      levels: z.record(levelSchema, z.number()),
      weightKg: z.number().nullable(),
    }),
  ),
  questions: z.array(
    questionSchema.extend({
      weeks: z.array(
        z.object({ weekStart: z.string(), answers: z.array(z.number()), unusualDays: z.number() }),
      ),
    }),
  ),
});
