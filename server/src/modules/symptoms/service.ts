import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, gte, inArray, isNull, lt, lte, or } from "drizzle-orm";

import type { Db } from "../../db/client.js";
import {
  type DailyLogRow,
  dailyLogs,
  exposures,
  type HealthRecordRow,
  type LocalizedText,
  type LogAttachmentRow,
  logAttachments,
  type PetRow,
  type StoredAssessment,
  type StoredQuestion,
  type WatchListRow,
  watchLists,
  weightEntries,
} from "../../db/schema.js";
import { badRequest, notFound } from "../../errors.js";
import { ageInMonths } from "../diet/calculations.js";
import { findSubstance } from "../knowledge/content.js";
import { listRecords, todayInFinland } from "../passport/service.js";
import { type AssessedQuestion, assess, daysBetween, maxLevel, trafficLightFor } from "./assessment.js";
import {
  type Answer,
  type Question,
  type SeverityLevel,
  severityLevels,
  symptomContent,
  symptomLabel,
  type WatchListTemplate,
} from "./content.js";

export type Language = "fi" | "sv" | "en";

const DAY_MS = 24 * 60 * 60 * 1000;
const addDays = (isoDate: string, days: number) =>
  new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

export const contentStatus = () => ({ status: symptomContent.meta.status, updatedOn: symptomContent.meta.updatedOn });

const sameInAllLanguages = (text: string): LocalizedText => ({ fi: text, sv: text, en: text });

const fillPet = (text: string, petName: string) => text.replaceAll("{pet}", petName);

// ---- Questions ----

export const toQuestionDto = (
  question: StoredQuestion,
  lang: Language,
  source: "watchList" | "general",
  watchListId: string | null = null,
) => ({
  id: question.id,
  label: question.label[lang],
  options: question.options.map((option) => option[lang]),
  usualAnswer: question.usualAnswer,
  yellowIf: question.yellowIf,
  redIf: question.redIf,
  emergencyIf: question.emergencyIf,
  source,
  watchListId,
});

export const emergencyListFor = (species: PetRow["species"] | undefined, lang: Language) =>
  symptomContent.emergencyList
    .filter((entry) => !species || entry.species.includes(species))
    .map((entry) => ({
      symptom: entry.symptom,
      label: symptomLabel(entry.symptom, lang),
      description: entry.description[lang],
      species: entry.species,
    }));

export const symptomList = (lang: Language) =>
  symptomContent.symptoms.map((symptom) => ({ id: symptom.id, label: symptom.label[lang] }));

// ---- Watch lists ----

const isActiveOn = (list: WatchListRow, date: string) =>
  list.startDate <= date && (list.endDate === null || list.endDate >= date);

export const listWatchLists = (db: Db, petId: string) =>
  db.select().from(watchLists).where(eq(watchLists.petId, petId)).orderBy(desc(watchLists.startDate)).all();

export const activeWatchLists = (db: Db, petId: string, date: string) =>
  db
    .select()
    .from(watchLists)
    .where(
      and(
        eq(watchLists.petId, petId),
        lte(watchLists.startDate, date),
        or(isNull(watchLists.endDate), gte(watchLists.endDate, date)),
      ),
    )
    .orderBy(asc(watchLists.startDate))
    .all();

export const toWatchListDto = (list: WatchListRow, pet: PetRow, lang: Language, today = todayInFinland()) => {
  const template = list.templateId ? symptomContent.watchListTemplates.find((t) => t.id === list.templateId) : null;
  return {
    id: list.id,
    templateId: list.templateId,
    condition: list.condition[lang],
    intro: template ? fillPet(template.intro[lang], pet.name) : null,
    source: list.source,
    vetName: list.vetName,
    recordId: list.recordId,
    startDate: list.startDate,
    endDate: list.endDate,
    /** Null for long-term conditions without an end date */
    totalDays: list.endDate ? daysBetween(list.startDate, list.endDate) + 1 : null,
    /** Day number of today in the list, e.g. day 3 of 10 */
    currentDay: isActiveOn(list, today) ? daysBetween(list.startDate, today) + 1 : null,
    active: isActiveOn(list, today),
    questions: list.questions.map((q) => toQuestionDto(q, lang, "watchList", list.id)),
  };
};

