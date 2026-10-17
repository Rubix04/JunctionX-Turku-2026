import { readdirSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestApp, createTestUser, type TestApp } from "./helpers.js";

const makeImage = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: "#0E5A63" } }).jpeg().toBuffer();

/** Builds a multipart/form-data body by hand, the same shape a React Native FormData sends. */
const multipartBody = (file: Buffer | null, fields: Record<string, string> = {}, fileField = "photo") => {
  const boundary = "----tassuvahti-test";
  const chunks: Buffer[] = [];
  for (const [name, value] of Object.entries(fields)) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
  }
  if (file) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${fileField}"; filename="pet.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`,
      ),
      file,
      Buffer.from("\r\n"),
    );
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return { payload: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
};

describe("pet profile pictures", () => {
  let app: TestApp;
  let user: ReturnType<typeof createTestUser>;
  let petId: string;

  const photoFiles = () => {
    try {
      return readdirSync(join(app.config.UPLOAD_DIR, "pet-photos"));
    } catch {
      return [];
    }
  };

  const upload = async (file: Buffer | null, fields?: Record<string, string>, fileField?: string) => {
    const { payload, contentType } = multipartBody(file, fields, fileField);
    return app.inject({
      method: "PUT",
      url: `/pets/${petId}/photo`,
      headers: { ...user.headers, "content-type": contentType },
      payload,
    });
  };

  beforeEach(async () => {
    app = await createTestApp();
    user = createTestUser(app);
    const created = await app.inject({
      method: "POST",
      url: "/pets",
      headers: user.headers,
      payload: { name: "Mirri", species: "cat" },
    });
    petId = created.json().id;
  });

  afterEach(async () => {
    await app.close();
  });

  it("starts with no picture so the client shows the species default", async () => {
    const pet = await app.inject({ method: "GET", url: `/pets/${petId}`, headers: user.headers });
    expect(pet.json().photoUrl).toBeNull();
    const photo = await app.inject({ method: "GET", url: `/pets/${petId}/photo`, headers: user.headers });
    expect(photo.statusCode).toBe(404);
  });

  it("stores an uploaded picture as a 512×512 WebP", async () => {
    const response = await upload(await makeImage(1200, 800));
    expect(response.statusCode).toBe(200);
    const { photoUrl } = response.json();
    expect(photoUrl).toMatch(new RegExp(`^/pets/${petId}/photo\\?v=`));

    const photo = await app.inject({ method: "GET", url: photoUrl, headers: user.headers });
    expect(photo.statusCode).toBe(200);
    expect(photo.headers["content-type"]).toBe("image/webp");
    const metadata = await sharp(photo.rawPayload).metadata();
    expect(metadata).toMatchObject({ format: "webp", width: 512, height: 512 });
  });

  it("applies the crop sent by the client", async () => {
    // Left half white, right half black: cropping the right half must give a black picture.
    const image = await sharp({ create: { width: 400, height: 200, channels: 3, background: "#ffffff" } })
      .composite([
        {
          input: { create: { width: 200, height: 200, channels: 3, background: "#000000" } },
          left: 200,
          top: 0,
        },
      ])
      .jpeg()
      .toBuffer();
    const response = await upload(image, { cropX: "200", cropY: "0", cropWidth: "200", cropHeight: "200" });
    expect(response.statusCode).toBe(200);

    const photo = await app.inject({ method: "GET", url: response.json().photoUrl, headers: user.headers });
    const { channels } = await sharp(photo.rawPayload).stats();
    expect(channels[0].mean).toBeLessThan(20);
  });

  it("rejects a crop outside the image or an incomplete crop", async () => {
    const image = await makeImage(300, 300);
    const outside = await upload(image, { cropX: "200", cropY: "0", cropWidth: "200", cropHeight: "200" });
    expect(outside.json().error.code).toBe("INVALID_CROP");
    const partial = await upload(image, { cropX: "0" });
    expect(partial.json().error.code).toBe("INVALID_CROP");
    expect(photoFiles()).toHaveLength(0);
  });

  it("rejects files that are not images", async () => {
    const response = await upload(Buffer.from("definitely not an image"));
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_IMAGE");
  });

  it("rejects an upload without the photo field", async () => {
    const missing = await upload(null, { note: "hi" });
    expect(missing.json().error.code).toBe("INVALID_UPLOAD");
    const wrongField = await upload(await makeImage(10, 10), {}, "picture");
    expect(wrongField.json().error.code).toBe("INVALID_UPLOAD");
  });

  it("deletes the old file when the picture is replaced", async () => {
    const first = await upload(await makeImage(100, 100));
    const second = await upload(await makeImage(200, 200));
    expect(second.json().photoUrl).not.toBe(first.json().photoUrl);
    expect(photoFiles()).toHaveLength(1);
  });

  it("removes the picture and its file", async () => {
    await upload(await makeImage(100, 100));
    const removed = await app.inject({ method: "DELETE", url: `/pets/${petId}/photo`, headers: user.headers });
    expect(removed.statusCode).toBe(204);
    expect(photoFiles()).toHaveLength(0);
    const pet = await app.inject({ method: "GET", url: `/pets/${petId}`, headers: user.headers });
    expect(pet.json().photoUrl).toBeNull();
  });

  it("deletes the picture file when the pet is deleted", async () => {
    await upload(await makeImage(100, 100));
    await app.inject({ method: "DELETE", url: `/pets/${petId}`, headers: user.headers });
    expect(photoFiles()).toHaveLength(0);
  });

  it("keeps pictures private to the household", async () => {
    const response = await upload(await makeImage(100, 100));
    const stranger = createTestUser(app, "Stranger");
    const photo = await app.inject({ method: "GET", url: response.json().photoUrl, headers: stranger.headers });
    expect(photo.statusCode).toBe(404);
    const noToken = await app.inject({ method: "GET", url: response.json().photoUrl });
    expect(noToken.statusCode).toBe(401);
  });
});
