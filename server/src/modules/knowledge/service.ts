import { randomUUID } from "node:crypto";

import { desc, eq } from "drizzle-orm";

import type { Db } from "../../db/client.js";
import { type ExposureRow, exposures, type PetRow, type Species } from "../../db/schema.js";
import { notFound } from "../../errors.js";
import { listRecords, toRecordDto } from "../passport/service.js";
import { assessExposure } from "./assessment.js";
import { categories, findSubstance, knowledgeContent, type Substance } from "./content.js";
import type { languages } from "./schemas.js";
import { searchSubstances } from "./search.js";

type Language = (typeof languages)[number];

export const contentStatus = () => ({
  status: knowledgeContent.meta.status,
  updatedOn: knowledgeContent.meta.updatedOn,
});

const riskBySpecies = (substance: Substance) => ({
  dog: substance.risk.dog ?? ("unknown" as const),
  cat: substance.risk.cat ?? ("unknown" as const),
  smallAnimal: substance.risk.smallAnimal ?? ("unknown" as const),
});

export const getSubstance = (id: string) => {
  const substance = findSubstance(id);
  if (!substance) {
    throw notFound("SUBSTANCE_NOT_FOUND", "No such substance in the knowledge base");
  }
  return substance;
};

export const search = (options: {
  q?: string;
  category?: (typeof categories)[number];
  species?: Species;
  lang: Language;
  limit: number;
}) => {
  const hits = searchSubstances(knowledgeContent, { query: options.q, category: options.category });
  const sorted = options.q
    ? hits
    : hits.sort((a, b) => a.substance.names[options.lang][0].localeCompare(b.substance.names[options.lang][0], options.lang));

  return {
    content: contentStatus(),
    results: sorted.slice(0, options.limit).map(({ substance, matchedName }) => {
      const name = substance.names[options.lang][0];
      const risk = riskBySpecies(substance);
      return {
        id: substance.id,
        name,
        matchedName: options.q && matchedName !== name ? matchedName : null,
        category: substance.category,
        categoryLabel: knowledgeContent.categories[substance.category][options.lang],
        risk,
        ...(options.species && { speciesRisk: risk[options.species] }),
      };
    }),
  };
};

export const listCategories = (lang: Language) => ({
  categories: categories.map((id) => ({
    id,
    label: knowledgeContent.categories[id][lang],
    count: knowledgeContent.substances.filter((substance) => substance.category === id).length,
  })),
});

export const substanceDetail = (id: string, lang: Language) => {
  const substance = getSubstance(id);
  const [name, ...otherNames] = substance.names[lang];
  return {
    content: contentStatus(),
    id: substance.id,
    name,
    otherNames,
    category: substance.category,
    categoryLabel: knowledgeContent.categories[substance.category][lang],
    risk: riskBySpecies(substance),
    summary: substance.summary[lang],
    symptoms: substance.symptoms[lang],
    onset: substance.onset[lang],
    firstAid: (substance.firstAid ?? knowledgeContent.defaultFirstAid)[lang],
    doNotInduceVomiting: true as const,
    doseOptions:
      substance.dose?.variants.map((variant) => ({
        variantId: variant.id,
        label: variant.label[lang],
        unit: variant.unit,
      })) ?? null,
    sources: substance.sources,
  };
};

// ---- Exposures ----

const toExposureDto = (row: ExposureRow, lang: Language) => ({
  id: row.id,
  substanceId: row.substanceId,
  substanceName: findSubstance(row.substanceId)?.names[lang][0] ?? row.substanceId,
  variantId: row.variantId,
  amount: row.amount,
  occurredAt: row.occurredAt,
  riskLevel: row.riskLevel,
  mgPerKg: row.mgPerKg,
  note: row.note,
});

/** Medication and allergies from the passport, for the vet on the phone. */
const vetSummary = (db: Db, pet: PetRow) => {
  const records = listRecords(db, pet.id).map((row) => ({ kind: row.kind, dto: toRecordDto(row) as Record<string, unknown> }));
  return {
    pet: { name: pet.name, species: pet.species, weightKg: pet.weightKg, birthDate: pet.birthDate },
    activeMedications: records
      .filter((record) => record.kind === "medication" && record.dto.active)
      .map(({ dto }) => ({ name: String(dto.name), dosage: (dto.dosage as string | null) ?? null })),
    allergies: records
      .filter((record) => record.kind === "allergy")
      .map(({ dto }) => ({ allergen: String(dto.allergen), severity: String(dto.severity) })),
  };
};

export const recordExposure = (
  db: Db,
  pet: PetRow,
  userId: string,
  input: { substanceId: string; variantId?: string | null; amount?: number | null; occurredAt?: string; note?: string | null },
  lang: Language,
) => {
  const substance = getSubstance(input.substanceId);
  const assessment = assessExposure(substance, {
    species: pet.species,
    weightKg: pet.weightKg,
    variantId: input.variantId,
    amount: input.amount,
  });
  const row = db
    .insert(exposures)
    .values({
      id: randomUUID(),
      petId: pet.id,
      substanceId: substance.id,
      variantId: input.variantId ?? null,
      amount: input.amount ?? null,
      occurredAt: input.occurredAt ? Date.parse(input.occurredAt) : Date.now(),
      riskLevel: assessment.riskLevel,
      mgPerKg: assessment.dose?.mgPerKg ?? null,
      note: input.note ?? null,
      createdByUserId: userId,
    })
    .returning()
    .get();
  return {
    content: contentStatus(),
    exposure: toExposureDto(row, lang),
    assessment,
    vetSummary: vetSummary(db, pet),
  };
};

export const listExposures = (db: Db, petId: string, lang: Language) => ({
  exposures: db
    .select()
    .from(exposures)
    .where(eq(exposures.petId, petId))
    .orderBy(desc(exposures.occurredAt))
    .all()
    .map((row) => toExposureDto(row, lang)),
});
