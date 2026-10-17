import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, ne } from "drizzle-orm";
import type { z } from "zod";

import type { Db } from "../../db/client.js";
import {
  type DietPlanRow,
  type DietType,
  dietPlans,
  type HealthRecordRow,
  type PetRow,
  pets,
  type WeightEntryRow,
  weightEntries,
} from "../../db/schema.js";
import { badRequest, notFound } from "../../errors.js";
import { listRecords, todayInFinland } from "../passport/service.js";
import { ageInMonths, calculatePortion, suggestDiets, weightSummary } from "./calculations.js";
import { dietContent } from "./content.js";
import type { dietPlanInputSchema, languages, weightInputSchema } from "./schemas.js";

type Language = (typeof languages)[number];

export const contentStatus = () => ({ status: dietContent.meta.status, updatedOn: dietContent.meta.updatedOn });

export const dietInfo = (dietType: DietType, lang: Language) => {
  const diet = dietContent.diets[dietType];
  return { dietType, title: diet.title[lang], summary: diet.summary[lang], keyPoints: diet.keyPoints[lang] };
};

// ---- Weight ----

const listWeightRows = (db: Db, petId: string) =>
  db.select().from(weightEntries).where(eq(weightEntries.petId, petId)).orderBy(asc(weightEntries.weighedOn)).all();

const toWeightDto = (entry: WeightEntryRow) => ({
  id: entry.id,
  weighedOn: entry.weighedOn,
  weightKg: entry.weightKg,
  source: entry.source,
  note: entry.note,
});

/** Keeps the pet's profile weight equal to its most recent weigh-in. */
export const syncPetWeight = (db: Db, petId: string) => {
  const latest = db
    .select()
    .from(weightEntries)
    .where(eq(weightEntries.petId, petId))
    .orderBy(desc(weightEntries.weighedOn))
    .get();
  if (latest) {
    db.update(pets).set({ weightKg: latest.weightKg }).where(eq(pets.id, petId)).run();
  }
};

/**
 * Copies the weight from a passport visit to the weight history (most weigh-ins happen at the
 * vet). Call after a visit is created or changed. A visit replaces an owner entry on the same day.
 */
export const syncVisitWeight = (db: Db, record: HealthRecordRow) => {
  if (record.kind !== "visit") {
    return;
  }
  const data = record.data as { visitedOn: string; weightKg?: number | null };
  db.delete(weightEntries)
    .where(and(eq(weightEntries.visitRecordId, record.id), ne(weightEntries.weighedOn, data.visitedOn)))
    .run();
  if (typeof data.weightKg === "number") {
    const values = { weightKg: data.weightKg, source: "vet" as const, visitRecordId: record.id, note: null };
    db.insert(weightEntries)
      .values({ id: randomUUID(), petId: record.petId, weighedOn: data.visitedOn, ...values })
      .onConflictDoUpdate({ target: [weightEntries.petId, weightEntries.weighedOn], set: values })
      .run();
  } else {
    db.delete(weightEntries).where(eq(weightEntries.visitRecordId, record.id)).run();
  }
  syncPetWeight(db, record.petId);
};

export const listWeights = (db: Db, pet: PetRow, today = todayInFinland()) => {
  const rows = listWeightRows(db, pet.id);
  const plan = getPlan(db, pet.id);
  return {
    entries: rows.map(toWeightDto),
    summary: weightSummary(rows, {
      losingWeightOnPurpose: plan?.goal === "lose",
      targetWeightKg: plan?.targetWeightKg ?? null,
      today,
    }),
  };
};

export const addWeight = (db: Db, petId: string, input: z.infer<typeof weightInputSchema>, today = todayInFinland()) => {
  const values = { weightKg: input.weightKg, source: "owner" as const, visitRecordId: null, note: input.note ?? null };
  const entry = db
    .insert(weightEntries)
    .values({ id: randomUUID(), petId, weighedOn: input.weighedOn ?? today, ...values })
    .onConflictDoUpdate({ target: [weightEntries.petId, weightEntries.weighedOn], set: values })
    .returning()
    .get();
  syncPetWeight(db, petId);
  return toWeightDto(entry);
};

export const deleteWeight = (db: Db, petId: string, entryId: string) => {
  const entry = db
    .select()
    .from(weightEntries)
    .where(and(eq(weightEntries.id, entryId), eq(weightEntries.petId, petId)))
    .get();
  if (!entry) {
    throw notFound("WEIGHT_NOT_FOUND", "No such weight entry");
  }
  if (entry.visitRecordId) {
    throw badRequest("WEIGHT_FROM_VISIT", "This weight comes from a vet visit; change it in the passport");
  }
  db.delete(weightEntries).where(eq(weightEntries.id, entryId)).run();
  syncPetWeight(db, petId);
};

