import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { currentUser } from "../../plugins/auth.js";
import { deletePetPhotoFile } from "../pet-photos/service.js";
import { createPetSchema, petParamsSchema, petSchema, updatePetSchema } from "./schemas.js";
import { createPet, deletePet, getPet, listPets, toPetDto, updatePet } from "./service.js";

// Basic pet records for the signed-in user's household. Every route requires an access token.
export const petRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/", { schema: { response: { 200: z.object({ pets: z.array(petSchema) }) } } }, async (request) => {
    const { householdId } = currentUser(request);
    return { pets: listPets(app.db, householdId).map(toPetDto) };
  });

  app.post(
    "/",
    { schema: { body: createPetSchema, response: { 201: petSchema } } },
    async (request, reply) => {
      const { householdId } = currentUser(request);
      return reply.status(201).send(toPetDto(createPet(app.db, householdId, request.body)));
    },
  );

  app.get(
    "/:petId",
    { schema: { params: petParamsSchema, response: { 200: petSchema } } },
    async (request) => {
      const { householdId } = currentUser(request);
      return toPetDto(getPet(app.db, householdId, request.params.petId));
    },
  );

  app.patch(
    "/:petId",
    { schema: { params: petParamsSchema, body: updatePetSchema, response: { 200: petSchema } } },
    async (request) => {
      const { householdId } = currentUser(request);
      return toPetDto(updatePet(app.db, householdId, request.params.petId, request.body));
    },
  );

  app.delete("/:petId", { schema: { params: petParamsSchema } }, async (request, reply) => {
    const { householdId } = currentUser(request);
    const deleted = deletePet(app.db, householdId, request.params.petId);
    await deletePetPhotoFile(app.config.UPLOAD_DIR, deleted.photoKey);
    return reply.status(204).send();
  });
};
