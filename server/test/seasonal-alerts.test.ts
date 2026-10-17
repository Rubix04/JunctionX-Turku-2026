import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { deviceSessions, pushDevices } from "../src/db/schema.js";
import { runSeasonalAlertJob } from "../src/modules/alerts/job.js";
import type { PushMessage, PushResult } from "../src/modules/alerts/push.js";
import { createTestApp, createTestUser, type TestApp } from "./helpers.js";

const TOKEN = "ExponentPushToken[test-token-1]";

describe("seasonal alerts API", () => {
  let app: TestApp;

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it("shows current cards without signing in, with notes for the pet's species and age", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/alerts/current?date=2026-12-24&species=cat&ageMonths=6&lang=en",
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toMatchObject({ region: "south", date: "2026-12-24", content: { status: "sample" } });
    const christmas = body.cards.find((c: { id: string }) => c.id === "christmas-new-year");
    expect(christmas.activeUntil).toBe("2027-01-06");
    expect(christmas.notes).toEqual([
      "Lilies are deadly for cats, including in bouquets.",
      "A young pet's first New Year: get it used to sounds early and keep it indoors.",
    ]);
    expect(christmas.relatedSubstances).toContainEqual({ id: "lilies", name: "Lily" });
  });

  it("uses the location to pick the region", async () => {
    const body = (await app.inject({ method: "GET", url: "/alerts/current?lat=66.5&date=2026-11-05" })).json();
    expect(body.region).toBe("north");
    expect(body.cards.map((c: { id: string }) => c.id)).toContain("winter-ice-cold");
  });

  it("lists all cards and marks which are active", async () => {
    const body = (await app.inject({ method: "GET", url: "/alerts/cards?date=2026-07-01" })).json();
    expect(body.cards).toHaveLength(8);
    const heat = body.cards.find((c: { id: string }) => c.id === "summer-heat-cars");
    const christmas = body.cards.find((c: { id: string }) => c.id === "christmas-new-year");
    expect(heat.activeUntil).toBe("2026-08-31");
    expect(christmas.activeUntil).toBeNull();
  });

  it("matches symptom log entries to active alerts", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/alerts/match",
      payload: { symptomTags: ["heavyPanting", "drooling"], species: "dog", date: "2026-07-15", lang: "fi" },
    });
    expect(response.json().matches[0]).toMatchObject({
      card: { id: "summer-heat-cars", title: "Helle ja kuuma auto" },
      matchedTags: ["heavyPanting", "drooling"],
    });
    const tags = (await app.inject({ method: "GET", url: "/alerts/symptom-tags" })).json();
    expect(tags.symptomTags).toContain("heavyPanting");
  });

  it("shows a pet's cards using its species and age", async () => {
    const user = createTestUser(app);
    const pet = await app.inject({
      method: "POST",
      url: "/pets",
      headers: user.headers,
      payload: { name: "Rekku", species: "dog", birthDate: "2016-01-01" },
    });
    const response = await app.inject({
      method: "GET",
      url: `/pets/${pet.json().id}/alerts?date=2026-07-15&lang=en`,
      headers: user.headers,
    });
    const heat = response.json().cards.find((c: { id: string }) => c.id === "summer-heat-cars");
    expect(heat.notes).toContain("Older pets overheat more easily.");
  });

  describe("push registration", () => {
    it("registers the device with a rounded location", async () => {
      const user = createTestUser(app);
      const response = await app.inject({
        method: "PUT",
        url: "/notifications/device",
        headers: user.headers,
        payload: { expoPushToken: TOKEN, platform: "ios", language: "fi", latitude: 60.4518, longitude: 22.2666 },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ latitude: 60.5, longitude: 22.3, region: "south", seasonalAlerts: true });

      const off = await app.inject({
        method: "PUT",
        url: "/notifications/device",
        headers: user.headers,
        payload: { expoPushToken: TOKEN, platform: "ios", language: "fi", seasonalAlerts: false },
      });
      expect(off.json().seasonalAlerts).toBe(false);

      expect((await app.inject({ method: "DELETE", url: "/notifications/device", headers: user.headers })).statusCode).toBe(204);
      expect((await app.inject({ method: "GET", url: "/notifications/device", headers: user.headers })).statusCode).toBe(404);
    });

    it("rejects tokens that aren't Expo push tokens and requires sign-in", async () => {
      const user = createTestUser(app);
      const bad = await app.inject({
        method: "PUT",
        url: "/notifications/device",
        headers: user.headers,
        payload: { expoPushToken: "abc", platform: "android", language: "en" },
      });
      expect(bad.statusCode).toBe(400);
      expect((await app.inject({ method: "GET", url: "/notifications/device" })).statusCode).toBe(401);
    });
  });
});

