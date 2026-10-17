import { z } from "zod";

import { reminderKinds, reminderSources } from "../../db/schema.js";

// Shapes follow the app's types/care.ts. Response schemas are kept free of transforms.

export const languages = ["fi", "sv", "en"] as const;
export const langQuerySchema = z.object({ lang: z.enum(languages).default("fi") });

const isoDate = z.iso.date();
/** Local Finnish time: "2026-10-22T14:30", "2026-10-22T14:30:00", or a date alone (09:00) */
const localDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/, "must be YYYY-MM-DD or YYYY-MM-DDTHH:MM")
  .refine((value) => !Number.isNaN(Date.parse(`${value.length === 10 ? `${value}T09:00` : value}Z`)), "is not a real date");
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "must be HH:MM");
const text = (max: number) => z.string().trim().min(1).max(max);

export const visitParamsSchema = z.object({ petId: z.string(), visitId: z.string() });
export const scheduleParamsSchema = z.object({ petId: z.string(), scheduleId: z.string() });
export const reminderParamsSchema = z.object({ reminderId: z.string() });

// ---- Visits and care plans ----

export const visitSchema = z.object({
  id: z.string(),
  petId: z.string(),
  date: z.string(),
  title: z.string(),
  clinicName: z.string(),
  vetName: z.string().nullable(),
  /** Uploaded notes not yet checked by the clinic */
  draft: z.boolean(),
  carePlanId: z.string().nullable(),
});

export const visitDraftInputSchema = z.object({
  title: text(200),
  clinicName: text(120),
  visitedOn: isoDate.optional(),
  /** The vet's notes, typed or read from the uploaded document */
  notes: z.string().trim().max(5000).nullish(),
});

const followUpSchema = z.object({ title: text(120), dateTime: localDateTime, clinicName: z.string().trim().max(120) });

const productSchema = z.object({
  productId: z.string().max(60).nullable().default(null),
  name: text(120),
  brand: z.string().trim().max(120).default(""),
  prescription: z
    .object({ issuedTo: text(120), pickedUpOn: isoDate.nullable().default(null) })
    .nullable()
    .default(null),
});

export const carePlanInputSchema = z.object({
  diagnosis: text(200),
  vetName: z.string().trim().max(120).nullish(),
  /** Plain-language summary of what was found */
  findings: z.string().trim().max(3000).default(""),
  homeCare: z.array(text(500)).max(20).default([]),
  followUp: followUpSchema.nullish(),
  products: z.array(productSchema).max(20).default([]),
  /** The vet's notes, unchanged */
  originalText: z.string().max(10000).default(""),
  /** Demo mode only: stands in for the clinic checking the plan */
  checkedByClinic: z.boolean().optional(),
});

export const carePlanSchema = z.object({
  id: z.string(),
  petId: z.string(),
  visitId: z.string(),
  visitDate: z.string(),
  diagnosis: z.string(),
  clinicName: z.string(),
  vetName: z.string().nullable(),
  checkedByClinic: z.boolean(),
  findings: z.string(),
  homeCare: z.array(z.string()),
  followUp: z.object({ title: z.string(), dateTime: z.string(), clinicName: z.string() }).nullable(),
  products: z.array(
    z.object({
      productId: z.string().nullable(),
      name: z.string(),
      brand: z.string(),
      prescription: z.object({ issuedTo: z.string(), pickedUpOn: z.string().nullable() }).nullable(),
    }),
  ),
  originalText: z.string(),
  updatedAt: z.number(),
});

// ---- Medication schedules ----

export const scheduleInputSchema = z.object({
  /** Name and dosage default to the passport medication's when medicationRecordId is given */
  name: text(100).optional(),
  /** e.g. "1 tablet · with food" */
  detail: z.string().trim().max(200).optional(),
  startDate: isoDate.optional(),
  /** Null or left out for a long-term medicine (unless the passport medication has an end date) */
  totalDays: z.number().int().min(1).max(365).nullish(),
  /** Dose times, e.g. ["08:00", "20:00"] */
  times: z.array(time).min(1).max(8),
  medicationRecordId: z.string().optional(),
  carePlanId: z.string().optional(),
});

export const scheduleUpdateSchema = z.object({
  /** True stops the medicine today; doses not yet given are removed */
  stop: z.boolean().optional(),
  /** New dose times from now on */
  times: z.array(time).min(1).max(8).optional(),
  detail: z.string().trim().max(200).optional(),
});

export const scheduleSchema = z.object({
  id: z.string(),
  petId: z.string(),
  name: z.string(),
  detail: z.string(),
  times: z.array(z.string()),
  startDate: z.string(),
  totalDays: z.number().nullable(),
  endDate: z.string().nullable(),
  stoppedOn: z.string().nullable(),
  active: z.boolean(),
  dosesTotal: z.number().nullable(),
  dosesGiven: z.number(),
  dosesMissed: z.number(),
  nextDoseAt: z.string().nullable(),
  medicationRecordId: z.string().nullable(),
  carePlanId: z.string().nullable(),
});

// ---- Reminders ----

export const remindersQuerySchema = z.object({
  petId: z.string().optional(),
  /** Default: a week ago, so missed doses still show */
  from: isoDate.optional(),
  /** Default: 30 days ahead */
  to: isoDate.optional(),
  lang: z.enum(languages).default("fi"),
});

export const petRemindersQuerySchema = remindersQuerySchema.omit({ petId: true });

export const reminderInputSchema = z.object({
  petId: z.string(),
  kind: z.enum(reminderKinds),
  title: text(120),
  detail: z.string().trim().max(300).optional(),
  /** Local Finnish time; a date alone means 09:00 */
  dueAt: localDateTime,
});

export const reminderUpdateSchema = z.object({
  /** "Did you already give it?" */
  done: z.boolean().optional(),
  // Only for the owner's own reminders:
  title: text(120).optional(),
  detail: z.string().trim().max(300).optional(),
  dueAt: localDateTime.optional(),
});

export const reminderSchema = z.object({
  id: z.string(),
  petId: z.string(),
  kind: z.enum(reminderKinds),
  title: z.string(),
  detail: z.string(),
  dueAt: z.string(),
  done: z.boolean(),
  doneAt: z.number().nullable(),
  doneBy: z.string().nullable(),
  overdue: z.boolean(),
  source: z.enum(reminderSources),
  editable: z.boolean(),
});
