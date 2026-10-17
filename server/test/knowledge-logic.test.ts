import { describe, expect, it } from "vitest";

import { assessExposure } from "../src/modules/knowledge/assessment.js";
import { findSubstance, knowledgeContent, type Substance } from "../src/modules/knowledge/content.js";
import { levenshtein, normalize, searchSubstances } from "../src/modules/knowledge/search.js";

const substance = (id: string) => findSubstance(id) as Substance;
const firstHit = (query: string) => searchSubstances(knowledgeContent, { query })[0];

describe("search", () => {
  it("finds a substance by its name in any language", () => {
    expect(firstHit("lilja").substance.id).toBe("lilies");
    expect(firstHit("Choklad").substance.id).toBe("chocolate");
    expect(firstHit("raisins").substance.id).toBe("grapes");
  });

  it("finds medicines by brand name", () => {
    const hit = firstHit("burana");
    expect(hit.substance.id).toBe("ibuprofen");
    expect(hit.matchedName).toBe("Burana");
  });

  it("ignores case and accents", () => {
    expect(normalize("Päivänlilja")).toBe("paivanlilja");
    expect(firstHit("paivanlilja").substance.id).toBe("lilies");
  });

  it("tolerates small typos", () => {
    expect(firstHit("xylitl").substance.id).toBe("xylitol");
    expect(firstHit("korvasini").substance.id).toBe("false-morel");
  });

  it("ranks an exact name above a longer one", () => {
    const ids = searchSubstances(knowledgeContent, { query: "lily" }).map((hit) => hit.substance.id);
    expect(ids.slice(0, 2)).toEqual(["lilies", "lily-of-the-valley"]);
  });

  it("finds nothing for unrelated words, and filters by category", () => {
    expect(searchSubstances(knowledgeContent, { query: "qwerty" })).toHaveLength(0);
    const plants = searchSubstances(knowledgeContent, { category: "plants" });
    expect(plants.every((hit) => hit.substance.category === "plants")).toBe(true);
    expect(plants.length).toBeGreaterThan(0);
  });

  it("computes edit distance", () => {
    expect(levenshtein("kitten", "sitting", 5)).toBe(3);
    expect(levenshtein("abc", "abcdefgh", 2)).toBe(3);
  });
});

describe("assessExposure", () => {
  const dog = (weightKg: number | null) => ({ species: "dog" as const, weightKg });

  // Dark chocolate 5.5 mg theobromine/g; thresholds 20 and 40 mg/kg
  it("rates chocolate by dose", () => {
    const small = assessExposure(substance("chocolate"), { ...dog(10), variantId: "milk", amount: 10 });
    expect(small).toMatchObject({ riskLevel: "caution", basis: "dose", action: "monitor" });
    expect(small.dose).toMatchObject({ compoundMg: 24, mgPerKg: 2.4 });

    const medium = assessExposure(substance("chocolate"), { ...dog(10), variantId: "dark", amount: 50 });
    expect(medium).toMatchObject({ riskLevel: "dangerous", action: "callVetNow", dose: { mgPerKg: 27.5 } });

    const large = assessExposure(substance("chocolate"), { ...dog(10), variantId: "dark", amount: 100 });
    expect(large).toMatchObject({ riskLevel: "emergency", action: "goToEmergencyNow" });
    expect(large.next).toEqual({ quickAssessment: true, emergencyClinics: true, callVet: true });
  });

  it("assumes the worst realistic case when the amount or weight is unknown", () => {
    const noAmount = assessExposure(substance("chocolate"), dog(10));
    expect(noAmount).toMatchObject({ riskLevel: "dangerous", basis: "substance", notes: ["amountUnknown"] });
    const noWeight = assessExposure(substance("chocolate"), { ...dog(null), variantId: "dark", amount: 5 });
    expect(noWeight).toMatchObject({ riskLevel: "dangerous", notes: ["weightUnknown"] });
  });

  it("treats any xylitol as dangerous for dogs and a larger dose as an emergency", () => {
    expect(assessExposure(substance("xylitol"), { ...dog(30), variantId: "gum", amount: 1 }).riskLevel).toBe("dangerous");
    expect(assessExposure(substance("xylitol"), { ...dog(30), variantId: "gum", amount: 3 }).riskLevel).toBe("emergency");
  });

  it("uses the species: lilies are an emergency for cats only", () => {
    expect(assessExposure(substance("lilies"), { species: "cat", weightKg: 4 }).action).toBe("goToEmergencyNow");
    expect(assessExposure(substance("lilies"), dog(20))).toMatchObject({ riskLevel: "caution", next: { quickAssessment: false } });
  });

  it("counts a species without data as dangerous", () => {
    const result = assessExposure(substance("chocolate"), { species: "smallAnimal", weightKg: 1 });
    expect(result).toMatchObject({ riskLevel: "dangerous", basis: "noSpeciesData", notes: ["noSpeciesData"] });
  });

  it("ignores an amount where no dose data exists", () => {
    const result = assessExposure(substance("grapes"), { ...dog(30), amount: 2 });
    expect(result).toMatchObject({ riskLevel: "dangerous", notes: ["noDoseData"] });
  });

  it("rejects an unknown amount option and never advises vomiting", () => {
    expect(() => assessExposure(substance("chocolate"), { ...dog(10), variantId: "white", amount: 5 })).toThrow(/variant/);
    expect(assessExposure(substance("carrot"), dog(10))).toMatchObject({ riskLevel: "harmless", doNotInduceVomiting: true });
  });
});

describe("knowledge base content", () => {
  it("has a risk level for cats and dogs on every substance", () => {
    for (const s of knowledgeContent.substances) {
      expect(s.risk.dog, s.id).toBeDefined();
      expect(s.risk.cat, s.id).toBeDefined();
    }
  });

  it("is translated completely", () => {
    for (const s of knowledgeContent.substances) {
      expect(s.symptoms.sv.length, s.id).toBe(s.symptoms.fi.length);
      expect(s.symptoms.en.length, s.id).toBe(s.symptoms.fi.length);
      for (const text of [s.summary, s.onset, s.firstAid ?? knowledgeContent.defaultFirstAid]) {
        expect(Boolean(text.fi) === Boolean(text.sv) && Boolean(text.sv) === Boolean(text.en), s.id).toBe(true);
      }
    }
  });
});
