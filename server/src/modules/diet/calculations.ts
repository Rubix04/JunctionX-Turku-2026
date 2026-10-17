import type { ActivityLevel, DietType, HealthRecordRow, Species } from "../../db/schema.js";
import { ApiError, badRequest } from "../../errors.js";
import { type DietContent, dietContent } from "./content.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const daysBetween = (fromIso: string, toIso: string) =>
  Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY_MS);

const addDays = (isoDate: string, days: number) =>
  new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** Whole months between a birth date and today, or null if unknown. */
export const ageInMonths = (birthDate: string | null, today: string) => {
  if (!birthDate) {
    return null;
  }
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return Math.max(0, (ty - by) * 12 + (tm - bm) - (td < bd ? 1 : 0));
};

// ---- Portion calculator ----

export type PortionInput = {
  species: Species;
  weightKg: number;
  ageMonths: number | null;
  /** Null if unknown; then the lower (neutered) factor is used so the pet isn't overfed. */
  neutered: boolean | null;
  activityLevel: ActivityLevel;
  goal: "maintain" | "lose";
  targetWeightKg: number | null;
  kcalPer100g: number | null;
  mealsPerDay: number;
};

export type PortionWarning =
  | "neuteredUnknown"
  | "growingNoWeightLoss"
  | "largeWeightLoss"
  | "foodEnergyMissing";

type FactorName = keyof DietContent["energy"]["factors"]["dog"];

/**
 * Daily energy need and portion size.
 * Resting energy (RER) = 70 × weight^0.75 kcal; daily need = RER × a life-stage factor.
 * For weight loss the RER is calculated from the target weight.
 * All numbers come from content/diet.json and must be reviewed by a vet.
 */
export const calculatePortion = (input: PortionInput, content: DietContent = dietContent) => {
  if (input.species === "smallAnimal") {
    throw new ApiError(422, "UNSUPPORTED_SPECIES", "Portion calculation is available for cats and dogs only");
  }
  const { energy } = content;
  const factors = energy.factors[input.species];
  const warnings: PortionWarning[] = [];

  const growing = input.ageMonths !== null && input.ageMonths < energy.adultAgeMonths[input.species];
  let factorName: FactorName;
  let basisWeightKg = input.weightKg;

  if (growing) {
    factorName = (input.ageMonths as number) < 4 ? "growthUnder4Months" : "growth4MonthsToAdult";
    if (input.goal === "lose") {
      warnings.push("growingNoWeightLoss");
    }
  } else if (input.goal === "lose") {
    if (input.targetWeightKg === null || input.targetWeightKg >= input.weightKg) {
      throw badRequest("INVALID_TARGET", "For weight loss, set a target weight below the current weight");
    }
    factorName = "weightLoss";
    basisWeightKg = input.targetWeightKg;
    if ((input.weightKg - input.targetWeightKg) / input.weightKg > energy.largeWeightLossShare) {
      warnings.push("largeWeightLoss");
    }
  } else if (input.activityLevel === "low") {
    factorName = "lowActivity";
  } else if (input.activityLevel === "high") {
    factorName = "highActivity";
  } else {
    factorName = input.neutered === false ? "intactAdult" : "neuteredAdult";
    if (input.neutered === null) {
      warnings.push("neuteredUnknown");
    }
  }

  const restingKcal = energy.rerFactor * basisWeightKg ** energy.rerExponent;
  const dailyKcal = Math.round(restingKcal * factors[factorName]);

  let food = null;
  if (input.kcalPer100g) {
    const gramsPerDay = Math.round((dailyKcal / input.kcalPer100g) * 100);
    food = {
      kcalPer100g: input.kcalPer100g,
      mealsPerDay: input.mealsPerDay,
      gramsPerDay,
      gramsPerMeal: Math.round(gramsPerDay / input.mealsPerDay),
    };
  } else {
    warnings.push("foodEnergyMissing");
  }

  return {
    species: input.species,
    lifeStage: growing ? ("growth" as const) : ("adult" as const),
    factorName,
    factor: factors[factorName],
    basisWeightKg,
    restingKcal: Math.round(restingKcal),
    dailyKcal,
    /** Treats should stay under this many kcal a day, and come out of the daily amount. */
    treatsMaxKcal: Math.round(dailyKcal * energy.treatsMaxShare),
    food,
    warnings,
  };
};

export type PortionResult = ReturnType<typeof calculatePortion>;

// ---- Gradual food change ----

/**
 * Where the pet is in a food change: how much of the new food to give today.
 * Returns null when there is no change in progress or it has finished.
 */
