import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { todayInFinland } from "../src/modules/passport/service.js";
import { createTestApp, createTestUser, type TestApp } from "./helpers.js";

describe("diet and weight API", () => {
  let app: TestApp;
  let user: ReturnType<typeof createTestUser>;
  let petId: string;

  const request = (method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", url: string, payload?: object) =>
    app.inject({ method, url, headers: user.headers, payload });

  const plan = { dietType: "maintenance", foodName: "Dry food A", packageDailyGrams: 200 };

  beforeEach(async () => {
    app = await createTestApp();
    user = createTestUser(app);
    const created = await request("POST", "/pets", { name: "Rekku", species: "dog", birthDate: "2021-08-19", weightKg: 10 });
    petId = created.json().id;
  });

  afterEach(async () => {
    await app.close();
  });

  it("lists diet types in the requested language, marked as sample content", async () => {
    const body = (await request("GET", "/diets?lang=sv")).json();
    expect(body.content.status).toBe("sample");
    expect(body.diets).toHaveLength(7);
    expect(body.diets.find((d: { dietType: string }) => d.dietType === "kidney").title).toBe("Njurdiet");
  });

  it("calculates a portion from a package amount without saving anything", async () => {
    const response = await request("POST", "/diet/portion", { species: "cat", weightKg: 4, packageDailyGrams: 60, mealsPerDay: 3 });
    expect(response.json().portion).toMatchObject({ gramsPerDay: 60, gramsPerMeal: 20 });
  });

  it("starts with suggestions only", async () => {
    const body = (await request("GET", `/pets/${petId}/diet`)).json();
    expect(body).toMatchObject({ suggestions: [], plan: null, portion: null, portionMissing: "noPlan" });
  });

  it("saves a plan and gives the portion in grams per meal", async () => {
    const body = (await request("PUT", `/pets/${petId}/diet?lang=en`, plan)).json();
    expect(body.plan).toMatchObject({ foodName: "Dry food A", packageForWeightKg: 10, goal: "maintain" });
    expect(body.diet.title).toBe("Maintenance diet");
    expect(body.portion).toMatchObject({ gramsPerDay: 200, gramsPerMeal: 100 });
    expect(body.foodChangeTip).toBeNull();
  });

  it("explains why there is no portion yet", async () => {
    const body = (await request("PUT", `/pets/${petId}/diet`, { dietType: "urinary", foodName: "Vet diet" })).json();
    expect(body).toMatchObject({ portion: null, portionMissing: "packageAmountMissing" });

    const noWeight = (await request("POST", "/pets", { name: "Mirri", species: "cat" })).json();
    const missing = await request("PUT", `/pets/${noWeight.id}/diet`, plan);
    expect(missing.json().error.code).toBe("PACKAGE_WEIGHT_REQUIRED");
  });

  it("requires a target weight for weight loss", async () => {
    const response = await request("PUT", `/pets/${petId}/diet`, { ...plan, goal: "lose" });
    expect(response.statusCode).toBe(400);
    const ok = (await request("PUT", `/pets/${petId}/diet`, { ...plan, goal: "lose", targetWeightKg: 9 })).json();
    expect(ok.portion.feedForWeightKg).toBe(9);
  });

  it("shows the food change tip once, when the food changes", async () => {
    await request("PUT", `/pets/${petId}/diet`, plan);
    const changed = (await request("PUT", `/pets/${petId}/diet?lang=en`, { ...plan, foodName: "Dry food B" })).json();
    expect(changed.foodChangeTip).toContain("gradually");
    const again = (await request("PUT", `/pets/${petId}/diet`, { ...plan, foodName: "Dry food B", mealsPerDay: 3 })).json();
    expect(again.foodChangeTip).toBeNull();
    expect((await request("GET", `/pets/${petId}/diet`)).json().foodChangeTip).toBeUndefined();
  });

  it("puts diet suggestions from the passport first", async () => {
    await request("PUT", `/pets/${petId}/diet`, { ...plan, dietType: "urinary" });
    await request("POST", `/pets/${petId}/passport/visits`, { visitedOn: "2026-10-15", reason: "Straining", diagnosis: "Struvite crystals" });
    const body = (await request("GET", `/pets/${petId}/diet?lang=fi`)).json();
    expect(body.suggestions).toHaveLength(1);
    expect(body.suggestions[0]).toMatchObject({ dietType: "urinary", title: "Virtsatieruokavalio", current: true });
  });

  it("deletes the plan", async () => {
    await request("PUT", `/pets/${petId}/diet`, plan);
    expect((await request("DELETE", `/pets/${petId}/diet`)).statusCode).toBe(204);
    expect((await request("DELETE", `/pets/${petId}/diet`)).statusCode).toBe(404);
  });

  describe("weights", () => {
    const visit = (visitedOn: string, weightKg?: number) =>
      request("POST", `/pets/${petId}/passport/visits`, { visitedOn, reason: "Check-up", weightKg });

    it("takes the weight from a vet visit and keeps the portion up to date", async () => {
      await request("PUT", `/pets/${petId}/diet`, plan);
      await visit("2026-10-01", 12);

      const weights = (await request("GET", `/pets/${petId}/weights`)).json();
      expect(weights.entries).toEqual([expect.objectContaining({ weighedOn: "2026-10-01", weightKg: 12, source: "vet" })]);
      expect((await request("GET", `/pets/${petId}`)).json().weightKg).toBe(12);

      const diet = (await request("GET", `/pets/${petId}/diet`)).json();
      expect(diet.portion.gramsPerDay).toBe(230);
      expect(diet.weighIn.latest).toEqual({ weighedOn: "2026-10-01", weightKg: 12, source: "vet" });
    });

    it("follows changes to the visit and removes the weight with it", async () => {
      await request("POST", `/pets/${petId}/weights`, { weightKg: 10.4, weighedOn: "2026-03-01" });
      const created = (await visit("2026-10-01", 11)).json();
      const url = `/pets/${petId}/passport/visits/${created.id}`;

      await request("PATCH", url, { weightKg: 11.5 });
      expect((await request("GET", `/pets/${petId}`)).json().weightKg).toBe(11.5);

      await request("PATCH", url, { weightKg: null });
      expect((await request("GET", `/pets/${petId}/weights`)).json().entries).toHaveLength(1);

      await request("PATCH", url, { weightKg: 11 });
      await request("DELETE", url);
      expect((await request("GET", `/pets/${petId}/weights`)).json().entries).toHaveLength(1);
      expect((await request("GET", `/pets/${petId}`)).json().weightKg).toBe(10.4);
    });

    it("lets a visit replace the owner's weigh-in on the same day", async () => {
      await request("POST", `/pets/${petId}/weights`, { weightKg: 10.9, weighedOn: "2026-10-01" });
      await visit("2026-10-01", 11.2);
      const entries = (await request("GET", `/pets/${petId}/weights`)).json().entries;
      expect(entries).toEqual([expect.objectContaining({ weightKg: 11.2, source: "vet" })]);
    });

    it("only deletes the owner's own entries", async () => {
      await visit("2026-10-01", 11);
      const own = (await request("POST", `/pets/${petId}/weights`, { weightKg: 10.8 })).json();
      expect(own).toMatchObject({ weighedOn: todayInFinland(), source: "owner" });

      const fromVisit = (await request("GET", `/pets/${petId}/weights`)).json().entries[0];
      const refused = await request("DELETE", `/pets/${petId}/weights/${fromVisit.id}`);
      expect(refused.json().error.code).toBe("WEIGHT_FROM_VISIT");
      expect((await request("DELETE", `/pets/${petId}/weights/${own.id}`)).statusCode).toBe(204);
    });

    it("reminds to weigh in on a weight-loss plan", async () => {
      await visit("2026-01-10", 12);
      await request("PUT", `/pets/${petId}/diet`, { ...plan, goal: "lose", targetWeightKg: 10 });
      const body = (await request("GET", `/pets/${petId}/diet`)).json();
      expect(body.weighIn).toMatchObject({ nextWeighInOn: "2026-02-21", weighInDue: true });
    });

    it("keeps weights private to the household", async () => {
      const stranger = createTestUser(app, "Stranger");
      const response = await app.inject({ method: "GET", url: `/pets/${petId}/weights`, headers: stranger.headers });
      expect(response.statusCode).toBe(404);
    });
  });
});
