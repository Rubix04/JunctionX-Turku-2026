import { randomUUID } from "node:crypto";

import { and, asc, desc, eq } from "drizzle-orm";
import type { z } from "zod";

import type { Db } from "../../db/client.js";
import { type DietPlanRow, type DietType, dietPlans, type PetRow, pets, weightEntries } from "../../db/schema.js";
import { notFound } from "../../errors.js";
import { listRecords, todayInFinland } from "../passport/service.js";
import { ageInMonths, calculatePortion, suggestDiets, transitionStatus, weightSummary } from "./calculations.js";
import { dietContent } from "./content.js";
import type { dietPlanInputSchema, languages, weightInputSchema } from "./schemas.js";

type Language = (typeof languages)[number];

export const contentStatus = () => ({ status: dietContent.meta.status, updatedOn: dietContent.meta.updatedOn });

export const dietInfo = (dietType: DietType, lang: Language) => {
  const diet = dietContent.diets[dietType];
  return { dietType, title: diet.title[lang], summary: diet.summary[lang], keyPoints: diet.keyPoints[lang] };
};

// ---- Diet plan ----

export const getPlan = (db: Db, petId: string) => db.select().from(dietPlans).where(eq(dietPlans.petId, petId)).get();

const toPlanDto = (plan: DietPlanRow) => ({
  dietType: plan.dietType,
  source: plan.source,
  foodName: plan.foodName,
  kcalPer100g: plan.kcalPer100g,
  mealsPerDay: plan.mealsPerDay,
  targetWeightKg: plan.targetWeightKg,
  neutered: plan.neutered,
  activityLevel: plan.activityLevel,
  notes: plan.notes,
  updatedAt: plan.updatedAt,
});

/**
 * Saves the pet's diet. When the food itself changes, a gradual switch starts today
 * (spec 3: don't change food abruptly), unless `skipTransition` is set.
 */
export const savePlan = (db: Db, petId: string, input: z.infer<typeof dietPlanInputSchema>, today = todayInFinland()) => {
  const existing = getPlan(db, petId);
  const foodChanged = !!existing && existing.foodName.trim().toLowerCase() !== input.foodName.toLowerCase();

  let transition = {
    previousFoodName: existing?.previousFoodName ?? null,
    transitionStartedOn: existing?.transitionStartedOn ?? null,
  };
  if (input.skipTransition) {
    transition = { previousFoodName: null, transitionStartedOn: null };
  } else if (foodChanged) {
    transition = { previousFoodName: existing.foodName, transitionStartedOn: today };
  }

  const values = {
    dietType: input.dietType,
    source: input.source,
    foodName: input.foodName,
    kcalPer100g: input.kcalPer100g ?? null,
    mealsPerDay: input.mealsPerDay,
    targetWeightKg: input.targetWeightKg ?? null,
    neutered: input.neutered ?? null,
    activityLevel: input.activityLevel,
    notes: input.notes ?? null,
    ...transition,
    updatedAt: Date.now(),
  };
  db.insert(dietPlans)
    .values({ petId, ...values })
    .onConflictDoUpdate({ target: dietPlans.petId, set: values })
    .run();
};

export const deletePlan = (db: Db, petId: string) => {
  if (!getPlan(db, petId)) {
    throw notFound("DIET_NOT_FOUND", "This pet has no diet plan");
  }
  db.delete(dietPlans).where(eq(dietPlans.petId, petId)).run();
};

/** Portion for the pet's current plan and weight, or null if something needed is missing. */
const portionForPet = (pet: PetRow, plan: DietPlanRow | undefined, today: string) => {
  if (!plan || pet.weightKg === null || pet.species === "smallAnimal") {
    return null;
  }
  const losing = plan.dietType === "weightLoss" && plan.targetWeightKg !== null && plan.targetWeightKg < pet.weightKg;
  return calculatePortion({
    species: pet.species,
    weightKg: pet.weightKg,
    ageMonths: ageInMonths(pet.birthDate, today),
    neutered: plan.neutered,
    activityLevel: plan.activityLevel,
    goal: losing ? "lose" : "maintain",
    targetWeightKg: plan.targetWeightKg,
    kcalPer100g: plan.kcalPer100g,
    mealsPerDay: plan.mealsPerDay,
  });
};

export const petDiet = (db: Db, pet: PetRow, lang: Language, today = todayInFinland()) => {
  const plan = getPlan(db, pet.id);
  return {
    content: contentStatus(),
    plan: plan ? toPlanDto(plan) : null,
    diet: plan ? dietInfo(plan.dietType, lang) : null,
    portion: portionForPet(pet, plan, today),
    transition: plan ? transitionStatus(plan, today) : null,
  };
};

export const dietSuggestions = (db: Db, pet: PetRow, lang: Language) => {
  const current = getPlan(db, pet.id)?.dietType;
  return {
    content: contentStatus(),
    suggestions: suggestDiets(listRecords(db, pet.id)).map((suggestion) => ({
      ...dietInfo(suggestion.dietType, lang),
      reason: suggestion.reason,
      current: suggestion.dietType === current,
    })),
  };
};

// ---- Weight ----

const toWeightDto = (entry: typeof weightEntries.$inferSelect) => ({
  id: entry.id,
  weighedOn: entry.weighedOn,
  weightKg: entry.weightKg,
  note: entry.note,
});

/** Keeps the pet's profile weight equal to its most recent weighing. */
const syncPetWeight = (db: Db, petId: string) => {
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

export const listWeights = (db: Db, pet: PetRow, days?: number, today = todayInFinland()) => {
  const all = db
    .select()
    .from(weightEntries)
    .where(eq(weightEntries.petId, pet.id))
    .orderBy(asc(weightEntries.weighedOn))
    .all();
  const from = days ? new Date(Date.parse(`${today}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10) : null;
  const plan = getPlan(db, pet.id);
  return {
    entries: (from ? all.filter((entry) => entry.weighedOn >= from) : all).map(toWeightDto),
    summary: weightSummary(all, {
      losingWeightOnPurpose: plan?.dietType === "weightLoss",
      targetWeightKg: plan?.targetWeightKg ?? null,
    }),
  };
};

export const addWeight = (db: Db, petId: string, input: z.infer<typeof weightInputSchema>, today = todayInFinland()) => {
  const weighedOn = input.weighedOn ?? today;
  const entry = db
    .insert(weightEntries)
    .values({ id: randomUUID(), petId, weighedOn, weightKg: input.weightKg, note: input.note ?? null })
    .onConflictDoUpdate({
      target: [weightEntries.petId, weightEntries.weighedOn],
      set: { weightKg: input.weightKg, note: input.note ?? null },
    })
    .returning()
    .get();
  syncPetWeight(db, petId);
  return toWeightDto(entry);
};

export const deleteWeight = (db: Db, petId: string, entryId: string) => {
  const deleted = db
    .delete(weightEntries)
    .where(and(eq(weightEntries.id, entryId), eq(weightEntries.petId, petId)))
    .returning()
    .get();
  if (!deleted) {
    throw notFound("WEIGHT_NOT_FOUND", "No such weight entry");
  }
  syncPetWeight(db, petId);
};

