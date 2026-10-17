import { randomUUID } from "node:crypto";

import { and, asc, eq, gt, gte, inArray, isNull, lte, or } from "drizzle-orm";

import type { Db } from "../../db/client.js";
import {
  type CarePlanProduct,
  type CarePlanRow,
  carePlans,
  type FollowUp,
  type HealthRecordRow,
  healthRecords,
  type MedicationScheduleRow,
  medicationSchedules,
  type PetRow,
  pets,
  type ReminderKind,
  type ReminderRow,
  reminders,
  users,
} from "../../db/schema.js";
import { badRequest, notFound } from "../../errors.js";
import { syncVisitWeight } from "../diet/service.js";
import { createRecord, listRecords, todayInFinland } from "../passport/service.js";
import { startWatchListsForRecord } from "../symptoms/service.js";
import { addDays, datesBetween, helsinkiToEpoch, normalizeLocal } from "./time.js";

export type Language = "fi" | "sv" | "en";

/** Medication doses are generated this many days ahead. */
export const DOSES_AHEAD_DAYS = 14;

// Short texts for reminders the app makes itself. Owner-written texts are shown as written.
const texts = {
  vaccinationDetail: {
    fi: "Voimassa {date} asti · varaa aika",
    sv: "Giltig till {date} · boka en tid",
    en: "Valid until {date} · book a time",
  },
} satisfies Record<string, Record<Language, string>>;

const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);

const formatDate = (isoDate: string, lang: Language) =>
  new Date(`${isoDate}T12:00:00Z`).toLocaleDateString({ fi: "fi-FI", sv: "sv-SE", en: "en-GB" }[lang], {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });

const recordData = (record: HealthRecordRow) => record.data as Record<string, string | number | null>;

// ---- Visits and care plans ----

const carePlanByVisit = (db: Db, petId: string) =>
  new Map(
    db
      .select()
      .from(carePlans)
      .where(eq(carePlans.petId, petId))
      .all()
      .map((plan) => [plan.visitRecordId, plan]),
  );

/** Passport visits with their care plan's vet and draft state, newest first. */
export const listVisits = (db: Db, pet: PetRow) => {
  const plans = carePlanByVisit(db, pet.id);
  return listRecords(db, pet.id)
    .filter((record) => record.kind === "visit")
    .map((record) => {
      const data = recordData(record);
      const plan = plans.get(record.id);
      return {
        id: record.id,
        petId: pet.id,
        date: data.visitedOn as string,
        title: ((data.diagnosis as string | null) ?? (data.reason as string)) || "",
        clinicName: (data.clinic as string | null) ?? "",
        vetName: plan?.vetName ?? null,
        /** Uploaded notes not yet checked by the clinic */
        draft: plan ? !plan.checkedByClinic : false,
        carePlanId: plan?.id ?? null,
      };
    });
};

const getVisitRecord = (db: Db, petId: string, visitId: string) => {
  const record = db
    .select()
    .from(healthRecords)
    .where(and(eq(healthRecords.id, visitId), eq(healthRecords.petId, petId), eq(healthRecords.kind, "visit")))
    .get();
  if (!record) {
    throw notFound("VISIT_NOT_FOUND", "No such visit in this pet's passport");
  }
  return record;
};

export const toCarePlanDto = (plan: CarePlanRow, visit: HealthRecordRow) => ({
  id: plan.id,
  petId: plan.petId,
  visitId: plan.visitRecordId,
  visitDate: recordData(visit).visitedOn as string,
  diagnosis: plan.diagnosis,
  clinicName: (recordData(visit).clinic as string | null) ?? "",
  vetName: plan.vetName,
  checkedByClinic: plan.checkedByClinic,
  findings: plan.findings,
  homeCare: plan.homeCare,
  followUp: plan.followUp,
  products: plan.products,
  originalText: plan.originalText,
  updatedAt: plan.updatedAt,
});

export type CarePlanInput = {
  diagnosis: string;
  vetName?: string | null;
  findings?: string;
  homeCare?: string[];
  followUp?: FollowUp | null;
  products?: CarePlanProduct[];
  originalText?: string;
  /** Only honoured in demo mode, where it stands in for the clinic's own check */
  checkedByClinic?: boolean;
};

