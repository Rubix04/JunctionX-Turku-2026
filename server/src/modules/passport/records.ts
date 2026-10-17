import { z } from "zod";

import type { HealthRecordKind, PassportSection } from "../../db/schema.js";

// Per-kind fields of a health passport record. Input schemas validate what the client sends;
// output schemas describe what the API returns (kept free of transforms for the serializer).

const isoDate = z.iso.date();
const requiredText = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).nullish();

const notBefore =
  (laterField: string, earlierField: string, message: string) =>
  (value: Record<string, unknown>, ctx: z.RefinementCtx) => {
    const later = value[laterField];
    const earlier = value[earlierField];
    if (typeof later === "string" && typeof earlier === "string" && later < earlier) {
      ctx.addIssue({ code: "custom", path: [laterField], message });
    }
  };

export const allergySeverities = ["mild", "moderate", "severe", "unknown"] as const;

const inputSchemas = {
  vaccination: z
    .object({
      name: requiredText(100),
      givenOn: isoDate,
      validUntil: isoDate.nullish(),
      batchNumber: optionalText(50),
      clinic: optionalText(120),
      notes: optionalText(1000),
    })
    .superRefine(notBefore("validUntil", "givenOn", "validUntil is before givenOn")),
  medication: z
    .object({
      name: requiredText(100),
      dosage: optionalText(200),
      startDate: isoDate,
      endDate: isoDate.nullish(),
      prescribedBy: optionalText(120),
      notes: optionalText(1000),
    })
    .superRefine(notBefore("endDate", "startDate", "endDate is before startDate")),
  allergy: z.object({
    allergen: requiredText(100),
    reaction: optionalText(300),
    severity: z.enum(allergySeverities).default("unknown"),
    notedOn: isoDate.nullish(),
    notes: optionalText(1000),
  }),
  surgery: z.object({
    name: requiredText(120),
    performedOn: isoDate,
    clinic: optionalText(120),
    notes: optionalText(1000),
  }),
  visit: z.object({
    visitedOn: isoDate,
    reason: requiredText(200),
    clinic: optionalText(120),
    diagnosis: optionalText(300),
    notes: optionalText(1000),
  }),
} satisfies Record<HealthRecordKind, z.ZodType>;

const recordMeta = {
  id: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
};

export const vaccinationStatuses = ["valid", "expiringSoon", "expired", "noExpiry"] as const;

export const outputSchemas = {
  vaccination: z.object({
    ...recordMeta,
    name: z.string(),
    givenOn: z.string(),
    validUntil: z.string().nullable(),
    batchNumber: z.string().nullable(),
    clinic: z.string().nullable(),
    notes: z.string().nullable(),
    status: z.enum(vaccinationStatuses),
  }),
  medication: z.object({
    ...recordMeta,
    name: z.string(),
    dosage: z.string().nullable(),
    startDate: z.string(),
    endDate: z.string().nullable(),
    prescribedBy: z.string().nullable(),
    notes: z.string().nullable(),
    /** False once endDate has passed */
    active: z.boolean(),
  }),
  allergy: z.object({
    ...recordMeta,
    allergen: z.string(),
    reaction: z.string().nullable(),
    severity: z.enum(allergySeverities),
    notedOn: z.string().nullable(),
    notes: z.string().nullable(),
  }),
  surgery: z.object({
    ...recordMeta,
    name: z.string(),
    performedOn: z.string(),
    clinic: z.string().nullable(),
    notes: z.string().nullable(),
  }),
  visit: z.object({
    ...recordMeta,
    visitedOn: z.string(),
    reason: z.string(),
    clinic: z.string().nullable(),
    diagnosis: z.string().nullable(),
    notes: z.string().nullable(),
  }),
} satisfies Record<HealthRecordKind, z.ZodType>;

type KindConfig = {
  section: PassportSection;
  input: (typeof inputSchemas)[HealthRecordKind];
  /** The field stored in the `date` column, used for sorting. */
  dateField: string;
};

export const kinds: Record<HealthRecordKind, KindConfig> = {
  vaccination: { section: "vaccinations", input: inputSchemas.vaccination, dateField: "givenOn" },
  medication: { section: "medications", input: inputSchemas.medication, dateField: "startDate" },
  allergy: { section: "allergies", input: inputSchemas.allergy, dateField: "notedOn" },
  surgery: { section: "surgeries", input: inputSchemas.surgery, dateField: "performedOn" },
  visit: { section: "visits", input: inputSchemas.visit, dateField: "visitedOn" },
};

export const kindForSection = Object.fromEntries(
  Object.entries(kinds).map(([kind, config]) => [config.section, kind]),
) as Record<PassportSection, HealthRecordKind>;
