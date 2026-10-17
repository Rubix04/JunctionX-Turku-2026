import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Timestamps are stored as epoch milliseconds.
const createdAt = () =>
  integer("created_at", { mode: "number" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

/** A family account. All users in a household see the same pets and reminders (spec 11). */
export const households = sqliteTable("households", {
  id: text("id").primaryKey(),
  createdAt: createdAt(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  householdId: text("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  /** Keyed hash of the identity from online banking. The national ID itself is never stored. */
  identityHash: text("identity_hash").notNull().unique(),
  createdAt: createdAt(),
});

/**
 * One signed-in device (spec 13: persistent login). The device keeps the refresh token in its
 * secure storage behind the biometric/PIN lock; the server only stores a hash of it.
 */
export const deviceSessions = sqliteTable("device_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  deviceName: text("device_name").notNull(),
  refreshTokenHash: text("refresh_token_hash").notNull().unique(),
  /** Hash of the token that was rotated out. Seeing it again means the token was stolen. */
  previousRefreshTokenHash: text("previous_refresh_token_hash"),
  /** Last online banking authentication on this device. */
  bankAuthAt: integer("bank_auth_at", { mode: "number" }).notNull(),
  lastUsedAt: integer("last_used_at", { mode: "number" }).notNull(),
  revokedAt: integer("revoked_at", { mode: "number" }),
  createdAt: createdAt(),
});

export const species = ["cat", "dog", "smallAnimal"] as const;
export type Species = (typeof species)[number];

export const pets = sqliteTable("pets", {
  id: text("id").primaryKey(),
  householdId: text("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  species: text("species", { enum: species }).notNull(),
  breed: text("breed"),
  /** ISO date, e.g. "2019-05-14" */
  birthDate: text("birth_date"),
  weightKg: real("weight_kg"),
  /** File name of the profile picture in the upload folder, or null for the species default. */
  photoKey: text("photo_key"),
  createdAt: createdAt(),
});

export type UserRow = typeof users.$inferSelect;
export type DeviceSessionRow = typeof deviceSessions.$inferSelect;
export type PetRow = typeof pets.$inferSelect;