const templateQuestions = (template: WatchListTemplate): StoredQuestion[] => template.questions.map((q) => ({ ...q }));

/** Text of a passport record that is matched against the templates' diagnosis keywords. */
const recordText = (record: HealthRecordRow) => {
  const data = record.data as Record<string, string | null>;
  const parts = record.kind === "visit" ? [data.diagnosis, data.reason] : record.kind === "surgery" ? [data.name] : [];
  return parts.filter(Boolean).join(" ").toLowerCase();
};

/** Templates that fit a visit or surgery. Any surgery gets the post-surgery list. */
export const templatesForRecord = (record: HealthRecordRow, species: PetRow["species"]) => {
  const text = recordText(record);
  return symptomContent.watchListTemplates.filter(
    (template) =>
      template.species.includes(species) &&
      ((record.kind === "surgery" && template.id === "post-surgery") ||
        (record.kind !== "allergy" && text !== "" && template.diagnosisKeywords.some((keyword) => text.includes(keyword)))),
  );
};

const recordDate = (record: HealthRecordRow) => record.date ?? todayInFinland();

/**
 * After a visit or surgery is added to the passport, starts the matching watch lists
 * (spec 1: "after a visit, the app creates a watch list based on this diagnosis").
 * Skips lists that would already have ended and templates that are already being watched.
 */
export const startWatchListsForRecord = (
  db: Db,
  pet: PetRow,
  record: HealthRecordRow,
  userId: string | null,
  today = todayInFinland(),
) => {
  if (record.kind !== "visit" && record.kind !== "surgery") {
    return [];
  }
  const startDate = recordDate(record);
  const active = activeWatchLists(db, pet.id, today);
  const created: WatchListRow[] = [];
  for (const template of templatesForRecord(record, pet.species)) {
    const endDate = template.defaultDays === null ? null : addDays(startDate, template.defaultDays - 1);
    if ((endDate !== null && endDate < today) || active.some((list) => list.templateId === template.id)) {
      continue;
    }
    created.push(
      db
        .insert(watchLists)
        .values({
          id: randomUUID(),
          petId: pet.id,
          templateId: template.id,
          condition: template.condition,
          questions: templateQuestions(template),
          source: "guidance",
          vetName: null,
          recordId: record.id,
          startDate,
          endDate,
          createdByUserId: userId,
          updatedAt: Date.now(),
        })
        .returning()
        .get(),
    );
  }
  return created;
};

/** Templates suggested by the passport that are not being watched right now. */
export const suggestedTemplates = (db: Db, pet: PetRow, today = todayInFinland()) => {
  const active = new Set(activeWatchLists(db, pet.id, today).map((list) => list.templateId));
  const suggestions = new Map<string, { template: WatchListTemplate; record: HealthRecordRow }>();
  for (const record of listRecords(db, pet.id)) {
    for (const template of templatesForRecord(record, pet.species)) {
      if (!active.has(template.id) && !suggestions.has(template.id)) {
        suggestions.set(template.id, { template, record });
      }
    }
  }
  return [...suggestions.values()];
};

type CustomQuestionInput = {
  id?: string;
  label: string;
  options: [string, string, string];
  usualAnswer?: Answer;
  yellowIf?: Answer[];
  redIf?: Answer[];
  emergencyIf?: Answer[];
  symptoms?: Partial<Record<"0" | "1" | "2", string[]>>;
};

export type CreateWatchListInput = {
  templateId?: string;
  condition?: string;
  questions?: CustomQuestionInput[];
  startDate?: string;
  endDate?: string | null;
  days?: number;
  vetName?: string;
  recordId?: string;
};

const generalQuestionIds = new Set(symptomContent.generalQuestions.map((q) => q.id));
const knownSymptoms = new Set(symptomContent.symptoms.map((s) => s.id));

