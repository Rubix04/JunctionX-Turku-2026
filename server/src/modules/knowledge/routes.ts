import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { currentUser } from "../../plugins/auth.js";
import { petParamsSchema } from "../pets/schemas.js";
import { getPet } from "../pets/service.js";
import { assessExposure } from "./assessment.js";
import {
  assessRequestSchema,
  assessResponseSchema,
  categoriesResponseSchema,
  exposureInputSchema,
  exposureResponseSchema,
  exposuresListSchema,
  langQuerySchema,
  searchQuerySchema,
  searchResponseSchema,
  substanceDetailSchema,
  substanceParamsSchema,
} from "./schemas.js";
import {
  contentStatus,
  getSubstance,
  listCategories,
  listExposures,
  recordExposure,
  search,
  substanceDetail,
} from "./service.js";

/**
 * Knowledge base of dangerous substances (spec 10). Public, no sign-in, because it is used
 * in emergencies (spec 6).
 * - GET  /knowledge/substances?q=lilja&species=cat&lang=fi   search or browse
 * - GET  /knowledge/categories
 * - GET  /knowledge/substances/:substanceId                 details and first aid
 * - POST /knowledge/assess                                  "My pet ate this" without an account
 */
export const knowledgeRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/substances",
    { schema: { querystring: searchQuerySchema, response: { 200: searchResponseSchema } } },
    async (request) => search(request.query),
  );

  app.get(
    "/categories",
    { schema: { querystring: langQuerySchema, response: { 200: categoriesResponseSchema } } },
    async (request) => listCategories(request.query.lang),
  );

  app.get(
    "/substances/:substanceId",
    {
      schema: { params: substanceParamsSchema, querystring: langQuerySchema, response: { 200: substanceDetailSchema } },
    },
    async (request) => substanceDetail(request.params.substanceId, request.query.lang),
  );

  app.post(
    "/assess",
    { schema: { body: assessRequestSchema, response: { 200: assessResponseSchema } } },
    async (request) => {
      const { substanceId, ...input } = request.body;
      return {
        content: contentStatus(),
        assessment: assessExposure(getSubstance(substanceId), { ...input, weightKg: input.weightKg ?? null }),
      };
    },
  );
};

/**
 * "My pet ate this" for a signed-in user: uses the pet's species and weight, saves the event
 * to the pet's history and returns a summary for the vet.
 * - POST /pets/:petId/exposures
 * - GET  /pets/:petId/exposures
 */
export const exposureRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.post(
    "/:petId/exposures",
    {
      schema: {
        params: petParamsSchema,
        querystring: langQuerySchema,
        body: exposureInputSchema,
        response: { 201: exposureResponseSchema },
      },
    },
    async (request, reply) => {
      const { householdId, userId } = currentUser(request);
      const pet = getPet(app.db, householdId, request.params.petId);
      return reply.status(201).send(recordExposure(app.db, pet, userId, request.body, request.query.lang));
    },
  );

  app.get(
    "/:petId/exposures",
    { schema: { params: petParamsSchema, querystring: langQuerySchema, response: { 200: exposuresListSchema } } },
    async (request) => {
      const pet = getPet(app.db, currentUser(request).householdId, request.params.petId);
      return listExposures(app.db, pet.id, request.query.lang);
    },
  );
};
