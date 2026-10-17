import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestApp, createTestUser, type TestApp } from "./helpers.js";

describe("knowledge base API", () => {
  let app: TestApp;

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("public", () => {
    it("searches without signing in", async () => {
      const response = await app.inject({ method: "GET", url: "/knowledge/substances?q=burana&species=cat&lang=fi" });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.content.status).toBe("sample");
      expect(body.results[0]).toMatchObject({
        id: "ibuprofen",
        name: "Ibuprofeeni",
        matchedName: "Burana",
        categoryLabel: "Lääkkeet",
        speciesRisk: "emergency",
      });
      expect(body.results[0].risk.smallAnimal).toBe("unknown");
    });

    it("browses a category in alphabetical order", async () => {
      const body = (await app.inject({ method: "GET", url: "/knowledge/substances?category=plants&lang=en" })).json();
      const names = body.results.map((r: { name: string }) => r.name);
      expect(names).toEqual([...names].sort((a: string, b: string) => a.localeCompare(b, "en")));
      expect(body.results.every((r: { category: string }) => r.category === "plants")).toBe(true);
    });

    it("lists categories with counts", async () => {
      const body = (await app.inject({ method: "GET", url: "/knowledge/categories?lang=sv" })).json();
      expect(body.categories).toHaveLength(6);
      expect(body.categories.find((c: { id: string }) => c.id === "mushrooms")).toMatchObject({ label: "Svampar" });
    });

    it("shows details with first aid and amount options", async () => {
      const body = (await app.inject({ method: "GET", url: "/knowledge/substances/chocolate?lang=en" })).json();
      expect(body).toMatchObject({ name: "Chocolate", risk: { dog: "dangerous" }, doNotInduceVomiting: true });
      expect(body.firstAid).toContain("Don't make your pet vomit");
      expect(body.doseOptions.map((o: { variantId: string }) => o.variantId)).toEqual(["milk", "dark", "baking"]);
      expect(body.sources.length).toBeGreaterThan(0);

      const unknown = await app.inject({ method: "GET", url: "/knowledge/substances/nope" });
      expect(unknown.statusCode).toBe(404);
    });

    it("assesses \"my pet ate this\" without signing in", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/knowledge/assess",
        payload: { substanceId: "chocolate", species: "dog", weightKg: 10, variantId: "dark", amount: 100 },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().assessment).toMatchObject({ riskLevel: "emergency", next: { emergencyClinics: true } });
    });
  });

  describe("exposures", () => {
    let user: ReturnType<typeof createTestUser>;
    let petId: string;

    beforeEach(async () => {
      user = createTestUser(app);
      const pet = await app.inject({
        method: "POST",
        url: "/pets",
        headers: user.headers,
        payload: { name: "Rekku", species: "dog", weightKg: 30 },
      });
      petId = pet.json().id;
    });

    it("needs a signed-in user", async () => {
      const response = await app.inject({ method: "POST", url: `/pets/${petId}/exposures`, payload: { substanceId: "grapes" } });
      expect(response.statusCode).toBe(401);
    });

    it("uses the pet's weight, saves the event and summarises the pet for the vet", async () => {
      await app.inject({
        method: "POST",
        url: `/pets/${petId}/passport/allergies`,
        headers: user.headers,
        payload: { allergen: "Chicken", severity: "moderate" },
      });
      await app.inject({
        method: "POST",
        url: `/pets/${petId}/passport/medications`,
        headers: user.headers,
        payload: { name: "Librela", dosage: "Monthly injection", startDate: "2026-01-01" },
      });

      const response = await app.inject({
        method: "POST",
        url: `/pets/${petId}/exposures?lang=en`,
        headers: user.headers,
        payload: { substanceId: "xylitol", variantId: "gum", amount: 3, occurredAt: "2026-10-17T14:20:00+03:00" },
      });
      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.assessment).toMatchObject({ riskLevel: "emergency", dose: { mgPerKg: 100 } });
      expect(body.exposure).toMatchObject({ substanceName: "Xylitol", riskLevel: "emergency", occurredAt: Date.parse("2026-10-17T11:20:00Z") });
      expect(body.vetSummary).toEqual({
        pet: { name: "Rekku", species: "dog", weightKg: 30, birthDate: null },
        activeMedications: [{ name: "Librela", dosage: "Monthly injection" }],
        allergies: [{ allergen: "Chicken", severity: "moderate" }],
      });

      const list = await app.inject({ method: "GET", url: `/pets/${petId}/exposures`, headers: user.headers });
      expect(list.json().exposures).toHaveLength(1);
    });

    it("rejects unknown substances and keeps history private", async () => {
      const unknown = await app.inject({
        method: "POST",
        url: `/pets/${petId}/exposures`,
        headers: user.headers,
        payload: { substanceId: "kryptonite" },
      });
      expect(unknown.statusCode).toBe(404);

      const stranger = createTestUser(app, "Stranger");
      const response = await app.inject({ method: "GET", url: `/pets/${petId}/exposures`, headers: stranger.headers });
      expect(response.statusCode).toBe(404);
    });
  });
});
