import multipart from "@fastify/multipart";
import { eq } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { pets } from "../../db/schema.js";
import { badRequest, notFound } from "../../errors.js";
import { currentUser } from "../../plugins/auth.js";
import { petParamsSchema, petSchema } from "../pets/schemas.js";
import { getPet, toPetDto } from "../pets/service.js";
import { type Crop, deletePetPhotoFile, readPetPhoto, storePetPhoto } from "./service.js";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const cropSchema = z.object({
  cropX: z.coerce.number().int().min(0),
  cropY: z.coerce.number().int().min(0),
  cropWidth: z.coerce.number().int().min(1),
  cropHeight: z.coerce.number().int().min(1),
});

/**
 * Pet profile pictures (spec 13). Registered under /pets.
 * - PUT    /pets/:petId/photo  multipart/form-data: `photo` file, optional cropX/cropY/cropWidth/cropHeight
 * - GET    /pets/:petId/photo  the image (send the access token; expo-image supports `headers`)
 * - DELETE /pets/:petId/photo  back to the species default picture, file deleted from storage
 */
export const petPhotoRoutes: FastifyPluginAsyncZod = async (app) => {
  await app.register(multipart, { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 10 } });
  app.addHook("preHandler", app.authenticate);
  const uploadDir = app.config.UPLOAD_DIR;

  app.put(
    "/:petId/photo",
    { schema: { params: petParamsSchema, response: { 200: petSchema } } },
    async (request) => {
      const { householdId } = currentUser(request);
      const pet = getPet(app.db, householdId, request.params.petId);

      let upload: Buffer | null = null;
      const fields: Record<string, string> = {};
      for await (const part of request.parts()) {
        if (part.type === "file") {
          if (part.fieldname !== "photo") {
            throw badRequest("INVALID_UPLOAD", "Send the image in a field named 'photo'");
          }
          upload = await part.toBuffer();
        } else if (typeof part.value === "string") {
          fields[part.fieldname] = part.value;
        }
      }
      if (!upload) {
        throw badRequest("INVALID_UPLOAD", "Send the image in a field named 'photo'");
      }

      let crop: Crop | undefined;
      if (Object.keys(fields).some((name) => name.startsWith("crop"))) {
        const parsed = cropSchema.safeParse(fields);
        if (!parsed.success) {
          throw badRequest("INVALID_CROP", "Send all of cropX, cropY, cropWidth and cropHeight as whole pixels");
        }
        const { cropX, cropY, cropWidth, cropHeight } = parsed.data;
        crop = { x: cropX, y: cropY, width: cropWidth, height: cropHeight };
      }

      const key = await storePetPhoto(uploadDir, upload, crop);
      let updated;
      try {
        updated = app.db.update(pets).set({ photoKey: key }).where(eq(pets.id, pet.id)).returning().get();
      } catch (error) {
        await deletePetPhotoFile(uploadDir, key);
        throw error;
      }
      await deletePetPhotoFile(uploadDir, pet.photoKey);
      return toPetDto(updated);
    },
  );

  app.get("/:petId/photo", { schema: { params: petParamsSchema } }, async (request, reply) => {
    const pet = getPet(app.db, currentUser(request).householdId, request.params.petId);
    if (!pet.photoKey) {
      throw notFound("PHOTO_NOT_FOUND", "This pet has no profile picture");
    }
    // The URL changes with every new picture (see photoUrl), so it can be cached for good.
    return reply
      .type("image/webp")
      .header("cache-control", "private, max-age=31536000, immutable")
      .send(readPetPhoto(uploadDir, pet.photoKey));
  });

  app.delete("/:petId/photo", { schema: { params: petParamsSchema } }, async (request, reply) => {
    const pet = getPet(app.db, currentUser(request).householdId, request.params.petId);
    app.db.update(pets).set({ photoKey: null }).where(eq(pets.id, pet.id)).run();
    await deletePetPhotoFile(uploadDir, pet.photoKey);
    return reply.status(204).send();
  });
};