/** Keeps the follow-up visit reminder in step with the care plan. */
const syncFollowUpReminder = (db: Db, plan: CarePlanRow, userId: string | null) => {
  const existing = db
    .select()
    .from(reminders)
    .where(and(eq(reminders.carePlanId, plan.id), eq(reminders.source, "followUp")))
    .get();
  if (!plan.followUp) {
    if (existing) {
      db.delete(reminders).where(eq(reminders.id, existing.id)).run();
    }
    return;
  }
  const dueAt = normalizeLocal(plan.followUp.dateTime);
  const values = {
    title: plan.followUp.title,
    detail: plan.followUp.clinicName,
    dueAt,
    dueAtMs: helsinkiToEpoch(dueAt),
  };
  if (existing) {
    // A moved appointment is a new thing to remember.
    const moved = existing.dueAt !== dueAt;
    db.update(reminders)
      .set({ ...values, ...(moved && { doneAt: null, doneByUserId: null, pushedAt: null }) })
      .where(eq(reminders.id, existing.id))
      .run();
  } else {
    db.insert(reminders)
      .values({
        id: randomUUID(),
        petId: plan.petId,
        kind: "visit",
        source: "followUp",
        carePlanId: plan.id,
        createdByUserId: userId,
        ...values,
      })
      .run();
  }
};

/** Creates or replaces the care plan of a passport visit. */
export const saveCarePlan = (
  db: Db,
  pet: PetRow,
  visitId: string,
  input: CarePlanInput,
  userId: string | null,
  options: { allowClinicCheck: boolean },
) => {
  const visit = getVisitRecord(db, pet.id, visitId);
  const values = {
    diagnosis: input.diagnosis,
    vetName: input.vetName ?? null,
    findings: input.findings ?? "",
    homeCare: input.homeCare ?? [],
    followUp: input.followUp ? { ...input.followUp, dateTime: normalizeLocal(input.followUp.dateTime) } : null,
    products: input.products ?? [],
    originalText: input.originalText ?? "",
    checkedByClinic: options.allowClinicCheck ? (input.checkedByClinic ?? false) : false,
    updatedAt: Date.now(),
  };
  const plan = db
    .insert(carePlans)
    .values({ id: randomUUID(), petId: pet.id, visitRecordId: visit.id, createdByUserId: userId, ...values })
    .onConflictDoUpdate({ target: carePlans.visitRecordId, set: values })
    .returning()
    .get();
  syncFollowUpReminder(db, plan, userId);
  return { plan, visit };
};

export const deleteCarePlan = (db: Db, pet: PetRow, visitId: string) => {
  const visit = getVisitRecord(db, pet.id, visitId);
  const deleted = db.delete(carePlans).where(eq(carePlans.visitRecordId, visit.id)).returning().get();
  if (!deleted) {
    throw notFound("CARE_PLAN_NOT_FOUND", "This visit has no care plan");
  }
};

/** Care plans with their visits, newest visit first. */
export const listCarePlans = (db: Db, pet: PetRow) => {
  const visits = new Map(listRecords(db, pet.id).map((record) => [record.id, record]));
  return db
    .select()
    .from(carePlans)
    .where(eq(carePlans.petId, pet.id))
    .all()
    .flatMap((plan) => {
      const visit = visits.get(plan.visitRecordId);
      return visit ? [{ plan, visit }] : [];
    })
    .sort((a, b) =>
      (recordData(b.visit).visitedOn as string).localeCompare(recordData(a.visit).visitedOn as string),
    );
};

/**
 * Adds a vet visit from uploaded notes (e.g. a photo of the clinic's printout typed out):
 * a passport visit plus a care plan that stays a draft until the clinic checks it.
 */
