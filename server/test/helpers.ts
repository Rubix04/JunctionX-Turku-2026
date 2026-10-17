import { randomUUID } from "node:crypto";

import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { createDb } from "../src/db/client.js";
import { households, users } from "../src/db/schema.js";

/** A fresh app with an in-memory database. Close it with `app.close()` after the test. */
export const createTestApp = async () => {
  const config = loadConfig({
    NODE_ENV: "test",
    DATABASE_PATH: ":memory:",
    JWT_SECRET: "test-secret-that-is-at-least-32-characters-long",
  });
  const { db, close } = createDb(config.DATABASE_PATH);
  const app = await buildApp({ config, db });
  app.addHook("onClose", async () => close());
  return app;
};

type TestApp = Awaited<ReturnType<typeof createTestApp>>;

/** Inserts a household with one user and returns an `Authorization` header for them. */
export const createTestUser = (app: TestApp, displayName = "Test User") => {
  const householdId = randomUUID();
  const userId = randomUUID();
  app.db.insert(households).values({ id: householdId }).run();
  app.db.insert(users).values({ id: userId, householdId, displayName }).run();
  const token = app.jwt.sign({ sub: userId, hid: householdId });
  return { userId, householdId, headers: { authorization: `Bearer ${token}` } };
};