export const transitionStatus = (
  plan: { foodName: string; previousFoodName: string | null; transitionStartedOn: string | null },
  today: string,
  content: DietContent = dietContent,
) => {
  if (!plan.previousFoodName || !plan.transitionStartedOn) {
    return null;
  }
  const { steps } = content.transition;
  const totalDays = steps[steps.length - 1].toDay;
  const day = Math.max(1, daysBetween(plan.transitionStartedOn, today) + 1);
  if (day > totalDays) {
    return null;
  }
  const step = steps.find((s) => day >= s.fromDay && day <= s.toDay) ?? steps[steps.length - 1];
  return {
    previousFoodName: plan.previousFoodName,
    newFoodName: plan.foodName,
    startedOn: plan.transitionStartedOn,
    endsOn: addDays(plan.transitionStartedOn, totalDays - 1),
    day,
    totalDays,
    newFoodPercent: step.newFoodPercent,
    oldFoodPercent: 100 - step.newFoodPercent,
    schedule: steps.map((s) => ({ ...s, date: addDays(plan.transitionStartedOn as string, s.fromDay - 1) })),
  };
};

// ---- Weight trend ----

type WeightPoint = { weighedOn: string; weightKg: number };

const mondayOf = (isoDate: string) => {
  const weekday = (new Date(`${isoDate}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(isoDate, -weekday);
};

/**
 * Summary for the weight chart: latest weight, change over the last ~30 days and weekly averages.
 * `unexpectedChange` flags a large change that isn't part of a weight-loss plan; the app can
 * suggest keeping an eye on it or contacting a vet.
 */
export const weightSummary = (
  entries: WeightPoint[],
  options: { losingWeightOnPurpose: boolean; targetWeightKg: number | null },
  content: DietContent = dietContent,
) => {
  if (entries.length === 0) {
    return null;
  }
  const sorted = [...entries].sort((a, b) => a.weighedOn.localeCompare(b.weighedOn));
  const latest = sorted[sorted.length - 1];
  const windowStart = addDays(latest.weighedOn, -content.weight.unexpectedChangeDays);
  const baseline = sorted.find((entry) => entry.weighedOn >= windowStart && entry.weighedOn < latest.weighedOn);

  let recentChange = null;
  if (baseline) {
    const changeKg = latest.weightKg - baseline.weightKg;
    const changePercent = (changeKg / baseline.weightKg) * 100;
    const large = Math.abs(changePercent) / 100 >= content.weight.unexpectedChangeShare;
    recentChange = {
      since: baseline.weighedOn,
      changeKg: Math.round(changeKg * 100) / 100,
      changePercent: Math.round(changePercent * 10) / 10,
      unexpectedChange: large && !(options.losingWeightOnPurpose && changeKg < 0),
    };
  }

  const weeks = new Map<string, number[]>();
  for (const entry of sorted) {
    const week = mondayOf(entry.weighedOn);
    weeks.set(week, [...(weeks.get(week) ?? []), entry.weightKg]);
  }

  return {
    latest,
    targetWeightKg: options.targetWeightKg,
    toTargetKg:
      options.targetWeightKg === null ? null : Math.round((latest.weightKg - options.targetWeightKg) * 100) / 100,
    recentChange,
    weekly: [...weeks].map(([weekStart, values]) => ({
      weekStart,
      averageKg: Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100,
    })),
  };
};

// ---- Diet suggestions from the health passport ----

export type DietSuggestion = {
  dietType: DietType;
  reason: { kind: "visit" | "allergy"; date: string | null; text: string };
};

/**
 * Suggests diet types from visit diagnoses and recorded allergies in the passport, by keyword.
 * These are prompts to discuss with the vet, never a diagnosis or a prescription.
 */
export const suggestDiets = (records: HealthRecordRow[], content: DietContent = dietContent): DietSuggestion[] => {
  const suggestions = new Map<DietType, DietSuggestion>();
  const add = (suggestion: DietSuggestion) => {
    const existing = suggestions.get(suggestion.dietType);
    if (!existing || (suggestion.reason.date ?? "") > (existing.reason.date ?? "")) {
      suggestions.set(suggestion.dietType, suggestion);
    }
  };

  for (const record of records) {
    const data = record.data as Record<string, string | null>;
    if (record.kind === "visit") {
      const text = [data.diagnosis, data.reason].filter(Boolean).join(" ").toLowerCase();
      for (const [dietType, diet] of Object.entries(content.diets) as [DietType, DietContent["diets"][DietType]][]) {
        if (diet.diagnosisKeywords.some((keyword) => text.includes(keyword))) {
          add({ dietType, reason: { kind: "visit", date: data.visitedOn, text: data.diagnosis ?? data.reason ?? "" } });
        }
      }
    }
    if (record.kind === "allergy") {
      add({ dietType: "hypoallergenic", reason: { kind: "allergy", date: data.notedOn, text: data.allergen ?? "" } });
    }
  }

  return [...suggestions.values()].sort((a, b) => (b.reason.date ?? "").localeCompare(a.reason.date ?? ""));
};