export const createVisitDraft = (
  db: Db,
  pet: PetRow,
  userId: string,
  input: { title: string; clinicName: string; visitedOn?: string; notes?: string | null },
) => {
  const record = createRecord(db, pet.id, "visit", {
    visitedOn: input.visitedOn ?? todayInFinland(),
    reason: input.title,
    clinic: input.clinicName,
    notes: input.notes ?? null,
  });
  syncVisitWeight(db, record);
  startWatchListsForRecord(db, pet, record, userId);
  saveCarePlan(
    db,
    pet,
    record.id,
    { diagnosis: input.title, originalText: input.notes ?? "" },
    userId,
    { allowClinicCheck: false },
  );
  return listVisits(db, pet).find((visit) => visit.id === record.id)!;
};

// ---- Medication schedules ----

const scheduleEnd = (schedule: MedicationScheduleRow) => {
  const lastDay = schedule.totalDays === null ? null : addDays(schedule.startDate, schedule.totalDays - 1);
  if (schedule.stoppedOn && (!lastDay || schedule.stoppedOn < lastDay)) {
    return schedule.stoppedOn;
  }
  return lastDay;
};

/**
 * Creates the schedule's dose reminders up to `until` (and never past its end). Doses due before
 * `notBeforeMs` are skipped, e.g. earlier today when the dose times change.
 */
export const generateDoses = (db: Db, schedule: MedicationScheduleRow, until: string, notBeforeMs = 0) => {
  const end = scheduleEnd(schedule);
  const last = end && end < until ? end : until;
  const first = schedule.generatedUntil ? addDays(schedule.generatedUntil, 1) : schedule.startDate;
  if (first > last) {
    return;
  }
  const rows = datesBetween(first, last).flatMap((date) =>
    schedule.times.flatMap((time) => {
      const dueAt = `${date}T${time}:00`;
      const dueAtMs = helsinkiToEpoch(dueAt);
      if (dueAtMs < notBeforeMs) {
        return [];
      }
      return {
        id: randomUUID(),
        petId: schedule.petId,
        kind: "medication" as const,
        source: "medication" as const,
        title: schedule.name,
        detail: schedule.detail,
        dueAt,
        dueAtMs,
        scheduleId: schedule.id,
        createdByUserId: schedule.createdByUserId,
      };
    }),
  );
  if (rows.length) {
    db.insert(reminders).values(rows).onConflictDoNothing().run();
  }
  db.update(medicationSchedules).set({ generatedUntil: last }).where(eq(medicationSchedules.id, schedule.id)).run();
};

/** Tops up dose reminders for running schedules, so there are always two weeks ahead. */
export const ensureUpcomingDoses = (db: Db, petIds: string[] | null, today = todayInFinland()) => {
  const until = addDays(today, DOSES_AHEAD_DAYS);
  const schedules = db
    .select()
    .from(medicationSchedules)
    .where(
      and(
        petIds ? inArray(medicationSchedules.petId, petIds) : undefined,
        or(isNull(medicationSchedules.generatedUntil), lte(medicationSchedules.generatedUntil, until)),
      ),
    )
    .all();
  for (const schedule of schedules) {
    generateDoses(db, schedule, until);
  }
};

export type ScheduleInput = {
  name?: string;
  detail?: string;
  startDate?: string;
  totalDays?: number | null;
  times: string[];
  medicationRecordId?: string;
  carePlanId?: string;
};

