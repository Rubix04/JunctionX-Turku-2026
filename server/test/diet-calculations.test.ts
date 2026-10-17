import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { HealthRecordRow } from "../src/db/schema.js";
import {
  ageInMonths,
  calculatePortion,
  type PortionInput,
  suggestDiets,
  weightSummary,
} from "../src/modules/diet/calculations.js";

// The package says 200 g a day for a 10 kg dog.
const dog: PortionInput = {
  species: "dog",
  weightKg: 10,
  ageMonths: 48,
  packageDailyGrams: 200,
  packageForWeightKg: 10,
  goal: "maintain",
  targetWeightKg: null,
  mealsPerDay: 2,
  gramsPerScoop: null,
};

describe("calculatePortion", () => {
  it("uses the package amount when the pet weighs what the package row says", () => {
    expect(calculatePortion(dog)).toEqual({
      feedForWeightKg: 10,
      gramsPerDay: 200,
      mealsPerDay: 2,
      gramsPerMeal: 100,
      scoopsPerMeal: null,
      gramsPerDayWithTreats: 180,
      warnings: [],
    });
  });

  // 200 × (12/10)^0.75 ≈ 229 g → 230 g a day, 115 g a meal
  it("adjusts the package amount to the pet's own weight", () => {
    expect(calculatePortion({ ...dog, weightKg: 12 })).toMatchObject({ gramsPerDay: 230, gramsPerMeal: 115, warnings: [] });
  });

  it("feeds for the target weight on a weight-loss plan", () => {
    const result = calculatePortion({ ...dog, weightKg: 12, goal: "lose", targetWeightKg: 10 });
    expect(result).toMatchObject({ feedForWeightKg: 10, gramsPerDay: 200, warnings: [] });
  });

  it("warns about large weight-loss targets and rejects a target that isn't lower", () => {
    const big = calculatePortion({ ...dog, weightKg: 40, packageForWeightKg: 30, goal: "lose", targetWeightKg: 28 });
    expect(big.warnings).toContain("largeWeightLoss");
    expect(() => calculatePortion({ ...dog, goal: "lose", targetWeightKg: 12 })).toThrow(/target/i);
  });

  it("suggests checking the package table when the pet is far from the row used", () => {
    expect(calculatePortion({ ...dog, weightKg: 20 }).warnings).toEqual(["checkPackageTable"]);
  });

  it("shows scoops when the owner told the scoop size", () => {
    expect(calculatePortion({ ...dog, gramsPerScoop: 40 }).scoopsPerMeal).toBe(2.5);
  });

  it("doesn't put growing pets on a diet", () => {
    const puppy = calculatePortion({ ...dog, weightKg: 12, ageMonths: 6, goal: "lose", targetWeightKg: 10 });
    expect(puppy).toMatchObject({ feedForWeightKg: 12, warnings: ["growingNoWeightLoss"] });
  });

  it("works for every species, because it follows the package", () => {
    const rabbit = calculatePortion({ ...dog, species: "smallAnimal", weightKg: 2, packageForWeightKg: 2, packageDailyGrams: 60 });
    expect(rabbit.gramsPerDay).toBe(60);
  });
});

describe("ageInMonths", () => {
  it("counts whole months", () => {
    expect(ageInMonths("2026-01-20", "2026-04-19")).toBe(2);
    expect(ageInMonths("2026-01-20", "2026-04-20")).toBe(3);
    expect(ageInMonths(null, "2026-04-20")).toBeNull();
  });
});

describe("weightSummary", () => {
  const options = { losingWeightOnPurpose: false, targetWeightKg: null, today: "2026-10-17" };

  it("compares weigh-ins months apart and flags a large change", () => {
    const summary = weightSummary(
      [
        { weighedOn: "2025-10-01", weightKg: 10 },
        { weighedOn: "2026-04-01", weightKg: 10.2 },
        { weighedOn: "2026-10-01", weightKg: 11.3 },
      ],
      options,
    );
    expect(summary).toMatchObject({
      latest: { weighedOn: "2026-10-01", weightKg: 11.3 },
      sincePrevious: { since: "2026-04-01", days: 183, changeKg: 1.1, changePercent: 10.8 },
      lastYear: { since: "2025-10-01", changeKg: 1.3, changePercent: 13 },
      unexpectedChange: true,
      nextWeighInOn: null,
      weighInDue: false,
    });
  });

  it("flags a smaller change within about six months", () => {
    const summary = weightSummary(
      [
        { weighedOn: "2026-05-01", weightKg: 10 },
        { weighedOn: "2026-08-01", weightKg: 10.3 },
        { weighedOn: "2026-10-01", weightKg: 10.6 },
      ],
      options,
    );
    expect(summary?.sincePrevious?.changePercent).toBe(2.9);
    expect(summary?.unexpectedChange).toBe(true);
  });

  it("doesn't flag planned weight loss and reminds to weigh in every 6 weeks", () => {
    const summary = weightSummary(
      [
        { weighedOn: "2026-06-01", weightKg: 12 },
        { weighedOn: "2026-08-01", weightKg: 10.6 },
      ],
      { ...options, losingWeightOnPurpose: true, targetWeightKg: 10 },
    );
    expect(summary).toMatchObject({ unexpectedChange: false, toTargetKg: 0.6, nextWeighInOn: "2026-09-12", weighInDue: true });
  });

  it("is quiet with a single weigh-in and null without any", () => {
    expect(weightSummary([{ weighedOn: "2026-10-01", weightKg: 10 }], options)).toMatchObject({
      sincePrevious: null,
      lastYear: null,
      unexpectedChange: false,
    });
    expect(weightSummary([], options)).toBeNull();
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
