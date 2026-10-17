import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { species } from "../../db/schema.js";
import { badRequest, notFound } from "../../errors.js";
import { clinicRegistry } from "./content.js";
import { expertiseList, findClinics } from "./service.js";

const lang = z.enum(["fi", "sv", "en"]).default("fi");

/** The phone's location. It is only used for this request, never stored. */
const whereSchema = {
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  lang,
};

const listQuerySchema = z.object({
  ...whereSchema,
  openNow: z.stringbool().optional(),
  /** 24-hour emergency clinics only */
  emergency: z.stringbool().optional(),
  /** Contracted with the insurer only */
  contracted: z.stringbool().optional(),
  species: z.enum(species).optional(),
  expertise: z.string().optional(),
  maxKm: z.coerce.number().positive().max(500).optional(),
});

const dayHours = z.object({ open: z.string(), close: z.string() }).nullable();

const clinicSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  phone: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  distanceKm: z.number(),
  driveMinutes: z.number(),
  /** Position on the schematic map, 0–1 */
  mapX: z.number(),
  mapY: z.number(),
  contracted: z.boolean(),
  directPayment: z.boolean(),
  emergency24h: z.boolean(),
  species: z.array(z.enum(species)),
  expertise: z.array(z.string()),
  expertiseIds: z.array(z.string()),
  /** Monday first */
  hours: z.array(dayHours),
  bookingUrl: z.string().nullable(),
  openNow: z.boolean(),
  hoursToday: dayHours,
  closesAt: z.string().nullable(),
  opensAt: z.object({ daysFromToday: z.number(), time: z.string() }).nullable(),
});

const listResponseSchema = z.object({
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    source: z.enum(["device", "default"]),
    mapX: z.number(),
    mapY: z.number(),
  }),
  registry: z.object({ status: z.enum(["sample", "registry"]), updatedOn: z.string() }),
  clinics: z.array(clinicSchema),
});

const locationOf = (query: { lat?: number; lng?: number }) => {
  if ((query.lat === undefined) !== (query.lng === undefined)) {
    throw badRequest("INVALID_LOCATION", "Send both lat and lng, or neither");
  }
  return query.lat === undefined || query.lng === undefined ? null : { latitude: query.lat, longitude: query.lng };
};

/**
 * Contracted vets and emergency clinics (spec 7). Public: emergency mode works without
 * signing in. Registered under /clinics. Open clinics come first, then by distance.
 * - GET /clinics?lat=&lng=&openNow=&emergency=&contracted=&species=&expertise=&maxKm=
 * - GET /clinics/emergency?lat=&lng=      24-hour emergency clinics, open and nearest first
 * - GET /clinics/expertise                for the special expertise filter
 * - GET /clinics/:clinicId?lat=&lng=      the clinic card
 */
export const clinicRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/", { schema: { querystring: listQuerySchema, response: { 200: listResponseSchema } } }, async (request) => {
    const { lat, lng, lang: language, ...filters } = request.query;
    return findClinics(locationOf({ lat, lng }), filters, language);
  });

  app.get(
    "/emergency",
    { schema: { querystring: z.object(whereSchema), response: { 200: listResponseSchema } } },
    async (request) => findClinics(locationOf(request.query), { emergency: true }, request.query.lang),
  );

  app.get(
    "/expertise",
    {
      schema: {
        querystring: z.object({ lang }),
        response: { 200: z.object({ expertise: z.array(z.object({ id: z.string(), label: z.string(), count: z.number() })) }) },
      },
    },
    async (request) => ({ expertise: expertiseList(request.query.lang) }),
  );

  app.get(
    "/:clinicId",
    {
      schema: {
        params: z.object({ clinicId: z.string() }),
        querystring: z.object(whereSchema),
        response: { 200: clinicSchema },
      },
    },
    async (request) => {
      if (!clinicRegistry.clinics.some((c) => c.id === request.params.clinicId)) {
        throw notFound("CLINIC_NOT_FOUND", "No such clinic");
      }
      const { clinics } = findClinics(locationOf(request.query), {}, request.query.lang);
      return clinics.find((c) => c.id === request.params.clinicId)!;
    },
  );
};