export const createSchedule = (db: Db, pet: PetRow, userId: string, input: ScheduleInput, today = todayInFinland()) => {
  let name = input.name;
  let detail = input.detail;
  let startDate = input.startDate;
  let totalDays = input.totalDays;
  if (input.medicationRecordId) {
    const record = db
      .select()
      .from(healthRecords)
      .where(
        and(
          eq(healthRecords.id, input.medicationRecordId),
          eq(healthRecords.petId, pet.id),
          eq(healthRecords.kind, "medication"),
        ),
      )
      .get();
    if (!record) {
      throw notFound("RECORD_NOT_FOUND", "No such medication in this pet's passport");
    }
    // Defaults from the passport medication
    const data = recordData(record);
    name ??= data.name as string;
    detail ??= (data.dosage as string | null) ?? "";
    startDate ??= data.startDate as string;
    if (totalDays === undefined && typeof data.endDate === "string") {
      totalDays = Math.round((Date.parse(data.endDate) - Date.parse(startDate)) / 86_400_000) + 1;
    }
  }
  if (!name) {
    throw badRequest("NAME_REQUIRED", "Give the medicine's name or a passport medication");
  }
  if (input.carePlanId && !db.select().from(carePlans).where(and(eq(carePlans.id, input.carePlanId), eq(carePlans.petId, pet.id))).get()) {
    throw notFound("CARE_PLAN_NOT_FOUND", "No such care plan for this pet");
  }
  const schedule = db
    .insert(medicationSchedules)
    .values({
      id: randomUUID(),
      petId: pet.id,
      medicationRecordId: input.medicationRecordId ?? null,
      carePlanId: input.carePlanId ?? null,
      name,
      detail: detail ?? "",
      startDate: startDate ?? today,
      totalDays: totalDays ?? null,
      times: [...new Set(input.times)].sort(),
      createdByUserId: userId,
      updatedAt: Date.now(),
    })
    .returning()
    .get();
  generateDoses(db, schedule, addDays(today, DOSES_AHEAD_DAYS));
  return getSchedule(db, pet.id, schedule.id);
};

export const getSchedule = (db: Db, petId: string, scheduleId: string) => {
  const schedule = db
    .select()
    .from(medicationSchedules)
    .where(and(eq(medicationSchedules.id, scheduleId), eq(medicationSchedules.petId, petId)))
    .get();
  if (!schedule) {
    throw notFound("SCHEDULE_NOT_FOUND", "No such medication schedule for this pet");
  }
  return schedule;
};

/** Removes doses that haven't been given yet after the given moment. */
const removeFutureDoses = (db: Db, scheduleId: string, afterMs: number) =>
  db
    .delete(reminders)
    .where(and(eq(reminders.scheduleId, scheduleId), isNull(reminders.doneAt), gt(reminders.dueAtMs, afterMs)))
    .run();

/** Stops the medicine today, or changes the dose times or detail from now on. */
export const updateSchedule = (
  db: Db,
  petId: string,
  scheduleId: string,
  input: { stop?: boolean; times?: string[]; detail?: string },
  now = Date.now(),
  today = todayInFinland(),
) => {
  const schedule = getSchedule(db, petId, scheduleId);
  if (input.stop) {
    db.update(medicationSchedules)
      .set({ stoppedOn: today, updatedAt: now })
      .where(eq(medicationSchedules.id, schedule.id))
      .run();
    removeFutureDoses(db, schedule.id, now);
    return getSchedule(db, petId, scheduleId);
  }
  if (input.times || input.detail !== undefined) {
    // Doses from now on are made again with the new times or text; given and past doses stay.
    removeFutureDoses(db, schedule.id, now);
    db.update(medicationSchedules)
      .set({
        ...(input.times && { times: [...new Set(input.times)].sort() }),
        ...(input.detail !== undefined && { detail: input.detail }),
        generatedUntil: schedule.startDate < today ? addDays(today, -1) : null,
        updatedAt: now,
      })
      .where(eq(medicationSchedules.id, schedule.id))
      .run();
    generateDoses(db, getSchedule(db, petId, scheduleId), addDays(today, DOSES_AHEAD_DAYS), now);
  }
  return getSchedule(db, petId, scheduleId);
};

export const deleteSchedule = (db: Db, petId: string, scheduleId: string) => {
  getSchedule(db, petId, scheduleId);
  db.delete(medicationSchedules).where(eq(medicationSchedules.id, scheduleId)).run();
};

