import { createHash, randomBytes, randomUUID } from "node:crypto";

import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import type { z } from "zod";

import type { Db } from "../../db/client.js";
import {
  type HealthRecordKind,
  type HealthRecordRow,
  healthRecords,
  type PassportSection,
  type PassportShareRow,
  passportSections,
  passportShares,
  type PetRow,
} from "../../db/schema.js";
import { ApiError, notFound } from "../../errors.js";
import { kinds, outputSchemas } from "./records.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRING_SOON_DAYS = 30;

/** Today's date (YYYY-MM-DD) in Finland, so "expired" flips at local midnight. */
export const todayInFinland = (now = new Date()) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Helsinki" }).format(now);

const addDays = (isoDate: string, days: number) =>
  new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

const validationError = (error: z.ZodError) =>
  new ApiError(
    400,
    "VALIDATION_ERROR",
    "The request is invalid",
    error.issues.map((issue) => ({ path: `/${issue.path.join("/")}`, message: issue.message })),
  );

// ---- Records ----

type RecordDto<K extends HealthRecordKind> = z.infer<(typeof outputSchemas)[K]>;

export const toRecordDto = (row: HealthRecordRow, today = todayInFinland()) => {
  const data = row.data as Record<string, string | null>;
  const base = { ...data, id: row.id, createdAt: row.createdAt, updatedAt: row.updatedAt };

  if (row.kind === "vaccination") {
    const validUntil = data.validUntil;
    const status = !validUntil
      ? "noExpiry"
      : validUntil < today
        ? "expired"
        : validUntil <= addDays(today, EXPIRING_SOON_DAYS)
          ? "expiringSoon"
          : "valid";
    return { ...base, status };
  }
  if (row.kind === "medication") {
    return { ...base, active: !data.endDate || data.endDate >= today };
  }
  return base;
};

/** Validates input for a kind and fills missing optional fields with null. */
const parseRecordData = (kind: HealthRecordKind, input: unknown) => {
  const result = kinds[kind].input.safeParse(input);
  if (!result.success) {
    throw validationError(result.error);
  }
  const data: Record<string, unknown> = {};
  for (const key of Object.keys(kinds[kind].input.shape)) {
    data[key] = (result.data as Record<string, unknown>)[key] ?? null;
  }
  return data;
};

const dateOf = (kind: HealthRecordKind, data: Record<string, unknown>) =>
  (data[kinds[kind].dateField] as string | null) ?? null;

export const listRecords = (db: Db, petId: string) =>
  db
    .select()
    .from(healthRecords)
    .where(eq(healthRecords.petId, petId))
    // Newest first; records without a date (e.g. an allergy) after dated ones.
    .orderBy(sql`${healthRecords.date} is null`, desc(healthRecords.date), desc(healthRecords.createdAt))
    .all();

export type Passport = {
  vaccinations: RecordDto<"vaccination">[];
  medications: RecordDto<"medication">[];
  allergies: RecordDto<"allergy">[];
  surgeries: RecordDto<"surgery">[];
  visits: RecordDto<"visit">[];
};

/** Groups records into passport sections, keeping only the requested sections. */
export const groupPassport = (
  rows: HealthRecordRow[],
  sections: readonly PassportSection[] = passportSections,
): Partial<Passport> => {
  const today = todayInFinland();
  const passport: Record<string, unknown[]> = Object.fromEntries(sections.map((section) => [section, []]));
  for (const row of rows) {
    passport[kinds[row.kind].section]?.push(toRecordDto(row, today));
  }
  return passport as Partial<Passport>;
};

export const createRecord = (db: Db, petId: string, kind: HealthRecordKind, input: unknown) => {
  const data = parseRecordData(kind, input);
  return db
    .insert(healthRecords)
    .values({ id: randomUUID(), petId, kind, date: dateOf(kind, data), data, updatedAt: Date.now() })
    .returning()
    .get();
};

const getRecord = (db: Db, petId: string, kind: HealthRecordKind, recordId: string) => {
  const row = db
    .select()
    .from(healthRecords)
    .where(and(eq(healthRecords.id, recordId), eq(healthRecords.petId, petId), eq(healthRecords.kind, kind)))
    .get();
  if (!row) {
    throw notFound("RECORD_NOT_FOUND", "No such record in this pet's passport");
  }
  return row;
};

/** Applies a partial update; the merged record is validated as a whole. */
export const updateRecord = (
  db: Db,
  petId: string,
  kind: HealthRecordKind,
  recordId: string,
  patch: Record<string, unknown>,
) => {
  const existing = getRecord(db, petId, kind, recordId);
  const data = parseRecordData(kind, { ...existing.data, ...patch });
  return db
    .update(healthRecords)
    .set({ data, date: dateOf(kind, data), updatedAt: Date.now() })
    .where(eq(healthRecords.id, recordId))
    .returning()
    .get();
};

export const deleteRecord = (db: Db, petId: string, kind: HealthRecordKind, recordId: string) => {
  getRecord(db, petId, kind, recordId);
  db.delete(healthRecords).where(eq(healthRecords.id, recordId)).run();
};

// ---- Sharing ----

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type CreateShareInput = {
  recipientType: PassportShareRow["recipientType"];
  recipientName?: string | null;
  sections: PassportSection[];
  language: string;
  expiresInHours: number;
};

/** Creates a share link. The token is returned once; only its hash is stored. */
export const createShare = (db: Db, pet: PetRow, userId: string, input: CreateShareInput) => {
  const token = randomBytes(24).toString("base64url");
  const share = db
    .insert(passportShares)
    .values({
      id: randomUUID(),
      petId: pet.id,
      createdByUserId: userId,
      tokenHash: hashToken(token),
      recipientType: input.recipientType,
      recipientName: input.recipientName ?? null,
      sections: [...new Set(input.sections)],
      language: input.language,
      expiresAt: Date.now() + input.expiresInHours * 60 * 60 * 1000,
    })
    .returning()
    .get();
  return { share, token };
};

export const isShareActive = (share: PassportShareRow, now = Date.now()) =>
  share.revokedAt === null && share.expiresAt > now;

export const listShares = (db: Db, petId: string) =>
  db.select().from(passportShares).where(eq(passportShares.petId, petId)).orderBy(desc(passportShares.createdAt)).all();

export const revokeShare = (db: Db, petId: string, shareId: string) => {
  const share = db
    .select()
    .from(passportShares)
    .where(and(eq(passportShares.id, shareId), eq(passportShares.petId, petId)))
    .get();
  if (!share) {
    throw notFound("SHARE_NOT_FOUND", "No such share link");
  }
  if (share.revokedAt === null) {
    db.update(passportShares).set({ revokedAt: Date.now() }).where(eq(passportShares.id, shareId)).run();
  }
};

/** Finds an active share by its token and records the access. Returns null if invalid. */
export const openShare = (db: Db, token: string) => {
  const now = Date.now();
  const share = db
    .select()
    .from(passportShares)
    .where(
      and(
        eq(passportShares.tokenHash, hashToken(token)),
        isNull(passportShares.revokedAt),
        gt(passportShares.expiresAt, now),
      ),
    )
    .get();
  if (!share) {
    return null;
  }
  db.update(passportShares)
    .set({ accessCount: sql`${passportShares.accessCount} + 1`, lastAccessedAt: now })
    .where(eq(passportShares.id, share.id))
    .run();
  return share;
};

