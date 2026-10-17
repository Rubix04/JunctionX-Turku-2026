import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import type { PetRow } from "../../db/schema.js";
import { badRequest } from "../../errors.js";
import { currentUser } from "../../plugins/auth.js";
import { todayInFinland } from "../passport/service.js";
import { petParamsSchema } from "../pets/schemas.js";
import { getPet } from "../pets/service.js";
import {
  carePlanInputSchema,
  carePlanSchema,
  langQuerySchema,
  petRemindersQuerySchema,
  reminderInputSchema,
  reminderParamsSchema,
  reminderSchema,
  remindersQuerySchema,
  reminderUpdateSchema,
  scheduleInputSchema,
  scheduleParamsSchema,
  scheduleSchema,
  scheduleUpdateSchema,
  visitDraftInputSchema,
  visitParamsSchema,
  visitSchema,
} from "./schemas.js";
import {
  createReminder,
  createSchedule,
  createVisitDraft,
  deleteCarePlan,
  deleteReminder,
  deleteSchedule,
  ensureUpcomingDoses,
  getReminder,
  householdPetIds,
  listCarePlans,
  listReminders,
  listSchedules,
  listVisits,
  saveCarePlan,
  toCarePlanDto,
  toReminderDto,
  toScheduleDto,
  updateReminder,
  updateSchedule,
} from "./service.js";
import { addDays } from "./time.js";

type Request = Parameters<typeof currentUser>[0];

/**
 * Care plan after a visit and medication schedules (spec 2), per pet. Registered under /pets.
 * - GET    /pets/:petId/visits                               passport visits with care plan state
 * - POST   /pets/:petId/visits/drafts                        a visit from uploaded notes (draft care plan)
 * - GET    /pets/:petId/care-plan                            the latest visit's care plan, or null
 * - GET    /pets/:petId/care-plans                           all, newest visit first
 * - PUT    /pets/:petId/visits/:visitId/care-plan            create or replace (follow-up → reminder)
 * - DELETE /pets/:petId/visits/:visitId/care-plan
 * - GET    /pets/:petId/medication-course                    the medicine being given now, or null
 * - GET    /pets/:petId/medication-schedules
 * - POST   /pets/:petId/medication-schedules                 doses become reminders
 * - PATCH  /pets/:petId/medication-schedules/:scheduleId     stop, or change times from now on
 * - DELETE /pets/:petId/medication-schedules/:scheduleId
 * - GET    /pets/:petId/reminders                            this pet's reminders
 */
export const careRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("preHandler", app.authenticate);

  const petFor = (request: Request, petId: string): PetRow => getPet(app.db, currentUser(request).householdId, petId);

  app.get(
    "/:petId/visits",
    { schema: { params: petParamsSchema, response: { 200: z.object({ visits: z.array(visitSchema) }) } } },
    async (request) => ({ visits: listVisits(app.db, petFor(request, request.params.petId)) }),
  );

  app.post(
    "/:petId/visits/drafts",
    { schema: { params: petParamsSchema, body: visitDraftInputSchema, response: { 201: visitSchema } } },
    async (request, reply) => {
      const pet = petFor(request, request.params.petId);
      return reply.status(201).send(createVisitDraft(app.db, pet, currentUser(request).userId, request.body));
    },
  );

  app.get(
    "/:petId/care-plan",
    { schema: { params: petParamsSchema, response: { 200: z.object({ carePlan: carePlanSchema.nullable() }) } } },
    async (request) => {
      const latest = listCarePlans(app.db, petFor(request, request.params.petId))[0];
      return { carePlan: latest ? toCarePlanDto(latest.plan, latest.visit) : null };
    },
  );

  app.get(
    "/:petId/care-plans",
    { schema: { params: petParamsSchema, response: { 200: z.object({ carePlans: z.array(carePlanSchema) }) } } },
    async (request) => ({
      carePlans: listCarePlans(app.db, petFor(request, request.params.petId)).map(({ plan, visit }) =>
        toCarePlanDto(plan, visit),
      ),
    }),
  );

  app.put(
    "/:petId/visits/:visitId/care-plan",
    { schema: { params: visitParamsSchema, body: carePlanInputSchema, response: { 200: carePlanSchema } } },
    async (request) => {
      const pet = petFor(request, request.params.petId);
      const { plan, visit } = saveCarePlan(app.db, pet, request.params.visitId, request.body, currentUser(request).userId, {
        allowClinicCheck: app.config.DEMO_MODE,
      });
      return toCarePlanDto(plan, visit);
    },
  );

  app.delete("/:petId/visits/:visitId/care-plan", { schema: { params: visitParamsSchema } }, async (request, reply) => {
    deleteCarePlan(app.db, petFor(request, request.params.petId), request.params.visitId);
    return reply.status(204).send();
  });

  app.get(
    "/:petId/medication-course",
    { schema: { params: petParamsSchema, response: { 200: z.object({ course: scheduleSchema.nullable() }) } } },
    async (request) => {
      const pet = petFor(request, request.params.petId);
      ensureUpcomingDoses(app.db, [pet.id]);
      const courses = listSchedules(app.db, pet.id).map((schedule) => toScheduleDto(app.db, schedule));
      // The one being given now; a fixed-length course before a long-term medicine.
      const active = courses.filter((course) => course.active);
      return { course: active.find((course) => course.totalDays !== null) ?? active[0] ?? null };
    },
  );

  app.get(
    "/:petId/medication-schedules",
    { schema: { params: petParamsSchema, response: { 200: z.object({ schedules: z.array(scheduleSchema) }) } } },
    async (request) => {
      const pet = petFor(request, request.params.petId);
      ensureUpcomingDoses(app.db, [pet.id]);
      return { schedules: listSchedules(app.db, pet.id).map((schedule) => toScheduleDto(app.db, schedule)) };
    },
  );

  app.post(
    "/:petId/medication-schedules",
    { schema: { params: petParamsSchema, body: scheduleInputSchema, response: { 201: scheduleSchema } } },
    async (request, reply) => {
      const pet = petFor(request, request.params.petId);
      const schedule = createSchedule(app.db, pet, currentUser(request).userId, request.body);
      return reply.status(201).send(toScheduleDto(app.db, schedule));
    },
  );

  app.patch(
    "/:petId/medication-schedules/:scheduleId",
    { schema: { params: scheduleParamsSchema, body: scheduleUpdateSchema, response: { 200: scheduleSchema } } },
    async (request) => {
      const pet = petFor(request, request.params.petId);
      const schedule = updateSchedule(app.db, pet.id, request.params.scheduleId, request.body);
      return toScheduleDto(app.db, schedule);
    },
  );

  app.delete(
    "/:petId/medication-schedules/:scheduleId",
    { schema: { params: scheduleParamsSchema } },
    async (request, reply) => {
      const pet = petFor(request, request.params.petId);
      deleteSchedule(app.db, pet.id, request.params.scheduleId);
      return reply.status(204).send();
    },
  );

  app.get(
    "/:petId/reminders",
    {
      schema: {
        params: petParamsSchema,
        querystring: petRemindersQuerySchema,
        response: { 200: z.object({ reminders: z.array(reminderSchema) }) },
      },
    },
    async (request) => {
      const pet = petFor(request, request.params.petId);
      return { reminders: remindersFor(app.db, [pet.id], request.query) };
    },
  );
};