export const toScheduleDto = (db: Db, schedule: MedicationScheduleRow, now = Date.now(), today = todayInFinland()) => {
  const doses = db
    .select({ dueAt: reminders.dueAt, dueAtMs: reminders.dueAtMs, doneAt: reminders.doneAt })
    .from(reminders)
    .where(eq(reminders.scheduleId, schedule.id))
    .orderBy(asc(reminders.dueAtMs))
    .all();
  const end = scheduleEnd(schedule);
  const plannedDays =
    schedule.totalDays === null
      ? null
      : end
        ? Math.round((Date.parse(end) - Date.parse(schedule.startDate)) / 86_400_000) + 1
        : schedule.totalDays;
  return {
    id: schedule.id,
    petId: schedule.petId,
    name: schedule.name,
    detail: schedule.detail,
    times: schedule.times,
    startDate: schedule.startDate,
    /** Null for a long-term medicine */
    totalDays: schedule.totalDays,
    endDate: end,
    stoppedOn: schedule.stoppedOn,
    active: schedule.startDate <= today && (end === null || end >= today),
    /** Null for a long-term medicine */
    dosesTotal: plannedDays === null ? null : plannedDays * schedule.times.length,
    dosesGiven: doses.filter((dose) => dose.doneAt !== null).length,
    /** Past doses not marked as given */
    dosesMissed: doses.filter((dose) => dose.doneAt === null && dose.dueAtMs < now).length,
    nextDoseAt: doses.find((dose) => dose.doneAt === null && dose.dueAtMs >= now)?.dueAt ?? null,
    medicationRecordId: schedule.medicationRecordId,
    carePlanId: schedule.carePlanId,
  };
};

export const listSchedules = (db: Db, petId: string) =>
  db
    .select()
    .from(medicationSchedules)
    .where(eq(medicationSchedules.petId, petId))
    .orderBy(asc(medicationSchedules.startDate))
    .all();

// ---- Vaccination reminders ----

/** Days before a vaccination runs out that the reminder to book a time comes. */
const VACCINATION_REMINDER_DAYS = 30;

/**
 * One reminder per vaccine name, for its latest dose: book a new time before it runs out.
 * Call after a passport vaccination is added, changed or removed.
 */
export const syncVaccinationReminders = (db: Db, petId: string, userId: string | null) => {
  const latestByName = new Map<string, HealthRecordRow>();
  for (const record of listRecords(db, petId).filter((r) => r.kind === "vaccination")) {
    const key = String(recordData(record).name).trim().toLowerCase();
    const current = latestByName.get(key);
    if (!current || String(recordData(record).givenOn) > String(recordData(current).givenOn)) {
      latestByName.set(key, record);
    }
  }
  const keep = new Set<string>();
  for (const record of latestByName.values()) {
    const validUntil = recordData(record).validUntil;
    if (typeof validUntil !== "string") {
      continue;
    }
    keep.add(record.id);
    const dueAt = normalizeLocal(addDays(validUntil, -VACCINATION_REMINDER_DAYS));
    const values = {
      title: String(recordData(record).name),
      detail: validUntil,
      dueAt,
      dueAtMs: helsinkiToEpoch(dueAt),
    };
    const existing = db
      .select()
      .from(reminders)
      .where(and(eq(reminders.recordId, record.id), eq(reminders.source, "vaccination")))
      .get();
    if (existing) {
      const moved = existing.dueAt !== dueAt;
      db.update(reminders)
        .set({ ...values, ...(moved && { doneAt: null, doneByUserId: null, pushedAt: null }) })
        .where(eq(reminders.id, existing.id))
        .run();
    } else {
      db.insert(reminders)
        .values({
          id: randomUUID(),
          petId,
          kind: "vaccination",
          source: "vaccination",
          recordId: record.id,
          createdByUserId: userId,
          ...values,
        })
        .run();
    }
  }
  // Older doses of the same vaccine, or ones without an expiry, need no reminder.
  const stale = db
    .select({ id: reminders.id, recordId: reminders.recordId })
    .from(reminders)
    .where(and(eq(reminders.petId, petId), eq(reminders.source, "vaccination")))
    .all()
    .filter((row) => !row.recordId || !keep.has(row.recordId))
    .map((row) => row.id);
  if (stale.length) {
    db.delete(reminders).where(inArray(reminders.id, stale)).run();
  }
};

// ---- Reminders ----

export const householdPetIds = (db: Db, householdId: string) =>
  db
    .select({ id: pets.id })
    .from(pets)
    .where(eq(pets.householdId, householdId))
    .all()
    .map((row) => row.id);

