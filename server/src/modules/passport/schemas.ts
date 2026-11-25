import { z } from "zod";

import { passportSections, shareRecipients } from "../../db/schema.js";
import { petSchema } from "../pets/schemas.js";
import { outputSchemas } from "./records.js";

export const shareLanguages = ["fi", "sv", "en"] as const;
export type ShareLanguage = (typeof shareLanguages)[number];

export const sectionParamsSchema = z.object({
  petId: z.string(),
  section: z.enum(passportSections),
});

export const recordParamsSchema = sectionParamsSchema.extend({ recordId: z.string() });

// Validated per kind in the service, because the fields depend on the section in the URL.
export const recordBodySchema = z.record(z.string(), z.unknown());

export const recordSchema = z.union([
  outputSchemas.vaccination,
  outputSchemas.medication,
  outputSchemas.allergy,
  outputSchemas.surgery,
  outputSchemas.visit,
  outputSchemas.lab,
]);

const sectionsSchema = {
  vaccinations: z.array(outputSchemas.vaccination),
  medications: z.array(outputSchemas.medication),
  allergies: z.array(outputSchemas.allergy),
  surgeries: z.array(outputSchemas.surgery),
  visits: z.array(outputSchemas.visit),
  labs: z.array(outputSchemas.lab),
};

/** Who the pet is, for the passport's first card. Diagnoses come from the passport's visits. */
export const passportProfileSchema = z.object({
  microchip: z.string().nullable(),
  markings: z.string().nullable(),
  registration: z.string().nullable(),
  sex: z.enum(["female", "male"]).nullable(),
  neutered: z.boolean().nullable(),
  ownerName: z.string().nullable(),
  conditions: z.array(
    z.object({ id: z.string(), name: z.string(), diagnosedOn: z.string(), resolved: z.boolean() }),
  ),
});

export const passportSchema = z.object({ pet: petSchema, profile: passportProfileSchema, ...sectionsSchema });

/** What a vet or pet care facility sees. No owner details, only the pet and the chosen sections. */
export const sharedPassportSchema = z.object({
  pet: petSchema.pick({ name: true, species: true, breed: true, birthDate: true, weightKg: true }),
  sharedAt: z.number(),
  expiresAt: z.number(),
  vaccinations: sectionsSchema.vaccinations.optional(),
  medications: sectionsSchema.medications.optional(),
  allergies: sectionsSchema.allergies.optional(),
  surgeries: sectionsSchema.surgeries.optional(),
  visits: sectionsSchema.visits.optional(),
  labs: sectionsSchema.labs.optional(),
});

export const createShareSchema = z.object({
  recipientType: z.enum(shareRecipients),
  /** e.g. "Eläinklinikka Turku" */
  recipientName: z.string().trim().max(120).nullish(),
  sections: z.array(z.enum(passportSections)).min(1).default([...passportSections]),
  language: z.enum(shareLanguages).default("fi"),
  /** How long the link works: 1 hour to 30 days, 3 days by default */
  expiresInHours: z.number().int().min(1).max(720).default(72),
});

export const shareSchema = z.object({
  id: z.string(),
  recipientType: z.enum(shareRecipients),
  recipientName: z.string().nullable(),
  sections: z.array(z.enum(passportSections)),
  language: z.string(),
  createdAt: z.number(),
  expiresAt: z.number(),
  revokedAt: z.number().nullable(),
  accessCount: z.number(),
  lastAccessedAt: z.number().nullable(),
  /** False once expired or revoked */
  active: z.boolean(),
});

export const createdShareSchema = shareSchema.extend({
  /** Full link to give the vet, e.g. as a QR code. Only returned once. */
  url: z.string(),
});

export const shareParamsSchema = z.object({ petId: z.string(), shareId: z.string() });

export const sharedTokenParamsSchema = z.object({ token: z.string().min(16).max(64) });
