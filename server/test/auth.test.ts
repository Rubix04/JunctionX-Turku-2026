import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { deviceSessions, users } from "../src/db/schema.js";
import { SESSION_INACTIVITY_LIMIT_MS } from "../src/modules/auth/service.js";
import { requireRecentBankAuth } from "../src/plugins/auth.js";
import { createTestApp, type TestApp } from "./helpers.js";

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

const signIn = async (app: TestApp, body: Record<string, string> = {}) => {
  const response = await app.inject({
    method: "POST",
    url: "/auth/bank",
    payload: { bankId: "op", deviceName: "Maija's iPhone", ...body },
  });
  expect(response.statusCode).toBe(200);
  return response.json() as {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: { id: string; householdId: string; displayName: string };
  };
};

describe("auth", () => {
  let app: TestApp;

  beforeEach(async () => {
    app = await createTestApp({ DEMO_MODE: "true" });
  });

  afterEach(async () => {
    vi.useRealTimers();
    await app.close();
  });

  it("lists the banks for the identification selector", async () => {
    const response = await app.inject({ method: "GET", url: "/auth/banks" });
    expect(response.json().banks).toContainEqual({ id: "nordea", name: "Nordea" });
  });

  it("signs in with online banking and creates a household with demo pets", async () => {
    const result = await signIn(app);
    expect(result.user.displayName).toBe("Maija Meikäläinen");
    expect(result.expiresIn).toBe(900);

    const me = await app.inject({ method: "GET", url: "/auth/me", headers: bearer(result.accessToken) });
    expect(me.json().id).toBe(result.user.id);

    const pets = await app.inject({ method: "GET", url: "/pets", headers: bearer(result.accessToken) });
    expect(pets.json().pets.map((pet: { name: string }) => pet.name)).toEqual(["Mirri", "Rekku"]);
  });

  it("finds the same user on a second device", async () => {
    const first = await signIn(app);
    const second = await signIn(app, { deviceName: "iPad" });
    expect(second.user.id).toBe(first.user.id);

    const devices = await app.inject({ method: "GET", url: "/auth/devices", headers: bearer(second.accessToken) });
    const list = devices.json().devices;
    expect(list).toHaveLength(2);
    expect(list.filter((device: { current: boolean }) => device.current)).toHaveLength(1);
  });

  it("does not store the national ID", async () => {
    await signIn(app);
    const rows = app.db.select().from(users).all();
    expect(JSON.stringify(rows)).not.toContain("010170-999R");
  });

  it("rejects an unknown bank", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/bank",
      payload: { bankId: "nope", deviceName: "Phone" },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("UNKNOWN_BANK");
  });

  it("rotates the refresh token", async () => {
    const { refreshToken } = await signIn(app);
    const refreshed = await app.inject({ method: "POST", url: "/auth/refresh", payload: { refreshToken } });
    expect(refreshed.statusCode).toBe(200);
    expect(refreshed.json().refreshToken).not.toBe(refreshToken);

    const next = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: refreshed.json().refreshToken },
    });
    expect(next.statusCode).toBe(200);
  });

  it("revokes the session when a used refresh token comes back", async () => {
    const { refreshToken } = await signIn(app);
    const refreshed = await app.inject({ method: "POST", url: "/auth/refresh", payload: { refreshToken } });

    const reused = await app.inject({ method: "POST", url: "/auth/refresh", payload: { refreshToken } });
    expect(reused.statusCode).toBe(401);
    expect(reused.json().error.code).toBe("SESSION_EXPIRED");

    // The legitimate device must sign in with the bank again too.
    const legit = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: refreshed.json().refreshToken },
    });
    expect(legit.statusCode).toBe(401);
  });

  it("expires the session after long inactivity", async () => {
    const { refreshToken } = await signIn(app);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + SESSION_INACTIVITY_LIMIT_MS + 1000);

    const response = await app.inject({ method: "POST", url: "/auth/refresh", payload: { refreshToken } });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("SESSION_EXPIRED");
  });

  it("signs out this device and blocks its tokens right away", async () => {
    const { accessToken, refreshToken } = await signIn(app);
    const logout = await app.inject({ method: "POST", url: "/auth/logout", headers: bearer(accessToken) });
    expect(logout.statusCode).toBe(204);

    const me = await app.inject({ method: "GET", url: "/auth/me", headers: bearer(accessToken) });
    expect(me.statusCode).toBe(401);
    expect(me.json().error.code).toBe("SESSION_REVOKED");
    const refresh = await app.inject({ method: "POST", url: "/auth/refresh", payload: { refreshToken } });
    expect(refresh.statusCode).toBe(401);
  });

  it("signs out another device from settings", async () => {
    const phone = await signIn(app);
    const tablet = await signIn(app, { deviceName: "iPad" });
    const devices = await app.inject({ method: "GET", url: "/auth/devices", headers: bearer(phone.accessToken) });
    const tabletId = devices.json().devices.find((device: { current: boolean }) => !device.current).id;

    const removed = await app.inject({
      method: "DELETE",
      url: `/auth/devices/${tabletId}`,
      headers: bearer(phone.accessToken),
    });
    expect(removed.statusCode).toBe(204);
    const me = await app.inject({ method: "GET", url: "/auth/me", headers: bearer(tablet.accessToken) });
    expect(me.statusCode).toBe(401);
  });

  it("cannot sign out another user's device", async () => {
    const maija = await signIn(app);
    const matti = await signIn(app, { testPersonId: "demo-2" });
    const mattiDevices = await app.inject({ method: "GET", url: "/auth/devices", headers: bearer(matti.accessToken) });

    const response = await app.inject({
      method: "DELETE",
      url: `/auth/devices/${mattiDevices.json().devices[0].id}`,
      headers: bearer(maija.accessToken),
    });
    expect(response.statusCode).toBe(404);
  });

  describe("sensitive actions", () => {
    beforeEach(async () => {
      await app.close();
      app = await createTestApp();
      app.register(async (scope) => {
        scope.addHook("preHandler", app.authenticate);
        scope.post("/test/sensitive", { preHandler: requireRecentBankAuth() }, async () => ({ ok: true }));
      });
    });

    const callSensitive = (token: string) =>
      app.inject({ method: "POST", url: "/test/sensitive", headers: bearer(token) });

    it("asks for online banking again when the last bank sign-in is old", async () => {
      const { accessToken, refreshToken } = await signIn(app);
      expect((await callSensitive(accessToken)).statusCode).toBe(200);

      // Pretend the bank sign-in happened an hour ago; a refreshed token carries that time.
      app.db.update(deviceSessions).set({ bankAuthAt: Date.now() - 60 * 60 * 1000 }).run();
      const refreshed = await app.inject({ method: "POST", url: "/auth/refresh", payload: { refreshToken } });
      const oldToken = refreshed.json().accessToken;

      const denied = await callSensitive(oldToken);
      expect(denied.statusCode).toBe(403);
      expect(denied.json().error.code).toBe("BANK_REAUTH_REQUIRED");

      const reauth = await app.inject({
        method: "POST",
        url: "/auth/bank/reauth",
        headers: bearer(oldToken),
        payload: { bankId: "nordea" },
      });
      expect(reauth.statusCode).toBe(200);
      expect((await callSensitive(reauth.json().accessToken)).statusCode).toBe(200);
    });

    it("refuses re-authentication as a different person", async () => {
      const { accessToken } = await signIn(app);
      const response = await app.inject({
        method: "POST",
        url: "/auth/bank/reauth",
        headers: bearer(accessToken),
        payload: { bankId: "op", testPersonId: "demo-2" },
      });
      expect(response.statusCode).toBe(403);
      expect(response.json().error.code).toBe("IDENTITY_MISMATCH");
      const session = app.db.select().from(deviceSessions).get();
      expect(session?.revokedAt).toBeNull();
    });
  });
});
