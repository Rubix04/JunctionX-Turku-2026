import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

import { species } from "../../db/schema.js";

// The contracted clinics come from the insurance company's registry (spec 7). Until it is
// connected, content/clinics.json stands in for it. Validated at startup.

const localized = z.object({ fi: z.string(), sv: z.string(), en: z.string() });
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/, "must be HH:MM");
const dayHours = z
  .object({ open: time, close: time })
  .refine((h) => h.open < h.close, "open must be before close")
  .nullable();

const registrySchema = z
  .object({
    meta: z.object({
      status: z.enum(["sample", "registry"]),
      source: z.string(),
      updatedOn: z.iso.date(),
      notice: z.string(),
    }),
    /** Used when the phone doesn't share its location */
    defaultLocation: z.object({ latitude: z.number(), longitude: z.number(), name: z.string() }),
    expertise: z.record(z.string(), localized),
    clinics: z.array(
      z.object({
        id: z.string().min(1),
        name: z.string(),
        address: z.string(),
        phone: z.string(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        contracted: z.boolean(),
        /** Settles the insurance claim directly with the insurer */
        directPayment: z.boolean(),
        emergency24h: z.boolean(),
        species: z.array(z.enum(species)).min(1),
        expertise: z.array(z.string()),
        /** Monday first. Null when closed that day. */
        hours: z.array(dayHours).length(7),
        bookingUrl: z.url().nullable(),
      }),
    ),
  })
  .superRefine((registry, ctx) => {
    const ids = new Set<string>();
    for (const clinic of registry.clinics) {
      if (ids.has(clinic.id)) {
        ctx.addIssue({ code: "custom", message: `duplicate clinic id ${clinic.id}` });
      }
      ids.add(clinic.id);
      for (const id of clinic.expertise.filter((e) => !(e in registry.expertise))) {
        ctx.addIssue({ code: "custom", message: `${clinic.id}: unknown expertise ${id}` });
      }
    }
  });

export type ClinicRegistry = z.infer<typeof registrySchema>;
export type RegistryClinic = ClinicRegistry["clinics"][number];
export type DayHours = RegistryClinic["hours"][number];

const registryPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../../content/clinics.json");

export const clinicRegistry: ClinicRegistry = registrySchema.parse(JSON.parse(readFileSync(registryPath, "utf8")));
