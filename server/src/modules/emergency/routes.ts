import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import { species } from "../../db/schema.js";
import { notFound } from "../../errors.js";
import { currentUser } from "../../plugins/auth.js";
import { petParamsSchema } from "../pets/schemas.js";
import { getPet } from "../pets/service.js";
import { symptomContent } from "../symptoms/content.js";
import { renderAssessment } from "../symptoms/service.js";
import { emergencyContent, firstAidSizes } from "./content.js";
import {
  assessWithHistory,
  contentEtag,
  contentStatus,
  knownAnswers,
  questionsFor,
  quickAssess,
  renderQuickResult,
  signsForApp,
  toQuestionDto,
  vetSummary,
} from "./service.js";

const languages = ["fi", "sv", "en"] as const;
const lang = z.enum(languages).default("fi");
const localized = z.object({ fi: z.string(), sv: z.string(), en: z.string() });
const contentStatusSchema = z.object({ status: z.enum(["sample", "reviewed"]), updatedOn: z.string() });

const topicSchema = z.object({
  id: z.string(),
  icon: z.string(),
  title: localized,
  when: localized,
  steps: z.array(z.object({ text: localized, bySize: z.partialRecord(z.enum(firstAidSizes), localized).optional() })),
  rhythmBpm: z.number().nullable(),
  updatedOn: z.string(),
  reviewed: z.boolean(),
});

const signSchema = z.object({ id: z.string(), label: localized, topicId: z.string().nullable() });

const questionSchema = z.object({
  id: z.string(),
  text: z.string(),
  /** The answer that means danger */
  dangerAnswer: z.boolean(),
  topicId: z.string().nullable(),
});

const answersSchema = z.record(z.string(), z.boolean());

const resultSchema = z.object({
  level: z.enum(["callNow", "goNow", "monitor"]),
  title: z.string(),
  body: z.string(),
  callEmergencyClinic: z.boolean(),
  showEmergencyClinics: z.boolean(),
  logSymptoms: z.boolean(),
  openKnowledgeBase: z.boolean(),
  guides: z.array(z.object({ id: z.string(), title: z.string() })),
  triggered: z.array(z.object({ questionId: z.string(), text: z.string(), level: z.enum(["callNow", "goNow"]) })),
  unanswered: z.array(z.string()),
  disclaimer: z.string(),
});

const summarySchema = z.object({
  pet: z.object({
    name: z.string(),
    species: z.enum(species),
    breed: z.string().nullable(),
    ageMonths: z.number().nullable(),
    weightKg: z.number().nullable(),
  }),
  symptoms: z.array(z.object({ id: z.string(), label: z.string() })),
  medications: z.array(z.object({ name: z.string(), dosage: z.string().nullable() })),
  allergies: z.array(z.object({ allergen: z.string(), severity: z.string() })),
  conditions: z.array(z.object({ diagnosis: z.string(), date: z.string() })),
  surgeries: z.array(z.object({ name: z.string(), date: z.string() })),
  exposures: z.array(
    z.object({ substance: z.string(), hoursAgo: z.number(), riskLevel: z.string(), amount: z.number().nullable() }),
  ),
  text: z.string(),
});

const historySchema = z.object({
  level: z.enum(["normal", "monitor", "contactVet", "emergency"]),
  reasons: z.array(z.object({ code: z.string(), level: z.string(), text: z.string() })),
});

/**
 * Guides are read in emergencies, maybe with a weak signal: they can be cached for a day, and
 * a client that sends the ETag back gets a quick 304 if nothing changed.
 */
const cacheable = (request: FastifyRequest, reply: FastifyReply) => {
  reply.header("cache-control", "public, max-age=86400").header("etag", contentEtag);
  return request.headers["if-none-match"] === contentEtag;
};

/**
 * Emergency help (spec 6). Public: nothing here asks for sign-in. Registered under /emergency.
 * - GET  /emergency/first-aid             guides by topic, steps by size (cat, small dog, large dog)
 * - GET  /emergency/first-aid/:topicId
 * - GET  /emergency/signs                 signs that always mean: go to a vet now
 * - GET  /emergency/questions?species=    stage 1 yes/no questions
 * - POST /emergency/assess                answers → call now / go now / monitor, and guides to open
 */
