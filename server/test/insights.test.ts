import { afterEach, describe, expect, it, vi } from "vitest";

import { todayInFinland } from "../src/modules/passport/service.js";
import type { InsightWriter } from "../src/modules/insights/readers.js";
import { sampleWriter } from "../src/modules/insights/readers.js";
import type { Insight } from "../src/modules/insights/schema.js";
import { createTestApp, createTestUser, type TestApp } from "./helpers.js";

const signInDemo = async (app: TestApp) => {
  const response = await app.inject({ method: "POST", url: "/auth/bank", payload: { bankId: "op", deviceName: "Test" } });
  const headers = { authorization: `Bearer ${response.json().accessToken}` };
  const pets = (await app.inject({ method: "GET", url: "/pets", headers })).json().pets as { id: string; name: string }[];
  return { headers, mirri: pets.find((p) => p.name === "Mirri")!, rekku: pets.find((p) => p.name === "Rekku")! };
};

const fakeWriter = (overrides: Partial<Insight>) =>
  vi.fn<InsightWriter>(async (input, lang) => {
    const sample = await sampleWriter(input, lang);
    return { source: "claude", insight: { ...sample.insight, ...overrides } };
  });

const usual = { appetite: 1, energy: 1, drinking: 1, toilet: 1, pain: 0, vomiting: 0 };

describe("demo history", () => {
  let app: TestApp;
  afterEach(async () => app.close());

  it("gives Mirri the same story as the app's mock data: day 5 of 10 after a urinary tract infection", async () => {
    app = await createTestApp({ DEMO_MODE: "true" });
    const { headers, mirri } = await signInDemo(app);

    const plan = (await app.inject({ method: "GET", url: `/pets/${mirri.id}/care-plan`, headers })).json().carePlan;
    expect(plan.diagnosis).toBe("Virtsatieinfektio");
    expect(plan.homeCare).toHaveLength(3);
    expect(plan.originalText).toContain("bakteerikystiitti");

    const status = (await app.inject({ method: "GET", url: `/pets/${mirri.id}/health-status`, headers })).json();
    expect(status.watchLists).toHaveLength(1);
    expect(status.watchLists[0]).toMatchObject({ currentDay: 5, totalDays: 10 });
    expect(status.watchLists[0].redWhen).toContain("Mirri");
    expect(status.watchLists[0].yellowAdvice).toHaveLength(2);
    expect(status.level).toBe("monitor");

    const { course } = (await app.inject({ method: "GET", url: `/pets/${mirri.id}/medication-course`, headers })).json();
    expect(course).toMatchObject({ name: "Antibiootti", dosesTotal: 20, dosesGiven: 6, active: true });
  });

  it("does not seed anything without demo mode", async () => {
    app = await createTestApp({ DEMO_MODE: "false" });
    const response = await app.inject({ method: "POST", url: "/auth/bank", payload: { bankId: "op", deviceName: "Test" } });
    const headers = { authorization: `Bearer ${response.json().accessToken}` };
    expect((await app.inject({ method: "GET", url: "/pets", headers })).json().pets).toEqual([]);
  });
});

describe("insights", () => {
  let app: TestApp;
  afterEach(async () => app.close());

  it("reads the vet data and the logs together, in the sample without an API key", async () => {
    app = await createTestApp({ DEMO_MODE: "true" });
    const { headers, mirri } = await signInDemo(app);
    const response = await app.inject({ method: "GET", url: `/pets/${mirri.id}/insights?lang=fi`, headers });
    expect(response.statusCode).toBe(200);
    const insight = response.json();
    expect(insight).toMatchObject({ source: "sample", ruleLevel: "yellow", level: "yellow", raisedByAi: false, comparison: "slower" });
    const sources = new Set(insight.reasons.map((r: { source: string }) => r.source));
    expect(sources).toEqual(new Set(["vet", "behaviour"]));
  });

  it("lets the AI raise the level, but never lower it", async () => {
    const raise = fakeWriter({ suggestedLevel: "contactVet" });
    app = await createTestApp({ DEMO_MODE: "true" }, { insightWriter: raise });
    const { headers, mirri, rekku } = await signInDemo(app);

    const rekkuInsight = (await app.inject({ method: "GET", url: `/pets/${rekku.id}/insights`, headers })).json();
    expect(rekkuInsight).toMatchObject({ ruleLevel: "green", level: "red", raisedByAi: true, source: "claude" });

    await app.close();
    const lower = fakeWriter({ suggestedLevel: "normal" });
    app = await createTestApp({ DEMO_MODE: "true" }, { insightWriter: lower });
    const second = await signInDemo(app);
    const mirriInsight = (await app.inject({ method: "GET", url: `/pets/${second.mirri.id}/insights`, headers: second.headers })).json();
    expect(mirriInsight).toMatchObject({ ruleLevel: "yellow", level: "yellow", raisedByAi: false });
    expect(mirri.id).not.toBe(second.mirri.id);
  });

  it("asks the AI again only when the data changes", async () => {
    const writer = fakeWriter({});
    app = await createTestApp({}, { insightWriter: writer });
    const { headers } = createTestUser(app);
    const pet = (await app.inject({ method: "POST", url: "/pets", headers, payload: { name: "Musti", species: "dog" } })).json();

    await app.inject({ method: "GET", url: `/pets/${pet.id}/insights`, headers });
    await app.inject({ method: "GET", url: `/pets/${pet.id}/insights`, headers });
    expect(writer).toHaveBeenCalledTimes(1);

    const log = await app.inject({
      method: "PUT",
      url: `/pets/${pet.id}/logs/${todayInFinland()}`,
      headers,
      payload: { answers: usual },
    });
    expect(log.statusCode).toBeLessThan(300);
    await app.inject({ method: "GET", url: `/pets/${pet.id}/insights`, headers });
    expect(writer).toHaveBeenCalledTimes(2);
  });

  it("only shows the household's own pets", async () => {
    app = await createTestApp();
    const owner = createTestUser(app);
    const other = createTestUser(app, "Other");
    const pet = (await app.inject({ method: "POST", url: "/pets", headers: owner.headers, payload: { name: "Musti", species: "dog" } })).json();
    const response = await app.inject({ method: "GET", url: `/pets/${pet.id}/insights`, headers: other.headers });
    expect(response.statusCode).toBe(404);
  });
});
