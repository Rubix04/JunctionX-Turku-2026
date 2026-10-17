import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { todayInFinland } from "../src/modules/passport/service.js";
import { createTestApp, createTestUser, type TestApp } from "./helpers.js";

describe("diet and weight API", () => {
  let app: TestApp;
  let user: ReturnType<typeof createTestUser>;
  let petId: string;

  const request = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: object) =>
    app.inject({ method, url, headers: user.headers, payload });

  const plan = { dietType: "maintenance", foodName: "Dry food A", kcalPer100g: 350, neutered: true };

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
    const response = await request("GET", "/diets?lang=sv");
    const body = response.json();
    expect(body.content.status).toBe("sample");
    expect(body.diets).toHaveLength(7);
    expect(body.diets.find((d: { dietType: string }) => d.dietType === "kidney").title).toBe("Njurdiet");
  });

  it("calculates a portion without saving anything", async () => {
    const response = await request("POST", "/diet/portion", { species: "dog", weightKg: 10, neutered: true, kcalPer100g: 350 });
    expect(response.statusCode).toBe(200);
    expect(response.json().portion).toMatchObject({ dailyKcal: 630, food: { gramsPerDay: 180, gramsPerMeal: 90 } });

    const smallAnimal = await request("POST", "/diet/portion", { species: "smallAnimal", weightKg: 1 });
    expect(smallAnimal.statusCode).toBe(422);
    expect(smallAnimal.json().error.code).toBe("UNSUPPORTED_SPECIES");

    const noTarget = await request("POST", "/diet/portion", { species: "dog", weightKg: 10, goal: "lose" });
    expect(noTarget.json().error.code).toBe("INVALID_TARGET");
  });

  it("returns an empty diet before a plan is set", async () => {
    const body = (await request("GET", `/pets/${petId}/diet`)).json();
    expect(body).toMatchObject({ plan: null, diet: null, portion: null, transition: null });
  });

  it("saves a plan and calculates the portion from the pet's weight", async () => {
    const response = await request("PUT", `/pets/${petId}/diet?lang=en`, plan);
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.plan).toMatchObject({ foodName: "Dry food A", mealsPerDay: 2, source: "owner" });
    expect(body.diet.title).toBe("Maintenance diet");
    expect(body.portion).toMatchObject({ dailyKcal: 630, food: { gramsPerMeal: 90 } });
    expect(body.transition).toBeNull();
  });

  it("uses the target weight on a weight-loss plan", async () => {
    const body = (await request("PUT", `/pets/${petId}/diet`, { ...plan, dietType: "weightLoss", targetWeightKg: 8 })).json();
    expect(body.portion).toMatchObject({ factorName: "weightLoss", basisWeightKg: 8 });
  });

  it("starts a gradual switch when the food changes", async () => {
    await request("PUT", `/pets/${petId}/diet`, plan);
    const changed = (await request("PUT", `/pets/${petId}/diet`, { ...plan, foodName: "Dry food B" })).json();
    expect(changed.transition).toMatchObject({
      previousFoodName: "Dry food A",
      newFoodName: "Dry food B",
      startedOn: todayInFinland(),
      day: 1,
      newFoodPercent: 25,
    });

    // Editing other settings keeps the switch going.
    const edited = (await request("PUT", `/pets/${petId}/diet`, { ...plan, foodName: "Dry food B", mealsPerDay: 3 })).json();
    expect(edited.transition.previousFoodName).toBe("Dry food A");

    const immediate = (await request("PUT", `/pets/${petId}/diet`, { ...plan, foodName: "Vet diet C", skipTransition: true })).json();
    expect(immediate.transition).toBeNull();
  });

  it("deletes the plan", async () => {
    await request("PUT", `/pets/${petId}/diet`, plan);
    expect((await request("DELETE", `/pets/${petId}/diet`)).statusCode).toBe(204);
    expect((await request("DELETE", `/pets/${petId}/diet`)).statusCode).toBe(404);
  });

  it("suggests diets from the passport", async () => {
    await request("PUT", `/pets/${petId}/diet`, { ...plan, dietType: "urinary" });
    await request("POST", `/pets/${petId}/passport/visits`, { visitedOn: "2026-10-15", reason: "Straining", diagnosis: "Struvite crystals" });
    const body = (await request("GET", `/pets/${petId}/diet/suggestions?lang=fi`)).json();
    expect(body.suggestions).toHaveLength(1);
    expect(body.suggestions[0]).toMatchObject({ dietType: "urinary", title: "Virtsatieruokavalio", current: true });
  });

  describe("weights", () => {
    it("logs weights, replaces a same-day entry and updates the pet's weight", async () => {
      await request("POST", `/pets/${petId}/weights`, { weightKg: 10.4, weighedOn: "2026-09-20" });
      await request("POST", `/pets/${petId}/weights`, { weightKg: 10.1, weighedOn: "2026-10-01" });
      const replaced = await request("POST", `/pets/${petId}/weights`, { weightKg: 10.0, weighedOn: "2026-10-01", note: "After walk" });
      expect(replaced.statusCode).toBe(201);

      const body = (await request("GET", `/pets/${petId}/weights`)).json();
      expect(body.entries).toHaveLength(2);
      expect(body.summary.latest).toEqual({ weighedOn: "2026-10-01", weightKg: 10 });
      expect((await request("GET", `/pets/${petId}`)).json().weightKg).toBe(10);
    });

    it("restores the pet's weight from the previous entry when the latest is deleted", async () => {
      await request("POST", `/pets/${petId}/weights`, { weightKg: 10.4, weighedOn: "2026-09-20" });
      const latest = (await request("POST", `/pets/${petId}/weights`, { weightKg: 9.9, weighedOn: "2026-10-01" })).json();
      expect((await request("DELETE", `/pets/${petId}/weights/${latest.id}`)).statusCode).toBe(204);
      expect((await request("GET", `/pets/${petId}`)).json().weightKg).toBe(10.4);
      expect((await request("DELETE", `/pets/${petId}/weights/${latest.id}`)).statusCode).toBe(404);
    });

    it("defaults to today and filters the chart range", async () => {
      await request("POST", `/pets/${petId}/weights`, { weightKg: 11, weighedOn: "2020-01-01" });
      const today = (await request("POST", `/pets/${petId}/weights`, { weightKg: 10 })).json();
      expect(today.weighedOn).toBe(todayInFinland());
      const recent = (await request("GET", `/pets/${petId}/weights?days=30`)).json();
      expect(recent.entries).toHaveLength(1);
    });

    it("keeps weights private to the household", async () => {
      const stranger = createTestUser(app, "Stranger");
      const response = await app.inject({ method: "GET", url: `/pets/${petId}/weights`, headers: stranger.headers });
      expect(response.statusCode).toBe(404);
    });
  });
});
