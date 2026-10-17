import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { createDb } from "../src/db/client.js";
import { households, users } from "../src/db/schema.js";
import { createDeviceSession } from "../src/modules/auth/service.js";

/** A fresh app with an in-memory database and a temporary upload folder. Close it after the test. */
export const createTestApp = async (env: Record<string, string> = {}) => {
  const uploadDir = mkdtempSync(join(tmpdir(), "tassuvahti-test-"));
  const config = loadConfig({
    NODE_ENV: "test",
    DATABASE_PATH: ":memory:",
    UPLOAD_DIR: uploadDir,
    JWT_SECRET: "test-jwt-secret-that-is-at-least-32-characters",
    IDENTITY_HASH_SECRET: "test-identity-secret-at-least-32-characters",
    ...env,
  });
  const { db, close } = createDb(config.DATABASE_PATH);
  const app = await buildApp({ config, db });
  app.addHook("onClose", async () => {
    close();
    rmSync(uploadDir, { recursive: true, force: true });
  });
  return app;
};

export type TestApp = Awaited<ReturnType<typeof createTestApp>>;

/**
 * Inserts a household with one signed-in user, without going through the bank flow,
 * and returns an `Authorization` header for them.
 */
export const createTestUser = (app: TestApp, displayName = "Test User") => {
  const householdId = randomUUID();
  const userId = randomUUID();
  app.db.insert(households).values({ id: householdId }).run();
  app.db.insert(users).values({ id: userId, householdId, displayName, identityHash: randomUUID() }).run();
  const { session } = createDeviceSession(app.db, userId, "Test device");
  const token = app.jwt.sign({ sub: userId, hid: householdId, sid: session.id, bat: session.bankAuthAt });
  return { userId, householdId, sessionId: session.id, headers: { authorization: `Bearer ${token}` } };
};
