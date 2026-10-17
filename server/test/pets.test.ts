import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestApp, createTestUser } from "./helpers.js";

describe("pets", () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it("requires an access token", async () => {
    const response = await app.inject({ method: "GET", url: "/pets" });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("UNAUTHORIZED");
  });

  it("creates, lists, updates and deletes a pet", async () => {
    const { headers } = createTestUser(app);

    const created = await app.inject({
      method: "POST",
      url: "/pets",
      headers,
      payload: { name: "Mirri", species: "cat", birthDate: "2017-04-02", weightKg: 4.6 },
    });
    expect(created.statusCode).toBe(201);
    const pet = created.json();
    expect(pet).toMatchObject({ name: "Mirri", species: "cat", breed: null, weightKg: 4.6 });

    const list = await app.inject({ method: "GET", url: "/pets", headers });
    expect(list.json().pets).toHaveLength(1);

    const updated = await app.inject({
      method: "PATCH",
      url: `/pets/${pet.id}`,
      headers,
      payload: { weightKg: 4.4 },
    });
    expect(updated.json().weightKg).toBe(4.4);

    const deleted = await app.inject({ method: "DELETE", url: `/pets/${pet.id}`, headers });
    expect(deleted.statusCode).toBe(204);
    const after = await app.inject({ method: "GET", url: `/pets/${pet.id}`, headers });
    expect(after.statusCode).toBe(404);
  });

  it("rejects invalid input", async () => {
    const { headers } = createTestUser(app);
    const response = await app.inject({
      method: "POST",
      url: "/pets",
      headers,
      payload: { name: "", species: "horse" },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("hides pets of other households", async () => {
    const owner = createTestUser(app, "Owner");
    const stranger = createTestUser(app, "Stranger");
    const created = await app.inject({
      method: "POST",
      url: "/pets",
      headers: owner.headers,
      payload: { name: "Rekku", species: "dog" },
    });

    const response = await app.inject({
      method: "GET",
      url: `/pets/${created.json().id}`,
      headers: stranger.headers,
    });
    expect(response.statusCode).toBe(404);
    const list = await app.inject({ method: "GET", url: "/pets", headers: stranger.headers });
    expect(list.json().pets).toHaveLength(0);
  });
});
