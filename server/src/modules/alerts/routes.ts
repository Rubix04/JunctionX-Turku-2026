import { eq } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { type PushDeviceRow, pushDevices, type Species } from "../../db/schema.js";
import { notFound } from "../../errors.js";
import { currentUser } from "../../plugins/auth.js";
import { ageInMonths } from "../diet/calculations.js";
import { findSubstance } from "../knowledge/content.js";
import { todayInFinland } from "../passport/service.js";
import { petParamsSchema } from "../pets/schemas.js";
import { getPet } from "../pets/service.js";
import { type AlertCard, alertsContent, type Region } from "./content.js";
import {
  cardDetailSchema,
  cardParamsSchema,
  cardsQuerySchema,
  cardsResponseSchema,
  currentQuerySchema,
  deviceInputSchema,
  deviceSchema,
  languages,
  langQuerySchema,
  matchRequestSchema,
  matchResponseSchema,
  petAlertsQuerySchema,
  symptomTagsSchema,
} from "./schemas.js";
import { activeCards, activeWindow, matchSymptoms, notesFor, regionFor } from "./season.js";

type Language = (typeof languages)[number];

const contentStatus = () => ({ status: alertsContent.meta.status, updatedOn: alertsContent.meta.updatedOn });

const toCardDto = (
  card: AlertCard,
  lang: Language,
  activeUntil: string | null,
  pet?: { species?: Species; ageMonths?: number | null },
) => ({
  id: card.id,
  season: card.season,
  species: card.species,
  title: card.title[lang],
  risk: card.risk[lang],
  prevention: card.prevention[lang],
  watchFor: card.watchFor[lang],
  ifHappens: card.ifHappens[lang],
  notes: notesFor(card, pet?.species, pet?.ageMonths).map((note) => note[lang]),
  symptomTags: card.symptomTags,
  relatedSubstances: card.relatedSubstances.map((id) => ({ id, name: findSubstance(id)?.names[lang][0] ?? id })),
  activeUntil,
});

const resolveWhere = (query: { lat?: number; region?: Region; date?: string }) => ({
  region: query.region ?? regionFor(query.lat),
  date: query.date ?? todayInFinland(),
});

/**
 * Seasonal alerts (spec 9). Public content, like the knowledge base.
 * - GET  /alerts/current?lat=60.45&species=dog&ageMonths=30   cards active now (home screen)
 * - GET  /alerts/cards                                        all cards, e.g. for an alerts tab
 * - GET  /alerts/cards/:cardId
 * - GET  /alerts/symptom-tags                                 shared tags for the symptom log
 * - POST /alerts/match                                        symptom log entry → matching alerts
 */
export const alertsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/current",
    { schema: { querystring: currentQuerySchema, response: { 200: cardsResponseSchema } } },
    async (request) => {
      const { species, ageMonths, lang } = request.query;
      const where = resolveWhere(request.query);
      return {
        content: contentStatus(),
        ...where,
        cards: activeCards(alertsContent, { ...where, species }).map(({ card, endsOn }) =>
          toCardDto(card, lang, endsOn, { species, ageMonths }),
        ),
      };
    },
  );

  app.get(
    "/cards",
    { schema: { querystring: cardsQuerySchema, response: { 200: cardsResponseSchema } } },
    async (request) => {
      const { species, lang } = request.query;
      const where = resolveWhere(request.query);
      return {
        content: contentStatus(),
        ...where,
        cards: alertsContent.cards
          .filter((card) => !species || card.species.includes(species))
          .map((card) => toCardDto(card, lang, activeWindow(card, where.region, where.date)?.endsOn ?? null, { species })),
      };
    },
  );

  app.get(
    "/cards/:cardId",
    { schema: { params: cardParamsSchema, querystring: langQuerySchema, response: { 200: cardDetailSchema } } },
    async (request) => {
      const card = alertsContent.cards.find((c) => c.id === request.params.cardId);
      if (!card) {
        throw notFound("ALERT_NOT_FOUND", "No such seasonal alert");
      }
      const window = activeWindow(card, "south", todayInFinland());
      return { content: contentStatus(), card: toCardDto(card, request.query.lang, window?.endsOn ?? null) };
    },
  );

  app.get("/symptom-tags", { schema: { response: { 200: symptomTagsSchema } } }, async () => ({
    symptomTags: alertsContent.symptomTags,
  }));

  app.post(
    "/match",
    { schema: { body: matchRequestSchema, response: { 200: matchResponseSchema } } },
    async (request) => {
      const { symptomTags, species, ageMonths, lang } = request.body;
      const where = resolveWhere(request.body);
      return {
        content: contentStatus(),
        matches: matchSymptoms(alertsContent, { ...where, species }, symptomTags).map((match) => ({
          card: toCardDto(match.card, lang, match.endsOn, { species, ageMonths }),
          matchedTags: match.matchedTags,
        })),
      };
    },
  );
};

