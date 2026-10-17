import { randomUUID } from "node:crypto";

import multipart from "@fastify/multipart";
import { and, eq } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { dailyLogs, logAttachments, type PetRow } from "../../db/schema.js";
import { ApiError, badRequest, notFound } from "../../errors.js";
import { currentUser } from "../../plugins/auth.js";
import { alertsContent } from "../alerts/content.js";
import { matchSymptoms, regionFor } from "../alerts/season.js";
import { listRecords, todayInFinland } from "../passport/service.js";
import { petParamsSchema } from "../pets/schemas.js";
import { getPet } from "../pets/service.js";
import {
  deleteAttachmentFiles,
  MAX_ATTACHMENTS_PER_LOG,
  MAX_VIDEO_BYTES,
  openAttachment,
  storeAttachment,
} from "./attachments.js";
import { symptomContent } from "./content.js";
import {
  assessInputSchema,
  assessmentSchema,
  attachmentParamsSchema,
  attachmentSchema,
  createWatchListSchema,
  emergencyListResponseSchema,
  healthStatusSchema,
  langQuerySchema,
  logInputSchema,
  logParamsSchema,
  logSchema,
  logsQuerySchema,
  logsResponseSchema,
  outcomeInputSchema,
  questionsQuerySchema,
  questionsResponseSchema,
  savedLogSchema,
  saveLogQuerySchema,
  speciesLangQuerySchema,
  templatesResponseSchema,
  trendsQuerySchema,
  trendsResponseSchema,
  updateWatchListSchema,
  watchListParamsSchema,
  watchListSchema,
  watchListsResponseSchema,
} from "./schemas.js";
import {
  assessLog,
  attachmentsFor,
  contentStatus,
  createWatchList,
  deleteWatchList,
  emergencyListFor,
  getLog,
  healthStatus,
  listLogs,
  listWatchLists,
  questionsFor,
  renderAssessment,
  saveLog,
  setOutcome,
  suggestedTemplates,
  symptomList,
  toAttachmentDto,
  toLogDto,
  toQuestionDto,
  toWatchListDto,
  trends,
  updateWatchList,
} from "./service.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const daysBefore = (isoDate: string, days: number) =>
  new Date(Date.parse(`${isoDate}T00:00:00Z`) - days * DAY_MS).toISOString().slice(0, 10);

/**
 * Public symptom content (spec 1), like the knowledge base. Registered under /symptoms.
 * - GET /symptoms/emergency-list?species=cat     always one tap away; no sign-in needed
 * - GET /symptoms/watch-list-templates           vet-reviewed watch lists by diagnosis
 */
export const symptomContentRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/emergency-list",
    { schema: { querystring: speciesLangQuerySchema, response: { 200: emergencyListResponseSchema } } },
    async (request) => ({
      content: contentStatus(),
      emergencyList: emergencyListFor(request.query.species, request.query.lang),
    }),
  );

  app.get(
    "/watch-list-templates",
    { schema: { querystring: speciesLangQuerySchema, response: { 200: templatesResponseSchema } } },
    async (request) => {
      const { lang, species } = request.query;
      return {
        content: contentStatus(),
        templates: symptomContent.watchListTemplates
          .filter((template) => !species || template.species.includes(species))
          .map((template) => ({
            id: template.id,
            species: template.species,
            condition: template.condition[lang],
            intro: template.intro[lang],
            defaultDays: template.defaultDays,
            questions: template.questions.map((q) => toQuestionDto(q, lang, "watchList")),
          })),
      };
    },
  );
};

