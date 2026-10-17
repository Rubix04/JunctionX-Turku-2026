import { eq } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { type PassportShareRow, type PetRow, pets } from "../../db/schema.js";
import { notFound } from "../../errors.js";
import { currentUser } from "../../plugins/auth.js";
import { syncPetWeight, syncVisitWeight } from "../diet/service.js";
import { petParamsSchema } from "../pets/schemas.js";
import { getPet, toPetDto } from "../pets/service.js";
import { syncVaccinationReminders } from "../care/service.js";
import { startWatchListsForRecord } from "../symptoms/service.js";
import { kindForSection } from "./records.js";
import {
  createdShareSchema,
  createShareSchema,
  passportSchema,
  recordBodySchema,
  recordParamsSchema,
  recordSchema,
  sectionParamsSchema,
  shareParamsSchema,
  shareSchema,
  sharedPassportSchema,
  sharedTokenParamsSchema,
  type ShareLanguage,
} from "./schemas.js";
import {
  createRecord,
  createShare,
  deleteRecord,
  groupPassport,
  isShareActive,
  listRecords,
  listShares,
  openShare,
  revokeShare,
  toRecordDto,
  updateRecord,
} from "./service.js";
import { renderSharedPassportPage } from "./share-page.js";

const toShareDto = (share: PassportShareRow) => ({
  id: share.id,
  recipientType: share.recipientType,
  recipientName: share.recipientName,
  sections: share.sections,
  language: share.language,
  createdAt: share.createdAt,
  expiresAt: share.expiresAt,
  revokedAt: share.revokedAt,
  accessCount: share.accessCount,
  lastAccessedAt: share.lastAccessedAt,
  active: isShareActive(share),
});

/**
 * The owner's side of the health passport (spec 4). Registered under /pets.
 * - GET    /pets/:petId/passport                       everything in one response
 * - POST   /pets/:petId/passport/:section               add (section: vaccinations, medications,
 * - PATCH  /pets/:petId/passport/:section/:recordId       allergies, surgeries, visits)
 * - DELETE /pets/:petId/passport/:section/:recordId
 * - POST   /pets/:petId/passport/shares                 share link for a vet / pet care
 * - GET    /pets/:petId/passport/shares                 links and how often they were opened
 * - DELETE /pets/:petId/passport/shares/:shareId        stop sharing
 */
export const passportRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("preHandler", app.authenticate);

  const petFor = (request: Parameters<typeof currentUser>[0], petId: string): PetRow =>
    getPet(app.db, currentUser(request).householdId, petId);

  app.get(
    "/:petId/passport",
    { schema: { params: petParamsSchema, response: { 200: passportSchema } } },
    async (request) => {
      const pet = petFor(request, request.params.petId);
      const passport = groupPassport(listRecords(app.db, pet.id));
      return { pet: toPetDto(pet), ...passport } as z.infer<typeof passportSchema>;
    },
  );

  // Static "shares" routes are matched before the :section routes below.
  app.post(
    "/:petId/passport/shares",
    { schema: { params: petParamsSchema, body: createShareSchema, response: { 201: createdShareSchema } } },
    async (request, reply) => {
      const pet = petFor(request, request.params.petId);
      const { share, token } = createShare(app.db, pet, currentUser(request).userId, request.body);
      const baseUrl = app.config.PUBLIC_BASE_URL ?? `${request.protocol}://${request.host}`;
      return reply.status(201).send({ ...toShareDto(share), url: `${baseUrl}/shared/passports/${token}` });
    },
  );

  app.get(
    "/:petId/passport/shares",
    { schema: { params: petParamsSchema, response: { 200: z.object({ shares: z.array(shareSchema) }) } } },
    async (request) => {
      const pet = petFor(request, request.params.petId);
      return { shares: listShares(app.db, pet.id).map(toShareDto) };
    },
  );

  app.delete("/:petId/passport/shares/:shareId", { schema: { params: shareParamsSchema } }, async (request, reply) => {
    const pet = petFor(request, request.params.petId);
    revokeShare(app.db, pet.id, request.params.shareId);
    return reply.status(204).send();
  });

  app.post(
    "/:petId/passport/:section",
    { schema: { params: sectionParamsSchema, body: recordBodySchema, response: { 201: recordSchema } } },
    async (request, reply) => {
      const pet = petFor(request, request.params.petId);
      const row = createRecord(app.db, pet.id, kindForSection[request.params.section], request.body);
      syncVisitWeight(app.db, row);
      // A new diagnosis or surgery starts its watch list (spec 1); see GET /pets/:petId/watch-lists.
      startWatchListsForRecord(app.db, pet, row, currentUser(request).userId);
      if (row.kind === "vaccination") {
        syncVaccinationReminders(app.db, pet.id, currentUser(request).userId);
      }
      return reply.status(201).send(toRecordDto(row) as z.infer<typeof recordSchema>);
    },
  );

  app.patch(
    "/:petId/passport/:section/:recordId",
    { schema: { params: recordParamsSchema, body: recordBodySchema, response: { 200: recordSchema } } },
    async (request) => {
      const { petId, section, recordId } = request.params;
      const pet = petFor(request, petId);
      const row = updateRecord(app.db, pet.id, kindForSection[section], recordId, request.body);
      syncVisitWeight(app.db, row);
      if (row.kind === "vaccination") {
        syncVaccinationReminders(app.db, pet.id, currentUser(request).userId);
      }
      return toRecordDto(row) as z.infer<typeof recordSchema>;
    },
  );

  app.delete(
    "/:petId/passport/:section/:recordId",
    { schema: { params: recordParamsSchema } },
    async (request, reply) => {
      const { petId, section, recordId } = request.params;
      const pet = petFor(request, petId);
      deleteRecord(app.db, pet.id, kindForSection[section], recordId);
      if (section === "vaccinations") {
        // An older dose of the same vaccine may need its reminder back.
        syncVaccinationReminders(app.db, pet.id, currentUser(request).userId);
      }
      // A visit's weight entry is removed with it (foreign key); the profile weight follows.
      syncPetWeight(app.db, pet.id);
      return reply.status(204).send();
    },
  );
};

/**
 * The recipient's side: GET /shared/passports/:token, no sign-in.
 * Browsers (Accept: text/html) get a readable page; apps get JSON.
 * Expired, revoked and unknown links all answer 404, so links can't be probed.
 */
export const sharedPassportRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/passports/:token",
    // No response schema: this route answers with either HTML or JSON built below.
    { schema: { params: sharedTokenParamsSchema } },
    async (request, reply) => {
      reply
        .header("cache-control", "no-store")
        .header("x-robots-tag", "noindex, nofollow")
        .header("referrer-policy", "no-referrer");

      const share = openShare(app.db, request.params.token);
      const pet = share && app.db.select().from(pets).where(eq(pets.id, share.petId)).get();
      if (!share || !pet) {
        throw notFound("SHARE_NOT_FOUND", "This link has expired or does not exist");
      }

      const shared: z.infer<typeof sharedPassportSchema> = {
        pet: {
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          birthDate: pet.birthDate,
          weightKg: pet.weightKg,
        },
        sharedAt: share.createdAt,
        expiresAt: share.expiresAt,
        ...groupPassport(listRecords(app.db, pet.id), share.sections),
      };

      if (request.headers.accept?.includes("text/html")) {
        return reply
          .type("text/html; charset=utf-8")
          .header("content-security-policy", "default-src 'none'; style-src 'unsafe-inline'")
          .send(renderSharedPassportPage(shared, share.language as ShareLanguage));
      }
      return shared;
    },
  );
};
