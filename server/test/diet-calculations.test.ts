import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { HealthRecordRow } from "../src/db/schema.js";
import {
  ageInMonths,
  calculatePortion,
  type PortionInput,
  suggestDiets,
  transitionStatus,
  weightSummary,
} from "../src/modules/diet/calculations.js";

const adultDog: PortionInput = {
  species: "dog",
  weightKg: 10,
  ageMonths: 48,
  neutered: true,
  activityLevel: "normal",
  goal: "maintain",
  targetWeightKg: null,
  kcalPer100g: 350,
  mealsPerDay: 2,
};

describe("calculatePortion", () => {
  // RER = 70 × 10^0.75 ≈ 393.6 kcal
  it("uses RER × 1.6 for a neutered adult dog", () => {
    const result = calculatePortion(adultDog);
    expect(result).toMatchObject({ restingKcal: 394, factor: 1.6, dailyKcal: 630, treatsMaxKcal: 63, lifeStage: "adult" });
    expect(result.food).toEqual({ kcalPer100g: 350, mealsPerDay: 2, gramsPerDay: 180, gramsPerMeal: 90 });
  });

  it("uses the intact, low and high activity factors", () => {
    expect(calculatePortion({ ...adultDog, neutered: false }).factorName).toBe("intactAdult");
    expect(calculatePortion({ ...adultDog, activityLevel: "low" }).factorName).toBe("lowActivity");
    expect(calculatePortion({ ...adultDog, activityLevel: "high" }).factorName).toBe("highActivity");
  });

  it("assumes neutered when unknown, to avoid overfeeding", () => {
    const result = calculatePortion({ ...adultDog, neutered: null });
    expect(result.factorName).toBe("neuteredAdult");
    expect(result.warnings).toContain("neuteredUnknown");
  });

  // RER(5 kg target) = 70 × 5^0.75 ≈ 234.1 kcal; × 0.8 ≈ 187
  it("calculates weight loss from the target weight", () => {
    const result = calculatePortion({ ...adultDog, species: "cat", weightKg: 6, goal: "lose", targetWeightKg: 5 });
    expect(result).toMatchObject({ factorName: "weightLoss", basisWeightKg: 5, dailyKcal: 187 });
  });

  it("warns about a large weight-loss target and rejects a target that isn't lower", () => {
    const big = calculatePortion({ ...adultDog, weightKg: 40, goal: "lose", targetWeightKg: 28 });
    expect(big.warnings).toContain("largeWeightLoss");
    expect(() => calculatePortion({ ...adultDog, goal: "lose", targetWeightKg: 12 })).toThrow(/target/i);
    expect(() => calculatePortion({ ...adultDog, goal: "lose", targetWeightKg: null })).toThrow(/target/i);
  });

  it("uses growth factors for puppies and kittens and doesn't put them on a diet", () => {
    const puppy = calculatePortion({ ...adultDog, weightKg: 5, ageMonths: 3, goal: "lose", targetWeightKg: 4 });
    expect(puppy).toMatchObject({ lifeStage: "growth", factorName: "growthUnder4Months", dailyKcal: 702 });
    expect(puppy.warnings).toContain("growingNoWeightLoss");
    expect(calculatePortion({ ...adultDog, ageMonths: 8 }).factorName).toBe("growth4MonthsToAdult");
  });

  it("still gives the energy need without the food's kcal", () => {
    const result = calculatePortion({ ...adultDog, kcalPer100g: null });
    expect(result.food).toBeNull();
    expect(result.dailyKcal).toBe(630);
    expect(result.warnings).toContain("foodEnergyMissing");
  });

  it("refuses small animals", () => {
    expect(() => calculatePortion({ ...adultDog, species: "smallAnimal" })).toThrow(/cats and dogs/);
  });
});

describe("ageInMonths", () => {
  it("counts whole months", () => {
    expect(ageInMonths("2026-01-20", "2026-04-19")).toBe(2);
    expect(ageInMonths("2026-01-20", "2026-04-20")).toBe(3);
    expect(ageInMonths(null, "2026-04-20")).toBeNull();
  });
});

describe("transitionStatus", () => {
  const plan = { foodName: "New", previousFoodName: "Old", transitionStartedOn: "2026-10-10" };

  it("mixes in the new food over 7 days", () => {
    expect(transitionStatus(plan, "2026-10-10")).toMatchObject({ day: 1, newFoodPercent: 25, oldFoodPercent: 75 });
    expect(transitionStatus(plan, "2026-10-12")).toMatchObject({ day: 3, newFoodPercent: 50 });
    expect(transitionStatus(plan, "2026-10-16")).toMatchObject({ day: 7, newFoodPercent: 100, endsOn: "2026-10-16" });
    expect(transitionStatus(plan, "2026-10-17")).toBeNull();
  });

  it("is null without a food change", () => {
    expect(transitionStatus({ foodName: "New", previousFoodName: null, transitionStartedOn: null }, "2026-10-10")).toBeNull();
  });
});

describe("weightSummary", () => {
  const entries = [
    { weighedOn: "2026-09-20", weightKg: 10 },
    { weighedOn: "2026-09-22", weightKg: 10.2 },
    { weighedOn: "2026-10-15", weightKg: 9.4 },
  ];

  it("flags a large unplanned change in the last 30 days", () => {
    const summary = weightSummary(entries, { losingWeightOnPurpose: false, targetWeightKg: null });
    expect(summary?.latest).toEqual({ weighedOn: "2026-10-15", weightKg: 9.4 });
    expect(summary?.recentChange).toEqual({ since: "2026-09-20", changeKg: -0.6, changePercent: -6, unexpectedChange: true });
  });

  it("doesn't flag weight loss that is the plan", () => {
    const summary = weightSummary(entries, { losingWeightOnPurpose: true, targetWeightKg: 9 });
    expect(summary?.recentChange?.unexpectedChange).toBe(false);
    expect(summary?.toTargetKg).toBe(0.4);
  });

  it("averages by week starting on Monday", () => {
    const summary = weightSummary(entries, { losingWeightOnPurpose: false, targetWeightKg: null });
    expect(summary?.weekly).toEqual([
      { weekStart: "2026-09-14", averageKg: 10 },
      { weekStart: "2026-09-21", averageKg: 10.2 },
      { weekStart: "2026-10-12", averageKg: 9.4 },
    ]);
  });

  it("is null without entries", () => {
    expect(weightSummary([], { losingWeightOnPurpose: false, targetWeightKg: null })).toBeNull();
  });
});

describe("suggestDiets", () => {
  const record = (kind: HealthRecordRow["kind"], data: Record<string, unknown>): HealthRecordRow => ({
    id: randomUUID(),
    petId: "p",
    kind,
    date: null,
    data,
    createdAt: 0,
    updatedAt: 0,
  });

  it("matches diagnoses in English and Finnish, and allergies", () => {
    const suggestions = suggestDiets([
      record("visit", { visitedOn: "2026-10-15", reason: "Peeing often", diagnosis: "Cystitis" }),
      record("visit", { visitedOn: "2026-06-01", reason: "Vuositarkastus", diagnosis: "Kroonisen munuaistaudin epäily" }),
      record("allergy", { allergen: "Chicken", notedOn: "2025-01-01" }),
      record("visit", { visitedOn: "2026-05-01", reason: "Vaccination", diagnosis: null }),
    ]);
    expect(suggestions.map((s) => s.dietType)).toEqual(["urinary", "kidney", "hypoallergenic"]);
    expect(suggestions[0].reason).toEqual({ kind: "visit", date: "2026-10-15", text: "Cystitis" });
  });
});
