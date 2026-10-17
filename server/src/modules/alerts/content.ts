import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

import { species } from "../../db/schema.js";
import { findSubstance } from "../knowledge/content.js";

// Seasonal alert cards are vet-maintained content (spec 9), kept in content/seasonal-alerts.json.

export const regions = ["south", "central", "north"] as const;
export type Region = (typeof regions)[number];

const localized = z.object({ fi: z.string(), sv: z.string(), en: z.string() });
const localizedList = z.object({ fi: z.array(z.string()), sv: z.array(z.string()), en: z.array(z.string()) });

const monthDay = z.string().refine((value) => {
  const match = /^(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const [month, day] = [Number(match[1]), Number(match[2])];
  return month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(2024, month, 0)).getUTCDate();
}, "must be MM-DD");

/** A yearly date range. `from` after `to` means it crosses New Year, e.g. 12-01 → 01-06. */
const windowSchema = z.object({ from: monthDay, to: monthDay });

const cardSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  season: z.enum(["winter", "spring", "summer", "autumn", "holiday"]),
  species: z.array(z.enum(species)).min(1),
  windows: z.object({
    south: z.array(windowSchema).min(1),
    central: z.array(windowSchema).min(1),
    north: z.array(windowSchema).min(1),
  }),
  title: localized,
  risk: localized,
  prevention: localizedList,
  watchFor: localizedList,
  ifHappens: localized,
  /** Short text for the push notification */
  pushText: localized,
  ageNotes: z
    .array(
      z.object({
        minAgeMonths: z.number().int().optional(),
        maxAgeMonths: z.number().int().optional(),
        text: localized,
      }),
    )
    .default([]),
  speciesNotes: z.partialRecord(z.enum(species), localized).default({}),
  symptomTags: z.array(z.string()),
  /** Ids in content/knowledge-base.json */
  relatedSubstances: z.array(z.string()),
});

const contentSchema = z
  .object({
    meta: z.object({
      status: z.enum(["sample", "reviewed"]),
      reviewedBy: z.string().nullable(),
      updatedOn: z.iso.date(),
      notice: z.string(),
    }),
    /** Shared vocabulary with the symptom log (spec 1), so log entries can be matched to alerts */
    symptomTags: z.array(z.string()).min(1),
    cards: z.array(cardSchema),
  })
  .superRefine((content, ctx) => {
    const ids = new Set<string>();
    const tags = new Set(content.symptomTags);
    for (const card of content.cards) {
      if (ids.has(card.id)) {
        ctx.addIssue({ code: "custom", message: `duplicate card id ${card.id}` });
      }
      ids.add(card.id);
      for (const tag of card.symptomTags.filter((t) => !tags.has(t))) {
        ctx.addIssue({ code: "custom", message: `${card.id}: unknown symptom tag ${tag}` });
      }
      for (const id of card.relatedSubstances.filter((s) => !findSubstance(s))) {
        ctx.addIssue({ code: "custom", message: `${card.id}: unknown knowledge base substance ${id}` });
      }
    }
  });

export type AlertsContent = z.infer<typeof contentSchema>;
export type AlertCard = AlertsContent["cards"][number];

const contentPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../../content/seasonal-alerts.json");

export const alertsContent: AlertsContent = contentSchema.parse(JSON.parse(readFileSync(contentPath, "utf8")));