const remindersFor = (
  db: Parameters<typeof listReminders>[0],
  petIds: string[],
  query: { from?: string; to?: string; lang: "fi" | "sv" | "en" },
) => {
  const today = todayInFinland();
  const from = query.from ?? addDays(today, -7);
  const to = query.to ?? addDays(today, 30);
  if (from > to) {
    throw badRequest("INVALID_DATES", "from is after to");
  }
  ensureUpcomingDoses(db, petIds, today);
  return listReminders(db, petIds, from, to).map(({ reminder, doneBy }) =>
    toReminderDto(reminder, doneBy, query.lang),
  );
};

/**
 * Reminders for all of the household's pets (spec 2): medication doses, follow-up visits,
 * vaccinations and the owner's own. Shared by the family, so a dose is not given twice.
 * - GET    /reminders?petId=&from=&to=   soonest first
 * - POST   /reminders                    the owner's own, e.g. deworming
 * - PATCH  /reminders/:reminderId        { done } for any; text and time for the owner's own
 * - DELETE /reminders/:reminderId        the owner's own only
 */
export const reminderRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("preHandler", app.authenticate);

  const petIdsFor = (request: Request) => householdPetIds(app.db, currentUser(request).householdId);

  app.get(
    "/",
    {
      schema: {
        querystring: remindersQuerySchema,
        response: { 200: z.object({ reminders: z.array(reminderSchema) }) },
      },
    },
    async (request) => {
      const { petId } = request.query;
      if (petId) {
        getPet(app.db, currentUser(request).householdId, petId);
      }
      return { reminders: remindersFor(app.db, petId ? [petId] : petIdsFor(request), request.query) };
    },
  );

  app.post(
    "/",
    { schema: { querystring: langQuerySchema, body: reminderInputSchema, response: { 201: reminderSchema } } },
    async (request, reply) => {
      getPet(app.db, currentUser(request).householdId, request.body.petId);
      const reminder = createReminder(app.db, currentUser(request).userId, request.body);
      return reply.status(201).send(toReminderDto(reminder, null, request.query.lang));
    },
  );

  app.patch(
    "/:reminderId",
    {
      schema: {
        params: reminderParamsSchema,
        querystring: langQuerySchema,
        body: reminderUpdateSchema,
        response: { 200: reminderSchema },
      },
    },
    async (request) => {
      const petIds = petIdsFor(request);
      const { reminder } = getReminder(app.db, petIds, request.params.reminderId);
      updateReminder(app.db, reminder, currentUser(request).userId, request.body);
      const updated = getReminder(app.db, petIds, reminder.id);
      return toReminderDto(updated.reminder, updated.doneBy, request.query.lang);
    },
  );

  app.delete("/:reminderId", { schema: { params: reminderParamsSchema } }, async (request, reply) => {
    const { reminder } = getReminder(app.db, petIdsFor(request), request.params.reminderId);
    deleteReminder(app.db, reminder);
    return reply.status(204).send();
  });
};