const toStoredQuestion = (input: CustomQuestionInput): StoredQuestion => {
  const id = input.id ?? `custom-${randomUUID().slice(0, 8)}`;
  if (generalQuestionIds.has(id)) {
    throw badRequest("QUESTION_ID_TAKEN", `Question id ${id} is used by a general question`);
  }
  const symptoms = input.symptoms ?? {};
  for (const symptom of Object.values(symptoms).flat()) {
    if (!knownSymptoms.has(symptom)) {
      throw badRequest("UNKNOWN_SYMPTOM", `Unknown symptom ${symptom}`);
    }
  }
  return {
    id,
    label: sameInAllLanguages(input.label),
    options: input.options.map(sameInAllLanguages) as StoredQuestion["options"],
    usualAnswer: input.usualAnswer ?? 1,
    yellowIf: input.yellowIf ?? [],
    redIf: input.redIf ?? [],
    emergencyIf: input.emergencyIf ?? [],
    symptoms,
  };
};

export const createWatchList = (
  db: Db,
  pet: PetRow,
  userId: string,
  input: CreateWatchListInput,
  records: HealthRecordRow[],
  today = todayInFinland(),
) => {
  const template = input.templateId ? symptomContent.watchListTemplates.find((t) => t.id === input.templateId) : null;
  if (input.templateId && !template) {
    throw notFound("TEMPLATE_NOT_FOUND", "No such watch list template");
  }
  if (template && !template.species.includes(pet.species)) {
    throw badRequest("TEMPLATE_WRONG_SPECIES", "This watch list is not meant for this species");
  }
  if (!template && (!input.condition || !input.questions?.length)) {
    throw badRequest("CONDITION_REQUIRED", "Without a template, give the condition and the questions");
  }
  if (input.recordId && !records.some((r) => r.id === input.recordId && (r.kind === "visit" || r.kind === "surgery"))) {
    throw notFound("RECORD_NOT_FOUND", "No such visit or surgery in this pet's passport");
  }

  const questions = input.questions?.length ? input.questions.map(toStoredQuestion) : templateQuestions(template!);
  if (new Set(questions.map((q) => q.id)).size !== questions.length) {
    throw badRequest("DUPLICATE_QUESTION", "Question ids must be unique");
  }
  const startDate = input.startDate ?? today;
  const days = input.days ?? template?.defaultDays ?? null;
  const endDate = input.endDate !== undefined ? input.endDate : days === null ? null : addDays(startDate, days - 1);
  if (endDate !== null && endDate < startDate) {
    throw badRequest("INVALID_DATES", "endDate is before startDate");
  }

  return db
    .insert(watchLists)
    .values({
      id: randomUUID(),
      petId: pet.id,
      templateId: template?.id ?? null,
      condition: input.condition ? sameInAllLanguages(input.condition) : template!.condition,
      questions,
      // Thresholds written from the vet's instructions take priority over the template's.
      source: input.questions?.length || input.vetName ? "vet" : "guidance",
      vetName: input.vetName ?? null,
      recordId: input.recordId ?? null,
      startDate,
      endDate,
      createdByUserId: userId,
      updatedAt: Date.now(),
    })
    .returning()
    .get();
};

export const getWatchList = (db: Db, petId: string, watchListId: string) => {
  const row = db
    .select()
    .from(watchLists)
    .where(and(eq(watchLists.id, watchListId), eq(watchLists.petId, petId)))
    .get();
  if (!row) {
    throw notFound("WATCH_LIST_NOT_FOUND", "No such watch list for this pet");
  }
  return row;
};

export type UpdateWatchListInput = {
  endDate?: string | null;
  end?: boolean;
  vetName?: string | null;
  thresholds?: { questionId: string; yellowIf: Answer[]; redIf: Answer[]; emergencyIf?: Answer[] }[];
};