/**
 * Symptom tracking (spec 1) and severity assessment (spec 12) for one pet. Registered under /pets.
 * - GET    /pets/:petId/health-status                     traffic light for the home and pet page
 * - GET    /pets/:petId/log-questions?date=               watch list questions, then general ones
 * - PUT    /pets/:petId/logs/:date                        save the day's log → assessment (same day replaces)
 * - GET    /pets/:petId/logs?from=&to=                    logs, newest first (default: last 30 days)
 * - GET    /pets/:petId/logs/:date
 * - DELETE /pets/:petId/logs/:date
 * - PUT    /pets/:petId/logs/:date/outcome                what the vet found, to compare with the assessment
 * - POST   /pets/:petId/logs/:date/attachments            multipart `file`: a photo or video
 * - GET    /pets/:petId/logs/:date/attachments/:id        the file (supports Range for video)
 * - DELETE /pets/:petId/logs/:date/attachments/:id
 * - POST   /pets/:petId/assess                            assessment without saving, e.g. for emergency mode
 * - GET    /pets/:petId/trends?weeks=8                    weekly charts
 * - GET    /pets/:petId/watch-lists                       active, past and suggested watch lists
 * - POST   /pets/:petId/watch-lists                       from a template or the vet's instructions
 * - PATCH  /pets/:petId/watch-lists/:watchListId          end it, or set the vet's own thresholds
 * - DELETE /pets/:petId/watch-lists/:watchListId
 */