/** GET /pets/:petId/alerts: active cards for this pet's species and age. */
export const petAlertsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get(
    "/:petId/alerts",
    { schema: { params: petParamsSchema, querystring: petAlertsQuerySchema, response: { 200: cardsResponseSchema } } },
    async (request) => {
      const pet = getPet(app.db, currentUser(request).householdId, request.params.petId);
      const where = resolveWhere(request.query);
      const petInfo = { species: pet.species, ageMonths: ageInMonths(pet.birthDate, where.date) };
      return {
        content: contentStatus(),
        ...where,
        cards: activeCards(alertsContent, { ...where, species: pet.species }).map(({ card, endsOn }) =>
          toCardDto(card, request.query.lang, endsOn, petInfo),
        ),
      };
    },
  );
};

const roundCoordinate = (value: number | null | undefined) =>
  value === null || value === undefined ? null : Math.round(value * 10) / 10;

const toDeviceDto = (device: PushDeviceRow) => ({
  platform: device.platform,
  language: device.language,
  latitude: device.latitude,
  longitude: device.longitude,
  region: regionFor(device.latitude),
  seasonalAlerts: device.seasonalAlerts,
  updatedAt: device.updatedAt,
});

/**
 * Push registration for the signed-in device (one per device session).
 * - PUT    /notifications/device   register or update token, language, location, opt-in
 * - GET    /notifications/device
 * - DELETE /notifications/device
 */
export const notificationRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("preHandler", app.authenticate);

  const findDevice = (sessionId: string) =>
    app.db.select().from(pushDevices).where(eq(pushDevices.sessionId, sessionId)).get();

  app.put("/device", { schema: { body: deviceInputSchema, response: { 200: deviceSchema } } }, async (request) => {
    const { sessionId } = currentUser(request);
    const values = {
      expoPushToken: request.body.expoPushToken,
      platform: request.body.platform,
      language: request.body.language,
      latitude: roundCoordinate(request.body.latitude),
      longitude: roundCoordinate(request.body.longitude),
      seasonalAlerts: request.body.seasonalAlerts,
      updatedAt: Date.now(),
    };
    const device = app.db
      .insert(pushDevices)
      .values({ sessionId, ...values })
      .onConflictDoUpdate({ target: pushDevices.sessionId, set: values })
      .returning()
      .get();
    return toDeviceDto(device);
  });

  app.get("/device", { schema: { response: { 200: deviceSchema } } }, async (request) => {
    const device = findDevice(currentUser(request).sessionId);
    if (!device) {
      throw notFound("DEVICE_NOT_REGISTERED", "Push notifications are not set up on this device");
    }
    return toDeviceDto(device);
  });

  app.delete("/device", async (request, reply) => {
    app.db.delete(pushDevices).where(eq(pushDevices.sessionId, currentUser(request).sessionId)).run();
    return reply.status(204).send();
  });
};
