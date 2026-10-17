import type { DietType, HealthRecordRow, Species } from "../../db/schema.js";
import { badRequest } from "../../errors.js";
import { type DietContent, dietContent } from "./content.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const daysBetween = (fromIso: string, toIso: string) =>
  Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY_MS);

export const addDays = (isoDate: string, days: number) =>
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

// ---- Portion from the package's feeding table ----

export type PortionInput = {
  species: Species;
  /** The pet's current weight */
  weightKg: number;
  ageMonths: number | null;
  /** Daily amount the package recommends... */
  packageDailyGrams: number;
  /** ...for a pet of this weight */
  packageForWeightKg: number;
  goal: "maintain" | "lose";
  targetWeightKg: number | null;
  mealsPerDay: number;
  gramsPerScoop: number | null;
};

export type PortionWarning = "growingNoWeightLoss" | "largeWeightLoss" | "checkPackageTable";

/**
 * How much to put in the bowl. Starts from the package's recommended daily amount and adjusts it
 * to the pet's own weight (food need grows with weight^0.75). For weight loss the amount is for
 * the target weight, as vets usually advise. Owners don't need to know calories.
 */
export const calculatePortion = (input: PortionInput, content: DietContent = dietContent) => {
  const { portion } = content;
  const warnings: PortionWarning[] = [];
  const growing = input.ageMonths !== null && input.ageMonths < portion.adultAgeMonths[input.species];

  let feedForWeightKg = input.weightKg;
  if (input.goal === "lose") {
    if (input.targetWeightKg === null || input.targetWeightKg >= input.weightKg) {
      throw badRequest("INVALID_TARGET", "For weight loss, set a target weight below the current weight");
    }
    if (growing) {
      warnings.push("growingNoWeightLoss");
    } else {
      feedForWeightKg = input.targetWeightKg;
      if ((input.weightKg - input.targetWeightKg) / input.weightKg > portion.largeWeightLossShare) {
        warnings.push("largeWeightLoss");
      }
    }
  }

  // Scaling is a good estimate near the package row; far from it, the table itself is better.
  if (Math.abs(feedForWeightKg - input.packageForWeightKg) / input.packageForWeightKg > portion.packageWeightFarShare) {
    warnings.push("checkPackageTable");
  }

  const round = (grams: number) => Math.max(portion.roundGramsTo, Math.round(grams / portion.roundGramsTo) * portion.roundGramsTo);
  const exact =
    input.packageDailyGrams * (feedForWeightKg / input.packageForWeightKg) ** portion.metabolicExponent;
  const gramsPerDay = round(exact);
  const gramsPerMeal = round(exact / input.mealsPerDay);

  return {
    feedForWeightKg,
    gramsPerDay,
    mealsPerDay: input.mealsPerDay,
    gramsPerMeal,
    /** Scoops per meal, to the nearest quarter, if the owner told how much their scoop holds */
    scoopsPerMeal: input.gramsPerScoop ? Math.round((exact / input.mealsPerDay / input.gramsPerScoop) * 4) / 4 : null,
    /** If the pet also gets treats, give this much food instead (treats at most ~10 % of the day) */
    gramsPerDayWithTreats: round(exact * (1 - portion.treatsMaxShare)),
    warnings,
  };
};

export type PortionResult = ReturnType<typeof calculatePortion>;

// ---- Weight trend from occasional weigh-ins ----

type WeightPoint = { weighedOn: string; weightKg: number };

const change = (from: WeightPoint, to: WeightPoint) => {
  const changeKg = to.weightKg - from.weightKg;
  return {
    since: from.weighedOn,
    days: daysBetween(from.weighedOn, to.weighedOn),
    changeKg: Math.round(changeKg * 100) / 100,
    changePercent: Math.round((changeKg / from.weightKg) * 1000) / 10,
  };
};

/**
 * Pets are mostly weighed at the vet, months apart, so the trend compares weigh-ins rather than
 * weeks. `unexpectedChange` flags a large change that isn't part of a weight-loss plan:
 * over 10 % since the previous weigh-in, or over 5 % within about six months.
 * `nextWeighInOn` is set for pets on a weight-loss plan, which should be weighed regularly.
 */
export const weightSummary = (
  entries: WeightPoint[],
  options: { losingWeightOnPurpose: boolean; targetWeightKg: number | null; today: string },
  content: DietContent = dietContent,
) => {
  if (entries.length === 0) {
    return null;
  }
  const { weight } = content;
  const sorted = [...entries].sort((a, b) => a.weighedOn.localeCompare(b.weighedOn));
  const latest = sorted[sorted.length - 1];
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;
  const halfYearStart = addDays(latest.weighedOn, -weight.halfYearDays);
  const halfYearBase = sorted.find((e) => e.weighedOn >= halfYearStart && e.weighedOn < latest.weighedOn) ?? null;
  const yearBase = sorted.find((e) => e.weighedOn >= addDays(latest.weighedOn, -365) && e.weighedOn < latest.weighedOn) ?? null;

  const sincePrevious = previous ? change(previous, latest) : null;
  const sinceHalfYear = halfYearBase ? change(halfYearBase, latest) : null;
  const isPlannedLoss = (c: { changeKg: number } | null) => options.losingWeightOnPurpose && !!c && c.changeKg < 0;
  const large = (c: { changePercent: number } | null, share: number) => !!c && Math.abs(c.changePercent) / 100 >= share;

  const unexpectedChange =
    (large(sincePrevious, weight.betweenWeighInsShare) && !isPlannedLoss(sincePrevious)) ||
    (large(sinceHalfYear, weight.halfYearShare) && !isPlannedLoss(sinceHalfYear));

  const nextWeighInOn = options.losingWeightOnPurpose ? addDays(latest.weighedOn, weight.weightLossWeighInDays) : null;

  return {
    latest,
    targetWeightKg: options.targetWeightKg,
    toTargetKg:
      options.targetWeightKg === null ? null : Math.round((latest.weightKg - options.targetWeightKg) * 100) / 100,
    sincePrevious,
    lastYear: yearBase ? change(yearBase, latest) : null,
    unexpectedChange,
    nextWeighInOn,
    weighInDue: nextWeighInOn !== null && options.today >= nextWeighInOn,
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
