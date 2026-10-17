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
  savedDietSchema,
  weightEntrySchema,
  weightInputSchema,
  weightParamsSchema,
  weightsResponseSchema,
} from "./schemas.js";
import {
  addWeight,
  contentStatus,
  deletePlan,
  deleteWeight,
  dietInfo,
  foodChangeTip,
  listWeights,
  petDiet,
  savePlan,
} from "./service.js";

/**
 * Diet and weight (spec 3). Portions come from the food package's feeding table; weights mostly
 * from vet visits in the passport.
 * - GET    /diets                          diet types with texts (?lang=fi|sv|en)
 * - POST   /diet/portion                   calculator without saving anything
 * - GET    /pets/:petId/diet               diet suggestions, plan, today's portion, weigh-in status
 * - PUT    /pets/:petId/diet               set or change the diet (food change → one-time tip)
 * - DELETE /pets/:petId/diet
 * - GET    /pets/:petId/weights            weigh-ins and trend
 * - POST   /pets/:petId/weights            the owner's own weigh-in (same day replaces)
 * - DELETE /pets/:petId/weights/:entryId   owner entries only; visit weights change in the passport
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
          packageForWeightKg: body.packageForWeightKg ?? body.weightKg,
          targetWeightKg: body.targetWeightKg ?? null,
          gramsPerScoop: body.gramsPerScoop ?? null,
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
        response: { 200: savedDietSchema },
      },
    },
    async (request) => {
      const pet = petFor(request, request.params.petId);
      const { foodChanged } = savePlan(app.db, pet, request.body);
      return {
        ...petDiet(app.db, pet, request.query.lang),
        foodChangeTip: foodChanged ? foodChangeTip(request.query.lang) : null,
      };
    },
  );

  app.delete("/pets/:petId/diet", { schema: { params: petParamsSchema } }, async (request, reply) => {
    deletePlan(app.db, petFor(request, request.params.petId).id);
    return reply.status(204).send();
  });

  app.get(
    "/pets/:petId/weights",
    { schema: { params: petParamsSchema, response: { 200: weightsResponseSchema } } },
    async (request) => listWeights(app.db, petFor(request, request.params.petId)),
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