export const listReminders = (db: Db, petIds: string[], from: string, to: string) =>
  petIds.length === 0
    ? []
    : db
        .select({ reminder: reminders, doneBy: users.displayName })
        .from(reminders)
        .leftJoin(users, eq(users.id, reminders.doneByUserId))
        .where(
          and(
            inArray(reminders.petId, petIds),
            gte(reminders.dueAt, `${from}T00:00:00`),
            lte(reminders.dueAt, `${to}T23:59:59`),
          ),
        )
        .orderBy(asc(reminders.dueAtMs))
        .all();

export const toReminderDto = (reminder: ReminderRow, doneBy: string | null, lang: Language, now = Date.now()) => ({
  id: reminder.id,
  petId: reminder.petId,
  kind: reminder.kind,
  title: reminder.title,
  detail:
    reminder.source === "vaccination"
      ? fill(texts.vaccinationDetail[lang], { date: formatDate(reminder.detail, lang) })
      : reminder.detail,
  dueAt: reminder.dueAt,
  done: reminder.doneAt !== null,
  doneAt: reminder.doneAt,
  /** Who marked it, so the family doesn't give a dose twice */
  doneBy,
  overdue: reminder.doneAt === null && reminder.dueAtMs < now,
  source: reminder.source,
  /** Only the owner's own reminders can be edited or deleted */
  editable: reminder.source === "owner",
});

export const getReminder = (db: Db, petIds: string[], reminderId: string) => {
  const row = db
    .select({ reminder: reminders, doneBy: users.displayName })
    .from(reminders)
    .leftJoin(users, eq(users.id, reminders.doneByUserId))
    .where(eq(reminders.id, reminderId))
    .get();
  if (!row || !petIds.includes(row.reminder.petId)) {
    throw notFound("REMINDER_NOT_FOUND", "No such reminder in this household");
  }
  return row;
};

export const createReminder = (
  db: Db,
  userId: string,
  input: { petId: string; kind: ReminderKind; title: string; detail?: string; dueAt: string },
) => {
  const dueAt = normalizeLocal(input.dueAt);
  return db
    .insert(reminders)
    .values({
      id: randomUUID(),
      petId: input.petId,
      kind: input.kind,
      title: input.title,
      detail: input.detail ?? "",
      dueAt,
      dueAtMs: helsinkiToEpoch(dueAt),
      source: "owner",
      createdByUserId: userId,
    })
    .returning()
    .get();
};

export const updateReminder = (
  db: Db,
  reminder: ReminderRow,
  userId: string,
  input: { done?: boolean; title?: string; detail?: string; dueAt?: string },
  now = Date.now(),
) => {
  const changes: Partial<ReminderRow> = {};
  if (input.done !== undefined) {
    // Marking an already given dose again keeps who gave it and when.
    if (input.done && reminder.doneAt === null) {
      Object.assign(changes, { doneAt: now, doneByUserId: userId });
    } else if (!input.done) {
      Object.assign(changes, { doneAt: null, doneByUserId: null });
    }
  }
  const edits = input.title !== undefined || input.detail !== undefined || input.dueAt !== undefined;
  if (edits && reminder.source !== "owner") {
    throw badRequest("REMINDER_NOT_EDITABLE", "This reminder comes from a care plan, medication or vaccination");
  }
  if (input.title !== undefined) changes.title = input.title;
  if (input.detail !== undefined) changes.detail = input.detail;
  if (input.dueAt !== undefined) {
    changes.dueAt = normalizeLocal(input.dueAt);
    changes.dueAtMs = helsinkiToEpoch(changes.dueAt);
    changes.pushedAt = null;
  }
  if (Object.keys(changes).length) {
    db.update(reminders).set(changes).where(eq(reminders.id, reminder.id)).run();
  }
};

export const deleteReminder = (db: Db, reminder: ReminderRow) => {
  if (reminder.source !== "owner") {
    throw badRequest("REMINDER_NOT_EDITABLE", "Stop the medicine or change the care plan or vaccination instead");
  }
  db.delete(reminders).where(eq(reminders.id, reminder.id)).run();
};

