import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { dietTypes } from "../../db/schema.js";
import { currentUser } from "../../plugins/auth.js";
import { petParamsSchema } from "../pets/schemas.js";
import { getPet } from "../pets/service.js";
import { calculatePortion } from "./calculations.js";
import {
  dietCatalogSchema,
  dietPlanInputSchema,
  languageQuerySchema,
  petDietSchema,
  portionRequestSchema,
  portionResponseSchema,
  suggestionsSchema,
  weightEntrySchema,
  weightInputSchema,
  weightParamsSchema,
  weightQuerySchema,
  weightsResponseSchema,
} from "./schemas.js";
import {
  addWeight,
  contentStatus,
  deletePlan,
  deleteWeight,
  dietInfo,
  dietSuggestions,
  listWeights,
  petDiet,
  savePlan,
} from "./service.js";

/**
 * Diet and weight (spec 3).
 * - GET    /diets                          diet types with texts (?lang=fi|sv|en)
 * - POST   /diet/portion                   calculator without saving anything
 * - GET    /pets/:petId/diet               plan, portion for today's weight, food change mix
 * - PUT    /pets/:petId/diet               set or change the diet; a new food starts a 7-day switch
 * - DELETE /pets/:petId/diet
 * - GET    /pets/:petId/diet/suggestions   diets to discuss with the vet, from the passport
 * - GET    /pets/:petId/weights            entries + summary for the chart (?days=90)
 * - POST   /pets/:petId/weights            log a weight (same day replaces)
 * - DELETE /pets/:petId/weights/:entryId
 */
export const dietRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("preHandler", app.authenticate);

  const petFor = (request: Parameters<typeof currentUser>[0], petId: string) =>
    getPet(app.db, currentUser(request).householdId, petId);

  app.get(
    "/diets",
    { schema: { querystring: languageQuerySchema, response: { 200: dietCatalogSchema } } },
    async (request) => ({
      content: contentStatus(),
      diets: dietTypes.map((dietType) => dietInfo(dietType, request.query.lang)),
    }),
  );

  app.post(
    "/diet/portion",
    { schema: { body: portionRequestSchema, response: { 200: portionResponseSchema } } },
    async (request) => {
      const body = request.body;
      return {
        content: contentStatus(),
        portion: calculatePortion({
          ...body,
          ageMonths: body.ageMonths ?? null,
          neutered: body.neutered ?? null,
          targetWeightKg: body.targetWeightKg ?? null,
          kcalPer100g: body.kcalPer100g ?? null,
        }),
      };
    },
  );

  app.get(
    "/pets/:petId/diet",
    { schema: { params: petParamsSchema, querystring: languageQuerySchema, response: { 200: petDietSchema } } },
    async (request) => petDiet(app.db, petFor(request, request.params.petId), request.query.lang),
  );

  app.put(
    "/pets/:petId/diet",
    {
      schema: {
        params: petParamsSchema,
        querystring: languageQuerySchema,
        body: dietPlanInputSchema,
        response: { 200: petDietSchema },
      },
    },
    async (request) => {
      const pet = petFor(request, request.params.petId);
      savePlan(app.db, pet.id, request.body);
      return petDiet(app.db, pet, request.query.lang);
    },
  );

  app.delete("/pets/:petId/diet", { schema: { params: petParamsSchema } }, async (request, reply) => {
    deletePlan(app.db, petFor(request, request.params.petId).id);
    return reply.status(204).send();
  });

  app.get(
    "/pets/:petId/diet/suggestions",
    { schema: { params: petParamsSchema, querystring: languageQuerySchema, response: { 200: suggestionsSchema } } },
    async (request) => dietSuggestions(app.db, petFor(request, request.params.petId), request.query.lang),
  );

  app.get(
    "/pets/:petId/weights",
    { schema: { params: petParamsSchema, querystring: weightQuerySchema, response: { 200: weightsResponseSchema } } },
    async (request) => listWeights(app.db, petFor(request, request.params.petId), request.query.days),
  );

  app.post(
    "/pets/:petId/weights",
    { schema: { params: petParamsSchema, body: weightInputSchema, response: { 201: weightEntrySchema } } },
    async (request, reply) => {
      const pet = petFor(request, request.params.petId);
      return reply.status(201).send(addWeight(app.db, pet.id, request.body));
    },
  );

  app.delete("/pets/:petId/weights/:entryId", { schema: { params: weightParamsSchema } }, async (request, reply) => {
    const pet = petFor(request, request.params.petId);
    deleteWeight(app.db, pet.id, request.params.entryId);
    return reply.status(204).send();
  });
};