/** Ends the list early, changes the end date, or sets the vet's own thresholds. */
export const updateWatchList = (
  db: Db,
  petId: string,
  watchListId: string,
  input: UpdateWatchListInput,
  today = todayInFinland(),
) => {
  const list = getWatchList(db, petId, watchListId);
  const changes: Partial<WatchListRow> = { updatedAt: Date.now() };
  if (input.end) {
    changes.endDate = today < list.startDate ? list.startDate : today;
  } else if (input.endDate !== undefined) {
    if (input.endDate !== null && input.endDate < list.startDate) {
      throw badRequest("INVALID_DATES", "endDate is before startDate");
    }
    changes.endDate = input.endDate;
  }
  if (input.vetName !== undefined) {
    changes.vetName = input.vetName;
  }
  if (input.thresholds?.length) {
    const byId = new Map(input.thresholds.map((t) => [t.questionId, t]));
    for (const id of byId.keys()) {
      if (!list.questions.some((q) => q.id === id)) {
        throw badRequest("UNKNOWN_QUESTION", `No question ${id} in this watch list`);
      }
    }
    changes.questions = list.questions.map((q) => {
      const t = byId.get(q.id);
      return t ? { ...q, yellowIf: t.yellowIf, redIf: t.redIf, emergencyIf: t.emergencyIf ?? q.emergencyIf } : q;
    });
    changes.source = "vet";
  }
  return db.update(watchLists).set(changes).where(eq(watchLists.id, list.id)).returning().get();
};

export const deleteWatchList = (db: Db, petId: string, watchListId: string) => {
  getWatchList(db, petId, watchListId);
  db.delete(watchLists).where(eq(watchLists.id, watchListId)).run();
};

// ---- Questions for a day's log ----

/** Watch list questions first, then the general ones (as in the client's daily log screen). */
export const questionsFor = (db: Db, petId: string, date: string) => {
  const lists = activeWatchLists(db, petId, date);
  const fromLists: (AssessedQuestion & { watchListId: string | null })[] = lists.flatMap((list) =>
    list.questions.map((question) => ({
      question,
      source: "watchList" as const,
      condition: list.condition,
      watchListId: list.id,
    })),
  );
  const general = symptomContent.generalQuestions.map((question: Question) => ({
    question,
    source: "general" as const,
    watchListId: null,
  }));
  return { lists, questions: [...fromLists, ...general] };
};

// ---- History for the assessment ----

const endOfDayInFinland = (isoDate: string) => Date.parse(`${isoDate}T23:59:59+03:00`);

export const historyFor = (db: Db, pet: PetRow, date: string) => {
  const records = listRecords(db, pet.id);
  const upTo = (field: string) => (record: HealthRecordRow) => {
    const value = (record.data as Record<string, string | null>)[field];
    return typeof value === "string" && value <= date;
  };
  const data = (record: HealthRecordRow) => record.data as Record<string, string | null>;

  const windowStart = addDays(date, -Math.max(symptomContent.severity.baseline.windowDays, 31));
  const logs = db
    .select()
    .from(dailyLogs)
    .where(and(eq(dailyLogs.petId, pet.id), gte(dailyLogs.loggedOn, windowStart), lt(dailyLogs.loggedOn, date)))
    .all()
    .map((log) => ({ loggedOn: log.loggedOn, answers: log.answers, symptoms: log.assessment.symptoms }));

  const now = Math.min(Date.now(), endOfDayInFinland(date));
  const exposureRows = db
    .select()
    .from(exposures)
    .where(
      and(
        eq(exposures.petId, pet.id),
        gte(exposures.occurredAt, now - symptomContent.severity.exposure.withinHours * 60 * 60 * 1000),
      ),
    )
    .all();

  return {
    now,
    history: {
      diagnoses: records
        .filter((r) => r.kind === "visit" && upTo("visitedOn")(r))
        .flatMap((r) => [data(r).diagnosis, data(r).reason].filter((t): t is string => Boolean(t))),
      medications: records
        .filter((r) => r.kind === "medication" && upTo("startDate")(r))
        .filter((r) => !data(r).endDate || (data(r).endDate as string) >= date)
        .map((r) => data(r).name ?? ""),
      surgeryDates: records
        .filter((r) => r.kind === "surgery" && upTo("performedOn")(r))
        .map((r) => data(r).performedOn as string),
      hasRecords: records.length > 0,
      logs,
      exposures: exposureRows.map((e) => {
        const substance = findSubstance(e.substanceId);
        return {
          substanceName: substance
            ? { fi: substance.names.fi[0], sv: substance.names.sv[0], en: substance.names.en[0] }
            : sameInAllLanguages(e.substanceId),
          riskLevel: e.riskLevel,
          occurredAt: e.occurredAt,
        };
      }),
    },
  };
};