// ---- Diet plan ----

export const getPlan = (db: Db, petId: string) => db.select().from(dietPlans).where(eq(dietPlans.petId, petId)).get();

const toPlanDto = (plan: DietPlanRow) => ({
  dietType: plan.dietType,
  source: plan.source,
  foodName: plan.foodName,
  packageDailyGrams: plan.packageDailyGrams,
  packageForWeightKg: plan.packageForWeightKg,
  mealsPerDay: plan.mealsPerDay,
  goal: plan.goal,
  targetWeightKg: plan.targetWeightKg,
  gramsPerScoop: plan.gramsPerScoop,
  notes: plan.notes,
  updatedAt: plan.updatedAt,
});

/** Saves the pet's diet. Returns whether the food changed, so the app can show the tip once. */
export const savePlan = (db: Db, pet: PetRow, input: z.infer<typeof dietPlanInputSchema>) => {
  const existing = getPlan(db, pet.id);
  const packageForWeightKg = input.packageDailyGrams ? (input.packageForWeightKg ?? pet.weightKg) : null;
  if (input.packageDailyGrams && !packageForWeightKg) {
    throw badRequest("PACKAGE_WEIGHT_REQUIRED", "Tell which pet weight the package amount is for");
  }

  const values = {
    dietType: input.dietType,
    source: input.source,
    foodName: input.foodName,
    packageDailyGrams: input.packageDailyGrams ?? null,
    packageForWeightKg,
    mealsPerDay: input.mealsPerDay,
    goal: input.goal,
    targetWeightKg: input.targetWeightKg ?? null,
    gramsPerScoop: input.gramsPerScoop ?? null,
    notes: input.notes ?? null,
    updatedAt: Date.now(),
  };
  db.insert(dietPlans)
    .values({ petId: pet.id, ...values })
    .onConflictDoUpdate({ target: dietPlans.petId, set: values })
    .run();

  return { foodChanged: !!existing && existing.foodName.trim().toLowerCase() !== input.foodName.toLowerCase() };
};

export const deletePlan = (db: Db, petId: string) => {
  if (!getPlan(db, petId)) {
    throw notFound("DIET_NOT_FOUND", "This pet has no diet plan");
  }
  db.delete(dietPlans).where(eq(dietPlans.petId, petId)).run();
};

const portionForPet = (pet: PetRow, plan: DietPlanRow | undefined, today: string) => {
  if (!plan) {
    return { portion: null, portionMissing: "noPlan" as const };
  }
  if (!plan.packageDailyGrams || !plan.packageForWeightKg) {
    return { portion: null, portionMissing: "packageAmountMissing" as const };
  }
  if (pet.weightKg === null) {
    return { portion: null, portionMissing: "weightMissing" as const };
  }
  // A plan saved for weight loss can outlive the excess weight; then feed for the current weight.
  const losing = plan.goal === "lose" && plan.targetWeightKg !== null && plan.targetWeightKg < pet.weightKg;
  const portion = calculatePortion({
    species: pet.species,
    weightKg: pet.weightKg,
    ageMonths: ageInMonths(pet.birthDate, today),
    packageDailyGrams: plan.packageDailyGrams,
    packageForWeightKg: plan.packageForWeightKg,
    goal: losing ? "lose" : "maintain",
    targetWeightKg: plan.targetWeightKg,
    mealsPerDay: plan.mealsPerDay,
    gramsPerScoop: plan.gramsPerScoop,
  });
  return { portion, portionMissing: null };
};

export const petDiet = (db: Db, pet: PetRow, lang: Language, today = todayInFinland()) => {
  const plan = getPlan(db, pet.id);
  const weights = listWeightRows(db, pet.id);
  const latest = weights[weights.length - 1];
  const summary = weightSummary(weights, {
    losingWeightOnPurpose: plan?.goal === "lose",
    targetWeightKg: plan?.targetWeightKg ?? null,
    today,
  });

  return {
    content: contentStatus(),
    suggestions: suggestDiets(listRecords(db, pet.id)).map((suggestion) => ({
      ...dietInfo(suggestion.dietType, lang),
      reason: suggestion.reason,
      current: suggestion.dietType === plan?.dietType,
    })),
    plan: plan ? toPlanDto(plan) : null,
    diet: plan ? dietInfo(plan.dietType, lang) : null,
    ...portionForPet(pet, plan, today),
    weighIn: {
      latest: latest ? { weighedOn: latest.weighedOn, weightKg: latest.weightKg, source: latest.source } : null,
      nextWeighInOn: summary?.nextWeighInOn ?? null,
      weighInDue: summary?.weighInDue ?? false,
    },
  };
};

export const foodChangeTip = (lang: Language) => dietContent.foodChangeTip[lang];