export const emergencyRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/first-aid",
    {
      schema: {
        response: {
          200: z.object({ content: contentStatusSchema, disclaimer: localized, topics: z.array(topicSchema) }),
          304: z.void(),
        },
      },
    },
    async (request, reply) => {
      if (cacheable(request, reply)) {
        return reply.status(304).send();
      }
      return { content: contentStatus(), disclaimer: emergencyContent.disclaimer, topics: emergencyContent.topics };
    },
  );

  app.get(
    "/first-aid/:topicId",
    {
      schema: {
        params: z.object({ topicId: z.string() }),
        response: { 200: z.object({ content: contentStatusSchema, topic: topicSchema }), 304: z.void() },
      },
    },
    async (request, reply) => {
      const topic = emergencyContent.topics.find((t) => t.id === request.params.topicId);
      if (!topic) {
        throw notFound("TOPIC_NOT_FOUND", "No such first aid guide");
      }
      if (cacheable(request, reply)) {
        return reply.status(304).send();
      }
      return { content: contentStatus(), topic };
    },
  );

  app.get(
    "/signs",
    { schema: { response: { 200: z.object({ content: contentStatusSchema, signs: z.array(signSchema) }), 304: z.void() } } },
    async (request, reply) => {
      if (cacheable(request, reply)) {
        return reply.status(304).send();
      }
      return { content: contentStatus(), signs: signsForApp() };
    },
  );

  app.get(
    "/questions",
    {
      schema: {
        querystring: z.object({ species: z.enum(species).optional(), lang }),
        response: { 200: z.object({ content: contentStatusSchema, questions: z.array(questionSchema) }) },
      },
    },
    async (request) => ({
      content: contentStatus(),
      questions: questionsFor(request.query.species).map((q) => toQuestionDto(q, request.query.lang)),
    }),
  );

  app.post(
    "/assess",
    {
      schema: {
        querystring: z.object({ lang }),
        body: z.object({ species: z.enum(species), answers: answersSchema }),
        response: { 200: resultSchema },
      },
    },
    async (request) => {
      const { species: petSpecies, answers } = request.body;
      return renderQuickResult(petSpecies, quickAssess(petSpecies, answers), request.query.lang);
    },
  );
};

/**
 * Emergency mode for one of the user's pets: the species, history and passport are known, so
 * there are fewer questions, the instruction uses the pet's history (spec 12) and a summary for
 * the vet comes with it. Registered under /pets.
 * - GET  /pets/:petId/emergency/questions   questions for its species, with answers already known
 * - POST /pets/:petId/emergency/assess      instruction + history reasons + summary for the vet
 * - GET  /pets/:petId/emergency/summary?symptoms=seizures,vomiting
 */
export const petEmergencyRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get(
    "/:petId/emergency/questions",
    {
      schema: {
        params: petParamsSchema,
        querystring: z.object({ lang }),
        response: {
          200: z.object({
            content: contentStatusSchema,
            questions: z.array(questionSchema),
            /** Already answered from the pet's history; skip these questions */
            known: answersSchema,
            knownReasons: z.array(z.object({ questionId: z.string(), text: z.string() })),
          }),
        },
      },
    },
    async (request) => {
      const pet = getPet(app.db, currentUser(request).householdId, request.params.petId);
      const known = knownAnswers(app.db, pet, request.query.lang);
      return {
        content: contentStatus(),
        questions: questionsFor(pet.species)
          .filter((q) => !(q.id in known.answers))
          .map((q) => toQuestionDto(q, request.query.lang)),
        known: known.answers,
        knownReasons: known.reasons,
      };
    },
  );

  app.post(
    "/:petId/emergency/assess",
    {
      schema: {
        params: petParamsSchema,
        querystring: z.object({ lang }),
        body: z.object({ answers: answersSchema }),
        response: { 200: resultSchema.extend({ history: historySchema, summary: summarySchema }) },
      },
    },
    async (request) => {
      const { lang: language } = request.query;
      const pet = getPet(app.db, currentUser(request).householdId, request.params.petId);
      const answers = { ...knownAnswers(app.db, pet, language).answers, ...request.body.answers };
      const { result, assessment } = assessWithHistory(app.db, pet, quickAssess(pet.species, answers));
      const rendered = renderAssessment(assessment, language);
      const symptoms = assessment.symptoms;
      return {
        ...renderQuickResult(pet.species, result, language),
        history: { level: rendered.level, reasons: rendered.reasons },
        summary: vetSummary(app.db, pet, symptoms, language),
      };
    },
  );

  app.get(
    "/:petId/emergency/summary",
    {
      schema: {
        params: petParamsSchema,
        querystring: z.object({ lang, symptoms: z.string().max(500).optional() }),
        response: { 200: summarySchema },
      },
    },
    async (request) => {
      const pet = getPet(app.db, currentUser(request).householdId, request.params.petId);
      const known = new Set(symptomContent.symptoms.map((s) => s.id));
      const symptoms = (request.query.symptoms ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => known.has(s));
      return vetSummary(app.db, pet, symptoms, request.query.lang);
    },
  );
};