export const symptomRoutes: FastifyPluginAsyncZod = async (app) => {
  await app.register(multipart, { limits: { fileSize: MAX_VIDEO_BYTES, files: 1, fields: 5 } });
  app.addHook("preHandler", app.authenticate);
  const uploadDir = app.config.UPLOAD_DIR;

  const petFor = (request: Parameters<typeof currentUser>[0], petId: string): PetRow =>
    getPet(app.db, currentUser(request).householdId, petId);

  app.get(
    "/:petId/health-status",
    { schema: { params: petParamsSchema, querystring: langQuerySchema, response: { 200: healthStatusSchema } } },
    async (request) => healthStatus(app.db, petFor(request, request.params.petId), request.query.lang),
  );

  app.get(
    "/:petId/log-questions",
    { schema: { params: petParamsSchema, querystring: questionsQuerySchema, response: { 200: questionsResponseSchema } } },
    async (request) => {
      const pet = petFor(request, request.params.petId);
      const { lang } = request.query;
      const date = request.query.date ?? todayInFinland();
      const { lists, questions } = questionsFor(app.db, pet.id, date);
      return {
        content: contentStatus(),
        date,
        questions: questions.map((q) => toQuestionDto(q.question, lang, q.source, q.watchListId)),
        watchLists: lists.map((list) => toWatchListDto(list, pet, lang)),
        emergencyList: emergencyListFor(pet.species, lang),
        symptoms: symptomList(lang),
      };
    },
  );

  app.put(
    "/:petId/logs/:date",
    {
      schema: {
        params: logParamsSchema,
        querystring: saveLogQuerySchema,
        body: logInputSchema,
        response: { 200: savedLogSchema },
      },
    },
    async (request) => {
      const pet = petFor(request, request.params.petId);
      const { date } = request.params;
      const { lang, lat } = request.query;
      const log = saveLog(app.db, pet, currentUser(request).userId, date, request.body);
      const matches = matchSymptoms(
        alertsContent,
        { region: regionFor(lat), date, species: pet.species },
        log.assessment.symptoms,
      );
      return {
        log: toLogDto(log, attachmentsFor(app.db, [log.id]), lang),
        seasonalAlerts: matches.map((match) => ({
          id: match.card.id,
          title: match.card.title[lang],
          matchedSymptoms: match.matchedTags,
        })),
      };
    },
  );

  app.get(
    "/:petId/logs",
    { schema: { params: petParamsSchema, querystring: logsQuerySchema, response: { 200: logsResponseSchema } } },
    async (request) => {
      const pet = petFor(request, request.params.petId);
      const to = request.query.to ?? todayInFinland();
      const from = request.query.from ?? daysBefore(to, 30);
      if (from > to) {
        throw badRequest("INVALID_DATES", "from is after to");
      }
      const logs = listLogs(app.db, pet.id, from, to);
      const attachments = attachmentsFor(app.db, logs.map((log) => log.id));
      return { from, to, logs: logs.map((log) => toLogDto(log, attachments, request.query.lang)) };
    },
  );

  app.get(
    "/:petId/logs/:date",
    { schema: { params: logParamsSchema, querystring: langQuerySchema, response: { 200: logSchema } } },
    async (request) => {
      const pet = petFor(request, request.params.petId);
      const log = getLog(app.db, pet.id, request.params.date);
      return toLogDto(log, attachmentsFor(app.db, [log.id]), request.query.lang);
    },
  );

  app.delete("/:petId/logs/:date", { schema: { params: logParamsSchema } }, async (request, reply) => {
    const pet = petFor(request, request.params.petId);
    const log = getLog(app.db, pet.id, request.params.date);
    const keys = attachmentsFor(app.db, [log.id]).map((a) => a.fileKey);
    app.db.delete(dailyLogs).where(eq(dailyLogs.id, log.id)).run();
    await deleteAttachmentFiles(uploadDir, keys);
    return reply.status(204).send();
  });

  app.put(
    "/:petId/logs/:date/outcome",
    {
      schema: {
        params: logParamsSchema,
        querystring: langQuerySchema,
        body: outcomeInputSchema,
        response: { 200: logSchema },
      },
    },
    async (request) => {
      const pet = petFor(request, request.params.petId);
      const log = setOutcome(app.db, pet, request.params.date, request.body);
      return toLogDto(log, attachmentsFor(app.db, [log.id]), request.query.lang);
    },
  );

  app.post(
    "/:petId/logs/:date/attachments",
    { schema: { params: logParamsSchema, response: { 201: attachmentSchema } } },
    async (request, reply) => {
      const pet = petFor(request, request.params.petId);
      const log = getLog(app.db, pet.id, request.params.date);
      if (attachmentsFor(app.db, [log.id]).length >= MAX_ATTACHMENTS_PER_LOG) {
        throw badRequest("TOO_MANY_ATTACHMENTS", `A log can have at most ${MAX_ATTACHMENTS_PER_LOG} attachments`);
      }

      let upload: Buffer | null = null;
      try {
        for await (const part of request.parts()) {
          if (part.type === "file") {
            if (part.fieldname !== "file") {
              throw badRequest("INVALID_UPLOAD", "Send the photo or video in a field named 'file'");
            }
            upload = await part.toBuffer();
          }
        }
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        if ((error as { code?: string }).code === "FST_REQ_FILE_TOO_LARGE") {
          throw badRequest("FILE_TOO_LARGE", "Videos can be at most 50 MB");
        }
        throw error;
      }
      if (!upload) {
        throw badRequest("INVALID_UPLOAD", "Send the photo or video in a field named 'file'");
      }

      const stored = await storeAttachment(uploadDir, upload);
      try {
        const row = app.db
          .insert(logAttachments)
          .values({ id: randomUUID(), logId: log.id, ...stored })
          .returning()
          .get();
        return reply.status(201).send(toAttachmentDto(row, pet.id, log.loggedOn));
      } catch (error) {
        await deleteAttachmentFiles(uploadDir, [stored.fileKey]);
        throw error;
      }
    },
  );

  const findAttachment = (petId: string, date: string, attachmentId: string) => {
    const log = getLog(app.db, petId, date);
    const attachment = app.db
      .select()
      .from(logAttachments)
      .where(and(eq(logAttachments.id, attachmentId), eq(logAttachments.logId, log.id)))
      .get();
    if (!attachment) {
      throw notFound("ATTACHMENT_NOT_FOUND", "No such attachment in this log");
    }
    return attachment;
  };

  app.get("/:petId/logs/:date/attachments/:attachmentId", { schema: { params: attachmentParamsSchema } }, async (request, reply) => {
    const { petId, date, attachmentId } = request.params;
    const pet = petFor(request, petId);
    const attachment = findAttachment(pet.id, date, attachmentId);
    const file = await openAttachment(uploadDir, attachment.fileKey, request.headers.range);
    reply
      .type(attachment.contentType)
      .header("accept-ranges", "bytes")
      // Files never change; a new upload gets a new id.
      .header("cache-control", "private, max-age=31536000, immutable");
    if (!file) {
      return reply.status(416).header("content-range", `bytes */${attachment.sizeBytes}`).send();
    }
    if (file.partial) {
      reply
        .status(206)
        .header("content-range", `bytes ${file.partial.start}-${file.partial.end}/${file.size}`)
        .header("content-length", file.partial.end - file.partial.start + 1);
    } else {
      reply.header("content-length", file.size);
    }
    return reply.send(file.stream);
  });

  app.delete(
    "/:petId/logs/:date/attachments/:attachmentId",
    { schema: { params: attachmentParamsSchema } },
    async (request, reply) => {
      const { petId, date, attachmentId } = request.params;
      const pet = petFor(request, petId);
      const attachment = findAttachment(pet.id, date, attachmentId);
      app.db.delete(logAttachments).where(eq(logAttachments.id, attachment.id)).run();
      await deleteAttachmentFiles(uploadDir, [attachment.fileKey]);
      return reply.status(204).send();
    },
  );

  app.post(
    "/:petId/assess",
    {
      schema: {
        params: petParamsSchema,
        querystring: langQuerySchema,
        body: assessInputSchema,
        response: { 200: assessmentSchema },
      },
    },
    async (request) => {
      const pet = petFor(request, request.params.petId);
      const assessment = assessLog(app.db, pet, todayInFinland(), { ...request.body, note: null });
      return renderAssessment(assessment, request.query.lang);
    },
  );

  app.get(
    "/:petId/trends",
    { schema: { params: petParamsSchema, querystring: trendsQuerySchema, response: { 200: trendsResponseSchema } } },
    async (request) =>
      trends(app.db, petFor(request, request.params.petId), request.query.weeks, request.query.lang),
  );

  app.get(
    "/:petId/watch-lists",
    { schema: { params: petParamsSchema, querystring: langQuerySchema, response: { 200: watchListsResponseSchema } } },
    async (request) => {
      const pet = petFor(request, request.params.petId);
      const { lang } = request.query;
      const lists = listWatchLists(app.db, pet.id).map((list) => toWatchListDto(list, pet, lang));
      return {
        active: lists.filter((list) => list.active),
        past: lists.filter((list) => !list.active),
        suggestions: suggestedTemplates(app.db, pet).map(({ template, record }) => ({
          templateId: template.id,
          condition: template.condition[lang],
          reason: { recordId: record.id, kind: record.kind, date: record.date },
        })),
      };
    },
  );

  app.post(
    "/:petId/watch-lists",
    {
      schema: {
        params: petParamsSchema,
        querystring: langQuerySchema,
        body: createWatchListSchema,
        response: { 201: watchListSchema },
      },
    },
    async (request, reply) => {
      const pet = petFor(request, request.params.petId);
      const list = createWatchList(app.db, pet, currentUser(request).userId, request.body, listRecords(app.db, pet.id));
      return reply.status(201).send(toWatchListDto(list, pet, request.query.lang));
    },
  );

  app.patch(
    "/:petId/watch-lists/:watchListId",
    {
      schema: {
        params: watchListParamsSchema,
        querystring: langQuerySchema,
        body: updateWatchListSchema,
        response: { 200: watchListSchema },
      },
    },
    async (request) => {
      const pet = petFor(request, request.params.petId);
      const list = updateWatchList(app.db, pet.id, request.params.watchListId, request.body);
      return toWatchListDto(list, pet, request.query.lang);
    },
  );

  app.delete(
    "/:petId/watch-lists/:watchListId",
    { schema: { params: watchListParamsSchema } },
    async (request, reply) => {
      const pet = petFor(request, request.params.petId);
      deleteWatchList(app.db, pet.id, request.params.watchListId);
      return reply.status(204).send();
    },
  );
};
