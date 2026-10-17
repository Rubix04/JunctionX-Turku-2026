import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

// The knowledge base is medical content maintained by vets and poison information experts.
// It lives in content/knowledge-base.json and is validated here at startup.

export const riskLevels = ["harmless", "caution", "dangerous", "emergency"] as const;
export type RiskLevel = (typeof riskLevels)[number];

export const categories = ["foods", "plants", "mushrooms", "household", "medicines", "garden"] as const;
export type Category = (typeof categories)[number];

const localized = z.object({ fi: z.string(), sv: z.string(), en: z.string() });
const localizedList = z.object({ fi: z.array(z.string()), sv: z.array(z.string()), en: z.array(z.string()) });
const riskLevel = z.enum(riskLevels);

const thresholdList = z
  .array(z.object({ mgPerKg: z.number().positive(), level: riskLevel }))
  .min(1)
  .refine((list) => list.every((t, i) => i === 0 || t.mgPerKg > list[i - 1].mgPerKg), "thresholds must rise");

const substanceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  category: z.enum(categories),
  /** The first name in each language is the display name; the rest are search aliases. */
  names: z.object({ fi: z.array(z.string()).min(1), sv: z.array(z.string()).min(1), en: z.array(z.string()).min(1) }),
  /** Missing species means no reliable data: the assessment then falls back to "dangerous". */
  risk: z.object({ dog: riskLevel.optional(), cat: riskLevel.optional(), smallAnimal: riskLevel.optional() }),
  summary: localized,
  symptoms: localizedList,
  onset: localized,
  /** Defaults to the general first aid text */
  firstAid: localized.optional(),
  /** Only where a reliable dose-response is published. Amounts are in the variant's unit. */
  dose: z
    .object({
      compound: z.string(),
      variants: z
        .array(
          z.object({
            id: z.string(),
            unit: z.enum(["g", "piece"]),
            mgPerUnit: z.number().positive(),
            label: localized,
          }),
        )
        .min(1),
      /** Level when the dose is under every threshold */
      belowLowest: riskLevel,
      thresholds: z.object({ dog: thresholdList.optional(), cat: thresholdList.optional() }),
    })
    .optional(),
  sources: z.array(z.string()).min(1),
});

const contentSchema = z
  .object({
    meta: z.object({
      status: z.enum(["sample", "reviewed"]),
      reviewedBy: z.string().nullable(),
      updatedOn: z.iso.date(),
      notice: z.string(),
      sources: z.array(z.string()),
    }),
    categories: z.record(z.enum(categories), localized),
    defaultFirstAid: localized,
    substances: z.array(substanceSchema),
  })
  .refine((content) => new Set(content.substances.map((s) => s.id)).size === content.substances.length, {
    message: "substance ids must be unique",
  });

export type KnowledgeContent = z.infer<typeof contentSchema>;
export type Substance = KnowledgeContent["substances"][number];

const contentPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../../content/knowledge-base.json");

export const knowledgeContent: KnowledgeContent = contentSchema.parse(JSON.parse(readFileSync(contentPath, "utf8")));

export const findSubstance = (id: string, content: KnowledgeContent = knowledgeContent) =>
  content.substances.find((substance) => substance.id === id);
