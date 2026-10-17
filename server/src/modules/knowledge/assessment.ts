import type { Species } from "../../db/schema.js";
import { badRequest } from "../../errors.js";
import { type RiskLevel, riskLevels, type Substance } from "./content.js";

export type ExposureAction = "goToEmergencyNow" | "callVetNow" | "monitor" | "noAction";

export type AssessmentNote = "noSpeciesData" | "amountUnknown" | "weightUnknown" | "noDoseData";

const actions: Record<RiskLevel, ExposureAction> = {
  emergency: "goToEmergencyNow",
  dangerous: "callVetNow",
  caution: "monitor",
  harmless: "noAction",
};

export const compareRisk = (a: RiskLevel, b: RiskLevel) => riskLevels.indexOf(a) - riskLevels.indexOf(b);

export type ExposureInput = {
  species: Species;
  weightKg: number | null;
  variantId?: string | null;
  amount?: number | null;
};

/**
 * "My pet ate this" (spec 10). Gives the risk level and what to do next.
 * - With a published dose model, the amount and the pet's weight give a dose in mg/kg.
 * - Without one, or if the amount or weight is unknown, the substance's own level for the
 *   species applies, which is the worst realistic case (precautionary principle, spec 12).
 * - No data for the species at all counts as "dangerous".
 */
export const assessExposure = (substance: Substance, input: ExposureInput) => {
  const notes: AssessmentNote[] = [];
  const speciesRisk = substance.risk[input.species];
  let riskLevel: RiskLevel = speciesRisk ?? "dangerous";
  let basis: "dose" | "substance" | "noSpeciesData" = speciesRisk ? "substance" : "noSpeciesData";
  if (!speciesRisk) {
    notes.push("noSpeciesData");
  }

  const variant = input.variantId ? substance.dose?.variants.find((v) => v.id === input.variantId) : undefined;
  if (input.variantId && !variant) {
    throw badRequest("UNKNOWN_VARIANT", `Unknown variant for ${substance.id}: ${input.variantId}`);
  }

  const thresholds =
    input.species === "smallAnimal" ? undefined : substance.dose?.thresholds[input.species];
  let dose = null;

  if (!thresholds) {
    if (input.amount) {
      notes.push("noDoseData");
    }
  } else if (!input.amount || !variant) {
    notes.push("amountUnknown");
  } else if (!input.weightKg) {
    notes.push("weightUnknown");
  } else {
    const compoundMg = input.amount * variant.mgPerUnit;
    const mgPerKg = compoundMg / input.weightKg;
    const reached = thresholds.filter((threshold) => mgPerKg >= threshold.mgPerKg);
    riskLevel = reached.length ? reached[reached.length - 1].level : (substance.dose?.belowLowest ?? riskLevel);
    basis = "dose";
    dose = {
      compound: substance.dose?.compound ?? "",
      variantId: variant.id,
      amount: input.amount,
      unit: variant.unit,
      compoundMg: Math.round(compoundMg),
      mgPerKg: Math.round(mgPerKg * 10) / 10,
    };
  }

  return {
    substanceId: substance.id,
    species: input.species,
    riskLevel,
    basis,
    dose,
    action: actions[riskLevel],
    /** What the app should open next: section 6 quick assessment, emergency clinic map, call */
    next: {
      quickAssessment: compareRisk(riskLevel, "dangerous") >= 0,
      emergencyClinics: riskLevel === "emergency",
      callVet: compareRisk(riskLevel, "dangerous") >= 0,
    },
    notes,
    /** Inducing vomiting can make things worse; only a vet may advise it (spec 10). */
    doNotInduceVomiting: true as const,
  };
};

export type Assessment = ReturnType<typeof assessExposure>;