describe("seasonal alert job", () => {
  let app: TestApp;
  let user: ReturnType<typeof createTestUser>;
  let sent: PushMessage[];
  let nextResult: PushResult;

  const send = async (messages: PushMessage[]) => {
    sent.push(...messages);
    return messages.map(() => nextResult);
  };
  // 13:00 in Helsinki (UTC+3 in October)
  const at = (date: string, utcTime = "10:00") => new Date(`${date}T${utcTime}:00Z`);

  beforeEach(async () => {
    app = await createTestApp();
    user = createTestUser(app);
    sent = [];
    nextResult = "sent";
    await app.inject({ method: "POST", url: "/pets", headers: user.headers, payload: { name: "Rekku", species: "dog" } });
    await app.inject({
      method: "PUT",
      url: "/notifications/device",
      headers: user.headers,
      payload: { expoPushToken: TOKEN, platform: "android", language: "en", latitude: 60.45 },
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it("sends one active card per day, each once per season", async () => {
    const first = await runSeasonalAlertJob(app.db, send, at("2026-10-17"));
    expect(first).toMatchObject({ devices: 1, sent: 1 });
    expect(sent[0]).toEqual({
      to: TOKEN,
      title: "Ticks and adders",
      body: "Rekku: Tick season has started. Check the coat after walks.",
      data: { type: "seasonalAlert", cardId: "spring-ticks-adders" },
    });

    expect((await runSeasonalAlertJob(app.db, send, at("2026-10-17", "14:00"))).sent).toBe(0);
    await runSeasonalAlertJob(app.db, send, at("2026-10-18"));
    await runSeasonalAlertJob(app.db, send, at("2026-10-19"));
    await runSeasonalAlertJob(app.db, send, at("2026-10-20"));
    expect(sent.map((m) => m.data.cardId)).toEqual([
      "spring-ticks-adders",
      "autumn-apples-mushrooms",
      "autumn-hunting-darkness",
    ]);
  });

  it("doesn't send at night", async () => {
    expect((await runSeasonalAlertJob(app.db, send, at("2026-10-17", "22:00"))).sent).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it("only sends cards for the household's species", async () => {
    // A cat-only household gets no dog-only card such as mushrooms.
    const catOwner = createTestUser(app, "Cat owner");
    await app.inject({ method: "POST", url: "/pets", headers: catOwner.headers, payload: { name: "Mirri", species: "cat" } });
    await app.inject({
      method: "PUT",
      url: "/notifications/device",
      headers: catOwner.headers,
      payload: { expoPushToken: "ExponentPushToken[cat]", platform: "ios", language: "en" },
    });
    for (const day of ["2026-10-17", "2026-10-18", "2026-10-19"]) {
      await runSeasonalAlertJob(app.db, send, at(day));
    }
    const catCards = sent.filter((m) => m.to === "ExponentPushToken[cat]").map((m) => m.data.cardId);
    expect(catCards).toEqual(["spring-ticks-adders", "autumn-hunting-darkness"]);
  });

  it("respects the opt-out and skips signed-out devices", async () => {
    app.db.update(pushDevices).set({ seasonalAlerts: false }).run();
    expect((await runSeasonalAlertJob(app.db, send, at("2026-10-17"))).devices).toBe(0);

    app.db.update(pushDevices).set({ seasonalAlerts: true }).run();
    app.db.update(deviceSessions).set({ revokedAt: Date.now() }).where(eq(deviceSessions.id, user.sessionId)).run();
    expect((await runSeasonalAlertJob(app.db, send, at("2026-10-17"))).devices).toBe(0);
  });

  it("removes devices whose token is no longer valid, and retries failures later", async () => {
    nextResult = "failed";
    expect((await runSeasonalAlertJob(app.db, send, at("2026-10-17"))).failed).toBe(1);
    nextResult = "sent";
    expect((await runSeasonalAlertJob(app.db, send, at("2026-10-17", "11:00"))).sent).toBe(1);

    nextResult = "invalidToken";
    expect((await runSeasonalAlertJob(app.db, send, at("2026-10-18"))).removed).toBe(1);
    expect(app.db.select().from(pushDevices).all()).toHaveLength(0);
  });
});