// ---- Rendering an assessment in a language ----

const listFormat = (lang: Language) =>
  new Intl.ListFormat({ fi: "fi-FI", sv: "sv-SE", en: "en-GB" }[lang], { type: "conjunction" });

const renderParam = (value: string | number | string[] | LocalizedText, key: string, lang: Language) => {
  if (typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return listFormat(lang).format(value.map((id) => symptomLabel(id, lang)));
  }
  if (typeof value === "object") {
    return value[lang];
  }
  return key === "symptom" ? symptomLabel(value, lang) : value;
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const renderAssessment = (assessment: StoredAssessment, lang: Language) => {
  const level = assessment.level;
  return {
    level,
    trafficLight: trafficLightFor(level),
    title: symptomContent.levels[level].title[lang],
    action: symptomContent.levels[level].action[lang],
    /** Show the nearest emergency clinic and its contact details (spec 1: red) */
    showEmergencyClinics: level === "contactVet" || level === "emergency",
    reasons: assessment.reasons.map((reason) => {
      const template = symptomContent.reasons[reason.code as keyof typeof symptomContent.reasons]?.[lang] ?? reason.code;
      const text = template.replace(/\{(\w+)\}/g, (match, key: string) =>
        key in reason.params ? renderParam(reason.params[key], key, lang) : match,
      );
      return { code: reason.code, level: reason.level, text: capitalize(text) };
    }),
    symptoms: assessment.symptoms.map((id) => ({ id, label: symptomLabel(id, lang) })),
    insufficientData: assessment.insufficientData,
    disclaimer: symptomContent.disclaimer[lang],
  };
};

// ---- Daily logs ----

export type LogInput = {
  answers: Record<string, Answer>;
  emergencySymptoms: string[];
  symptoms: string[];
  note?: string | null;
};

/** Checks the answers against the questions of that day and runs the assessment. */
export const assessLog = (db: Db, pet: PetRow, date: string, input: LogInput) => {
  const { questions } = questionsFor(db, pet.id, date);
  const byId = new Map(questions.map((q) => [q.question.id, q.question]));
  for (const id of Object.keys(input.answers)) {
    if (!byId.has(id)) {
      throw badRequest("UNKNOWN_QUESTION", `Question ${id} is not part of this day's log`);
    }
  }
  const emergencyIds = new Set(emergencyListFor(pet.species, "en").map((e) => e.symptom));
  for (const id of input.emergencySymptoms) {
    if (!emergencyIds.has(id)) {
      throw badRequest("UNKNOWN_SYMPTOM", `${id} is not on the emergency list for this species`);
    }
  }
  for (const id of input.symptoms) {
    if (!knownSymptoms.has(id)) {
      throw badRequest("UNKNOWN_SYMPTOM", `Unknown symptom ${id}`);
    }
  }
  if (Object.keys(input.answers).length + input.emergencySymptoms.length + input.symptoms.length === 0) {
    throw badRequest("EMPTY_LOG", "Answer at least one question or add a symptom");
  }

  const { now, history } = historyFor(db, pet, date);
  return assess({
    pet: { name: pet.name, species: pet.species, ageMonths: ageInMonths(pet.birthDate, date) },
    date,
    now,
    questions,
    answers: input.answers,
    emergencySymptoms: input.emergencySymptoms,
    extraSymptoms: input.symptoms,
    history,
  });
};

/** Saves the day's log; a second log on the same day replaces the first (attachments are kept). */
export const saveLog = (db: Db, pet: PetRow, userId: string, date: string, input: LogInput, today = todayInFinland()) => {
  if (date > today) {
    throw badRequest("LOG_DATE_IN_FUTURE", "A log can't be saved for a future date");
  }
  const assessment = assessLog(db, pet, date, input);
  const values = {
    answers: input.answers,
    emergencySymptoms: input.emergencySymptoms,
    extraSymptoms: input.symptoms,
    note: input.note ?? null,
    level: assessment.level,
    assessment,
    createdByUserId: userId,
    updatedAt: Date.now(),
  };
  return db
    .insert(dailyLogs)
    .values({ id: randomUUID(), petId: pet.id, loggedOn: date, ...values })
    .onConflictDoUpdate({ target: [dailyLogs.petId, dailyLogs.loggedOn], set: values })
    .returning()
    .get();
};

export const getLog = (db: Db, petId: string, date: string) => {
  const row = db
    .select()
    .from(dailyLogs)
    .where(and(eq(dailyLogs.petId, petId), eq(dailyLogs.loggedOn, date)))
    .get();
  if (!row) {
    throw notFound("LOG_NOT_FOUND", "No log for this pet on that day");
  }
  return row;
};

export const listLogs = (db: Db, petId: string, from: string, to: string) =>
  db
    .select()
    .from(dailyLogs)
    .where(and(eq(dailyLogs.petId, petId), gte(dailyLogs.loggedOn, from), lte(dailyLogs.loggedOn, to)))
    .orderBy(desc(dailyLogs.loggedOn))
    .all();

export const attachmentsFor = (db: Db, logIds: string[]) =>
  logIds.length === 0
    ? []
    : db
        .select()
        .from(logAttachments)
        .where(inArray(logAttachments.logId, logIds))
        .orderBy(asc(logAttachments.createdAt))
        .all();

/** Every attachment file of a pet, so they can be deleted with the pet. */
export const attachmentKeysForPet = (db: Db, petId: string) =>
  db
    .select({ fileKey: logAttachments.fileKey })
    .from(logAttachments)
    .innerJoin(dailyLogs, eq(dailyLogs.id, logAttachments.logId))
    .where(eq(dailyLogs.petId, petId))
    .all()
    .map((row) => row.fileKey);

export const toAttachmentDto = (attachment: LogAttachmentRow, petId: string, date: string) => ({
  id: attachment.id,
  mediaType: attachment.mediaType,
  contentType: attachment.contentType,
  sizeBytes: attachment.sizeBytes,
  url: `/pets/${petId}/logs/${date}/attachments/${attachment.id}`,
  createdAt: attachment.createdAt,
});

export const toLogDto = (log: DailyLogRow, attachments: LogAttachmentRow[], lang: Language) => ({
  id: log.id,
  date: log.loggedOn,
  answers: log.answers,
  emergencySymptoms: log.emergencySymptoms,
  symptoms: log.extraSymptoms,
  note: log.note,
  assessment: renderAssessment(log.assessment, lang),
  attachments: attachments.filter((a) => a.logId === log.id).map((a) => toAttachmentDto(a, log.petId, log.loggedOn)),
  outcome: log.outcomeLevel
    ? {
        level: log.outcomeLevel,
        recordId: log.outcomeRecordId,
        note: log.outcomeNote,
        recordedAt: log.outcomeRecordedAt as number,
        /** Whether the app's assessment matched what the vet found */
        matched: log.outcomeLevel === log.level,
      }
    : null,
  createdAt: log.createdAt,
  updatedAt: log.updatedAt,
});

export const setOutcome = (
  db: Db,
  pet: PetRow,
  date: string,
  input: { level: SeverityLevel; recordId?: string | null; note?: string | null },
) => {
  const log = getLog(db, pet.id, date);
  if (input.recordId && !listRecords(db, pet.id).some((r) => r.id === input.recordId && r.kind === "visit")) {
    throw notFound("RECORD_NOT_FOUND", "No such visit in this pet's passport");
  }
  return db
    .update(dailyLogs)
    .set({
      outcomeLevel: input.level,
      outcomeRecordId: input.recordId ?? null,
      outcomeNote: input.note ?? null,
      outcomeRecordedAt: Date.now(),
    })
    .where(eq(dailyLogs.id, log.id))
    .returning()
    .get();
};

// ---- Status and trends ----

export const healthStatus = (db: Db, pet: PetRow, lang: Language, today = todayInFinland()) => {
  const latest = db
    .select()
    .from(dailyLogs)
    .where(and(eq(dailyLogs.petId, pet.id), lte(dailyLogs.loggedOn, today)))
    .orderBy(desc(dailyLogs.loggedOn))
    .get();
  const stale = !latest || daysBetween(latest.loggedOn, today) >= symptomContent.severity.statusValidDays;
  const level: SeverityLevel = stale ? "normal" : latest.level;
  return {
    petId: pet.id,
    level,
    trafficLight: trafficLightFor(level),
    title: symptomContent.levels[level].title[lang],
    action: symptomContent.levels[level].action[lang],
    showEmergencyClinics: level === "contactVet" || level === "emergency",
    /** True when the latest log is too old to decide the status */
    stale,
    loggedToday: latest?.loggedOn === today,
    latestLog: latest ? toLogDto(latest, attachmentsFor(db, [latest.id]), lang) : null,
    watchLists: activeWatchLists(db, pet.id, today).map((list) => toWatchListDto(list, pet, lang, today)),
    disclaimer: symptomContent.disclaimer[lang],
  };
};

/** Monday of the ISO week. */
const weekStartOf = (isoDate: string) => {
  const weekday = (new Date(`${isoDate}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(isoDate, -weekday);
};

/** Weekly charts (spec 1): how often each answer was given, the worst level and the weight. */
export const trends = (db: Db, pet: PetRow, weeks: number, lang: Language, today = todayInFinland()) => {
  const firstWeek = addDays(weekStartOf(today), -7 * (weeks - 1));
  const weekStarts = Array.from({ length: weeks }, (_, i) => addDays(firstWeek, 7 * i));
  const logs = listLogs(db, pet.id, firstWeek, today);
  const weights = db
    .select()
    .from(weightEntries)
    .where(and(eq(weightEntries.petId, pet.id), gte(weightEntries.weighedOn, firstWeek)))
    .orderBy(asc(weightEntries.weighedOn))
    .all();

  // Every question answered in the period: general ones, then watch list ones (also ended lists).
  const questionMap = new Map<string, { question: StoredQuestion; source: "general" | "watchList" }>();
  for (const question of symptomContent.generalQuestions) {
    questionMap.set(question.id, { question, source: "general" });
  }
  const answered = new Set(logs.flatMap((log) => Object.keys(log.answers)));
  for (const list of listWatchLists(db, pet.id)) {
    for (const question of list.questions) {
      if (answered.has(question.id) && !questionMap.has(question.id)) {
        questionMap.set(question.id, { question, source: "watchList" });
      }
    }
  }

  const logsInWeek = (start: string) => logs.filter((log) => log.loggedOn >= start && log.loggedOn <= addDays(start, 6));

  return {
    weeks: weekStarts.map((start) => {
      const weekLogs = logsInWeek(start);
      const levels = Object.fromEntries(severityLevels.map((l) => [l, 0])) as Record<SeverityLevel, number>;
      for (const log of weekLogs) {
        levels[log.level] += 1;
      }
      const weekWeights = weights.filter((w) => w.weighedOn >= start && w.weighedOn <= addDays(start, 6));
      return {
        weekStart: start,
        weekEnd: addDays(start, 6),
        loggedDays: weekLogs.length,
        worstLevel: weekLogs.reduce<SeverityLevel | null>((worst, log) => (worst ? maxLevel(worst, log.level) : log.level), null),
        levels,
        /** The last weigh-in of the week */
        weightKg: weekWeights.at(-1)?.weightKg ?? null,
      };
    }),
    questions: [...questionMap.values()].map(({ question, source }) => ({
      ...toQuestionDto(question, lang, source),
      weeks: weekStarts.map((start) => {
        const counts: [number, number, number] = [0, 0, 0];
        for (const log of logsInWeek(start)) {
          const answer = log.answers[question.id];
          if (answer !== undefined) {
            counts[answer] += 1;
          }
        }
        return {
          weekStart: start,
          answers: counts,
          /** Days with an answer other than "as usual" */
          unusualDays: counts.reduce((sum, count, answer) => sum + (answer === question.usualAnswer ? 0 : count), 0),
        };
      }),
    })),
  };
};
