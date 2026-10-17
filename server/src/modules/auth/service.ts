import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";

import { and, desc, eq, isNull, or } from "drizzle-orm";

import type { Db } from "../../db/client.js";
import { type DeviceSessionRow, deviceSessions, households, pets, type UserRow, users } from "../../db/schema.js";
import { notFound, unauthorized } from "../../errors.js";
import type { BankIdentity } from "./bank-provider.js";

const DAY_MS = 24 * 60 * 60 * 1000;

// Spec 13: online banking is needed again after a long period of inactivity.
export const SESSION_INACTIVITY_LIMIT_MS = 90 * DAY_MS;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const newRefreshToken = () => randomBytes(32).toString("base64url");

/** Keyed hash, so the national ID can't be recovered from the database or guessed offline. */
export const hashIdentity = (personId: string, secret: string) =>
  createHmac("sha256", secret).update(`identity:${personId}`).digest("hex");

// The pets used as examples in the TassuVahti spec, so a demo account isn't empty.
const DEMO_PETS = [
  { name: "Mirri", species: "cat", birthDate: "2017-04-02", weightKg: 4.6 },
  { name: "Rekku", species: "dog", breed: "Labrador", birthDate: "2021-08-19", weightKg: 31 },
] as const;

/** Finds the user for a bank identity, or creates the user and a new household. */
export const findOrCreateUser = (
  db: Db,
  identity: BankIdentity,
  options: { secret: string; seedDemoPets: boolean },
): UserRow => {
  const identityHash = hashIdentity(identity.personId, options.secret);
  const existing = db.select().from(users).where(eq(users.identityHash, identityHash)).get();
  if (existing) {
    return existing;
  }

  return db.transaction((tx) => {
    const householdId = randomUUID();
    tx.insert(households).values({ id: householdId }).run();
    const user = tx
      .insert(users)
      .values({ id: randomUUID(), householdId, displayName: identity.displayName, identityHash })
      .returning()
      .get();
    if (options.seedDemoPets) {
      tx.insert(pets)
        .values(DEMO_PETS.map((pet) => ({ ...pet, id: randomUUID(), householdId })))
        .run();
    }
    return user;
  });
};

/** Starts a session for a device after online banking. Returns the refresh token once. */
export const createDeviceSession = (db: Db, userId: string, deviceName: string) => {
  const refreshToken = newRefreshToken();
  const now = Date.now();
  const session = db
    .insert(deviceSessions)
    .values({
      id: randomUUID(),
      userId,
      deviceName,
      refreshTokenHash: hashToken(refreshToken),
      bankAuthAt: now,
      lastUsedAt: now,
    })
    .returning()
    .get();
  return { session, refreshToken };
};

const revoke = (db: Db, sessionId: string) =>
  db.update(deviceSessions).set({ revokedAt: Date.now() }).where(eq(deviceSessions.id, sessionId)).run();

/**
 * Swaps a refresh token for a new one (rotation). Fails with 401 if the session was signed out,
 * has been inactive too long, or the token was already used (then the session is revoked,
 * because someone else has a copy of the token).
 */
export const rotateRefreshToken = (db: Db, refreshToken: string) => {
  const tokenHash = hashToken(refreshToken);
  const session = db
    .select()
    .from(deviceSessions)
    .where(
      or(
        eq(deviceSessions.refreshTokenHash, tokenHash),
        eq(deviceSessions.previousRefreshTokenHash, tokenHash),
      ),
    )
    .get();

  if (!session || session.revokedAt !== null) {
    throw unauthorized("SESSION_EXPIRED", "Sign in with online banking");
  }
  if (session.refreshTokenHash !== tokenHash) {
    revoke(db, session.id);
    throw unauthorized("SESSION_EXPIRED", "Sign in with online banking");
  }
  if (Date.now() - session.lastUsedAt > SESSION_INACTIVITY_LIMIT_MS) {
    revoke(db, session.id);
    throw unauthorized("SESSION_EXPIRED", "Sign in with online banking");
  }

  const nextToken = newRefreshToken();
  const updated = db
    .update(deviceSessions)
    .set({
      refreshTokenHash: hashToken(nextToken),
      previousRefreshTokenHash: tokenHash,
      lastUsedAt: Date.now(),
    })
    .where(eq(deviceSessions.id, session.id))
    .returning()
    .get();
  return { session: updated, refreshToken: nextToken };
};

export const markBankReauthenticated = (db: Db, sessionId: string): DeviceSessionRow =>
  db
    .update(deviceSessions)
    .set({ bankAuthAt: Date.now(), lastUsedAt: Date.now() })
    .where(eq(deviceSessions.id, sessionId))
    .returning()
    .get();

export const getUser = (db: Db, userId: string): UserRow => {
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) {
    throw unauthorized("UNAUTHORIZED", "User no longer exists");
  }
  return user;
};

export const listActiveSessions = (db: Db, userId: string) =>
  db
    .select()
    .from(deviceSessions)
    .where(and(eq(deviceSessions.userId, userId), isNull(deviceSessions.revokedAt)))
    .orderBy(desc(deviceSessions.lastUsedAt))
    .all();

/** Signs out one of the user's own devices. */
export const revokeSession = (db: Db, userId: string, sessionId: string) => {
  const session = db
    .select({ id: deviceSessions.id })
    .from(deviceSessions)
    .where(
      and(
        eq(deviceSessions.id, sessionId),
        eq(deviceSessions.userId, userId),
        isNull(deviceSessions.revokedAt),
      ),
    )
    .get();
  if (!session) {
    throw notFound("SESSION_NOT_FOUND", "No such signed-in device");
  }
  revoke(db, sessionId);
};
