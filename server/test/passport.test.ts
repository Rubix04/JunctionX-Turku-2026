import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { healthRecords, passportShares } from "../src/db/schema.js";
import { todayInFinland } from "../src/modules/passport/service.js";
import { createTestApp, createTestUser, type TestApp } from "./helpers.js";

const daysFromToday = (days: number) =>
  new Date(Date.parse(`${todayInFinland()}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

describe("health passport", () => {
  let app: TestApp;
  let user: ReturnType<typeof createTestUser>;
  let petId: string;

  const add = (section: string, payload: Record<string, unknown>, headers = user.headers) =>
    app.inject({ method: "POST", url: `/pets/${petId}/passport/${section}`, headers, payload });

  const passport = async () => {
    const response = await app.inject({ method: "GET", url: `/pets/${petId}/passport`, headers: user.headers });
    expect(response.statusCode).toBe(200);
    return response.json();
  };

  beforeEach(async () => {
    app = await createTestApp();
    user = createTestUser(app);
    const created = await app.inject({
      method: "POST",
      url: "/pets",
      headers: user.headers,
      payload: { name: "Mirri", species: "cat", birthDate: "2017-04-02" },
    });
    petId = created.json().id;
  });

  afterEach(async () => {
    vi.useRealTimers();
    await app.close();
  });

  describe("records", () => {
    it("starts empty", async () => {
      const result = await passport();
      expect(result.pet.name).toBe("Mirri");
      expect(result).toMatchObject({ vaccinations: [], medications: [], allergies: [], surgeries: [], visits: [] });
    });

    it("stores every kind of record", async () => {
      expect((await add("vaccinations", { name: "Rabies", givenOn: "2025-05-01", validUntil: "2028-05-01" })).statusCode).toBe(201);
      expect((await add("medications", { name: "Metacam", dosage: "0.5 ml once a day", startDate: "2026-10-01" })).statusCode).toBe(201);
      expect((await add("allergies", { allergen: "Chicken", reaction: "Itchy skin", severity: "moderate" })).statusCode).toBe(201);
      expect((await add("surgeries", { name: "Spaying", performedOn: "2018-02-10", clinic: "Eläinklinikka Turku" })).statusCode).toBe(201);
      expect((await add("visits", { visitedOn: "2026-10-15", reason: "Urinary tract infection", diagnosis: "Cystitis" })).statusCode).toBe(201);

      const result = await passport();
      expect(result.vaccinations[0]).toMatchObject({ name: "Rabies", batchNumber: null, status: "valid" });
      expect(result.medications[0]).toMatchObject({ name: "Metacam", endDate: null, active: true });
      expect(result.allergies[0]).toMatchObject({ allergen: "Chicken", severity: "moderate", notedOn: null });
      expect(result.surgeries[0].clinic).toBe("Eläinklinikka Turku");
      expect(result.visits[0].diagnosis).toBe("Cystitis");
    });

    it("sorts newest first and undated records last", async () => {
      await add("allergies", { allergen: "Pollen" });
      await add("allergies", { allergen: "Chicken", notedOn: "2020-01-01" });
      await add("allergies", { allergen: "Beef", notedOn: "2024-01-01" });
      const names = (await passport()).allergies.map((a: { allergen: string }) => a.allergen);
      expect(names).toEqual(["Beef", "Chicken", "Pollen"]);
    });

    it("works out vaccination status from the validity date", async () => {
      await add("vaccinations", { name: "Expired", givenOn: "2020-01-01", validUntil: daysFromToday(-1) });
      await add("vaccinations", { name: "Soon", givenOn: "2020-01-02", validUntil: daysFromToday(10) });
      await add("vaccinations", { name: "Valid", givenOn: "2020-01-03", validUntil: daysFromToday(200) });
      await add("vaccinations", { name: "Forever", givenOn: "2020-01-04" });
      const statuses = Object.fromEntries(
        (await passport()).vaccinations.map((v: { name: string; status: string }) => [v.name, v.status]),
      );
      expect(statuses).toEqual({ Expired: "expired", Soon: "expiringSoon", Valid: "valid", Forever: "noExpiry" });
    });

    it("marks medication as ended after its end date", async () => {
      await add("medications", { name: "Antibiotic", startDate: "2026-01-01", endDate: daysFromToday(-1) });
      expect((await passport()).medications[0].active).toBe(false);
    });

    it("validates each kind's fields", async () => {
      const missing = await add("vaccinations", { givenOn: "2025-05-01" });
      expect(missing.statusCode).toBe(400);
      expect(missing.json().error.details[0].path).toBe("/name");

      const backwards = await add("medications", { name: "X", startDate: "2026-05-01", endDate: "2026-04-01" });
      expect(backwards.statusCode).toBe(400);
      expect(backwards.json().error.details[0].path).toBe("/endDate");

      const badSeverity = await add("allergies", { allergen: "Fish", severity: "deadly" });
      expect(badSeverity.statusCode).toBe(400);

      const badSection = await add("hobbies", { name: "Fetch" });
      expect(badSection.statusCode).toBe(400);
    });

    it("updates a record and validates the merged result", async () => {
      const created = (await add("vaccinations", { name: "Rabies", givenOn: "2025-05-01" })).json();
      const url = `/pets/${petId}/passport/vaccinations/${created.id}`;

      const updated = await app.inject({ method: "PATCH", url, headers: user.headers, payload: { batchNumber: "AB123" } });
      expect(updated.statusCode).toBe(200);
      expect(updated.json()).toMatchObject({ name: "Rabies", givenOn: "2025-05-01", batchNumber: "AB123" });

      const invalid = await app.inject({ method: "PATCH", url, headers: user.headers, payload: { validUntil: "2020-01-01" } });
      expect(invalid.statusCode).toBe(400);

      const wrongSection = await app.inject({
        method: "PATCH",
        url: `/pets/${petId}/passport/surgeries/${created.id}`,
        headers: user.headers,
        payload: { notes: "x" },
      });
      expect(wrongSection.statusCode).toBe(404);
    });

    it("deletes a record", async () => {
      const created = (await add("surgeries", { name: "Dental", performedOn: "2024-03-03" })).json();
      const url = `/pets/${petId}/passport/surgeries/${created.id}`;
      expect((await app.inject({ method: "DELETE", url, headers: user.headers })).statusCode).toBe(204);
      expect((await app.inject({ method: "DELETE", url, headers: user.headers })).statusCode).toBe(404);
    });

    it("keeps passports private to the household", async () => {
      const stranger = createTestUser(app, "Stranger");
      expect((await add("allergies", { allergen: "Fish" }, stranger.headers)).statusCode).toBe(404);
      const response = await app.inject({ method: "GET", url: `/pets/${petId}/passport`, headers: stranger.headers });
      expect(response.statusCode).toBe(404);
    });

    it("removes records and share links with the pet", async () => {
      await add("allergies", { allergen: "Fish" });
      await app.inject({ method: "POST", url: `/pets/${petId}/passport/shares`, headers: user.headers, payload: { recipientType: "vet" } });
      await app.inject({ method: "DELETE", url: `/pets/${petId}`, headers: user.headers });
      expect(app.db.select().from(healthRecords).all()).toHaveLength(0);
      expect(app.db.select().from(passportShares).all()).toHaveLength(0);
    });
  });

  describe("sharing", () => {
    const share = async (payload: Record<string, unknown> = { recipientType: "vet" }) => {
      const response = await app.inject({
        method: "POST",
        url: `/pets/${petId}/passport/shares`,
        headers: user.headers,
        payload,
      });
      expect(response.statusCode).toBe(201);
      return response.json() as { id: string; url: string; expiresAt: number; sections: string[] };
    };

    const open = (url: string, accept = "application/json") =>
      app.inject({ method: "GET", url: new URL(url).pathname, headers: { accept } });

    beforeEach(async () => {
      await add("allergies", { allergen: "Lilies", severity: "severe" });
      await add("vaccinations", { name: "Rabies", givenOn: "2025-05-01" });
      await add("visits", { visitedOn: "2026-10-15", reason: "Check-up" });
    });

    it("shares only the chosen sections, without owner details", async () => {
      const created = await share({ recipientType: "petCare", recipientName: "Hoitola Tassu", sections: ["allergies", "vaccinations"] });
      expect(created.url).toMatch(/\/shared\/passports\/[\w-]{32}$/);

      const response = await open(created.url);
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.pet).toEqual({ name: "Mirri", species: "cat", breed: null, birthDate: "2017-04-02", weightKg: null });
      expect(body.allergies[0].allergen).toBe("Lilies");
      expect(body.vaccinations).toHaveLength(1);
      expect(body.visits).toBeUndefined();
      expect(JSON.stringify(body)).not.toContain(user.userId);
      expect(response.headers["cache-control"]).toBe("no-store");
    });

    it("shows a readable page in the browser, with user text escaped", async () => {
      await add("allergies", { allergen: "<script>alert(1)</script>" });
      const created = await share({ recipientType: "vet", language: "fi" });

      const response = await open(created.url, "text/html,application/xhtml+xml");
      expect(response.headers["content-type"]).toContain("text/html");
      expect(response.headers["content-security-policy"]).toContain("default-src 'none'");
      expect(response.headers["x-robots-tag"]).toContain("noindex");
      expect(response.body).toContain("Mirri");
      expect(response.body).toContain("Allergiat");
      expect(response.body).toContain("&lt;script&gt;");
      expect(response.body).not.toContain("<script>");
    });

    it("counts how often the link was opened", async () => {
      const created = await share();
      await open(created.url);
      await open(created.url);
      const list = await app.inject({ method: "GET", url: `/pets/${petId}/passport/shares`, headers: user.headers });
      expect(list.json().shares[0]).toMatchObject({ id: created.id, accessCount: 2, active: true });
      expect(list.json().shares[0].url).toBeUndefined();
    });

    it("stops working when revoked", async () => {
      const created = await share();
      const revoked = await app.inject({
        method: "DELETE",
        url: `/pets/${petId}/passport/shares/${created.id}`,
        headers: user.headers,
      });
      expect(revoked.statusCode).toBe(204);
      expect((await open(created.url)).statusCode).toBe(404);
      const list = await app.inject({ method: "GET", url: `/pets/${petId}/passport/shares`, headers: user.headers });
      expect(list.json().shares[0].active).toBe(false);
    });

    it("stops working when expired", async () => {
      const created = await share({ recipientType: "vet", expiresInHours: 1 });
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(created.expiresAt + 1);
      expect((await open(created.url)).statusCode).toBe(404);
    });

    it("answers 404 for unknown links and stores no plain tokens", async () => {
      const created = await share();
      const token = created.url.split("/").pop() as string;
      expect((await open(created.url.replace(token, "x".repeat(32)))).statusCode).toBe(404);
      expect(JSON.stringify(app.db.select().from(passportShares).all())).not.toContain(token);
    });

    it("validates the share request", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/pets/${petId}/passport/shares`,
        headers: user.headers,
        payload: { recipientType: "vet", expiresInHours: 10_000, sections: [] },
      });
      expect(response.statusCode).toBe(400);
    });
  });
});
