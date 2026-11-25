import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/config.js";

const required = {
  JWT_SECRET: "test-jwt-secret-that-is-at-least-32-characters",
  IDENTITY_HASH_SECRET: "test-identity-secret-at-least-32-characters",
};

describe("configuration", () => {
  it("treats empty lines copied from .env.example as not set", () => {
    const config = loadConfig({ ...required, PUBLIC_BASE_URL: "", EXPO_ACCESS_TOKEN: "", ANTHROPIC_API_KEY: "  " });
    expect(config.PUBLIC_BASE_URL).toBeUndefined();
    expect(config.EXPO_ACCESS_TOKEN).toBeUndefined();
    expect(config.ANTHROPIC_API_KEY).toBeUndefined();
  });

  it("still rejects a missing secret and a malformed address", () => {
    expect(() => loadConfig({ ...required, JWT_SECRET: "" })).toThrow(/JWT_SECRET/);
    expect(() => loadConfig({ ...required, PUBLIC_BASE_URL: "not a url" })).toThrow(/PUBLIC_BASE_URL/);
  });
});
