import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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

// ---- Health passport (spec 4) ----

export const healthRecordKinds = ["vaccination", "medication", "allergy", "surgery", "visit"] as const;
export type HealthRecordKind = (typeof healthRecordKinds)[number];

/**
 * One entry in a pet's health passport. The fields that differ per kind live in `data` (JSON),
 * validated by the kind's schema in modules/passport/records.ts.
 */
export const healthRecords = sqliteTable("health_records", {
  id: text("id").primaryKey(),
  petId: text("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: healthRecordKinds }).notNull(),
  /** The record's main date (ISO), used for sorting. Null if unknown, e.g. an allergy. */
  date: text("date"),
  data: text("data", { mode: "json" }).notNull().$type<Record<string, unknown>>(),
  createdAt: createdAt(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const shareRecipients = ["vet", "petCare", "other"] as const;
export const passportSections = ["vaccinations", "medications", "allergies", "surgeries", "visits"] as const;
export type PassportSection = (typeof passportSections)[number];

/**
 * A read-only link to a pet's passport for a vet or pet care facility. Creating one is the
 * owner's consent to share; the row is kept after expiry or revocation as a record of it.
 */
export const passportShares = sqliteTable("passport_shares", {
  id: text("id").primaryKey(),
  petId: text("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  createdByUserId: text("created_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  recipientType: text("recipient_type", { enum: shareRecipients }).notNull(),
  recipientName: text("recipient_name"),
  sections: text("sections", { mode: "json" }).notNull().$type<PassportSection[]>(),
  /** Language of the shared page: fi, sv or en */
  language: text("language").notNull(),
  expiresAt: integer("expires_at", { mode: "number" }).notNull(),
  revokedAt: integer("revoked_at", { mode: "number" }),
  accessCount: integer("access_count").notNull().default(0),
  lastAccessedAt: integer("last_accessed_at", { mode: "number" }),
  createdAt: createdAt(),
});

export type HealthRecordRow = typeof healthRecords.$inferSelect;
export type PassportShareRow = typeof passportShares.$inferSelect;

// ---- Diet and weight (spec 3) ----

/** One weighing. At most one per pet per day; a second one the same day replaces the first. */
export const weightEntries = sqliteTable(
  "weight_entries",
  {
    id: text("id").primaryKey(),
    petId: text("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    /** ISO date */
    weighedOn: text("weighed_on").notNull(),
    weightKg: real("weight_kg").notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("weight_entries_pet_day").on(table.petId, table.weighedOn)],
);

export const dietTypes = [
  "maintenance",
  "weightLoss",
  "kidney",
  "urinary",
  "hypoallergenic",
  "gastrointestinal",
  "diabetes",
] as const;
export type DietType = (typeof dietTypes)[number];

export const activityLevels = ["low", "normal", "high"] as const;
export type ActivityLevel = (typeof activityLevels)[number];

/** The pet's current diet: what it eats and the settings the portion calculator needs. */
export const dietPlans = sqliteTable("diet_plans", {
  petId: text("pet_id")
    .primaryKey()
    .references(() => pets.id, { onDelete: "cascade" }),
  dietType: text("diet_type", { enum: dietTypes }).notNull(),
  /** Who chose the diet: the vet's instructions or the owner */
  source: text("source", { enum: ["vet", "owner"] }).notNull(),
  foodName: text("food_name").notNull(),
  /** Energy density from the food package, kcal per 100 g */
  kcalPer100g: real("kcal_per_100g"),
  mealsPerDay: integer("meals_per_day").notNull(),
  targetWeightKg: real("target_weight_kg"),
  neutered: integer("neutered", { mode: "boolean" }),
  activityLevel: text("activity_level", { enum: activityLevels }).notNull(),
  notes: text("notes"),
  /** Set when the food changed: the old food is mixed out gradually from this date. */
  previousFoodName: text("previous_food_name"),
  transitionStartedOn: text("transition_started_on"),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  createdAt: createdAt(),
});

export type WeightEntryRow = typeof weightEntries.$inferSelect;
export type DietPlanRow = typeof dietPlans.$inferSelect;

// ---- Knowledge base (spec 10) ----

/** "My pet ate this": what was eaten, when, and the risk the app gave at that moment. */
export const exposures = sqliteTable("exposures", {
  id: text("id").primaryKey(),
  petId: text("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  /** Id in content/knowledge-base.json */
  substanceId: text("substance_id").notNull(),
  variantId: text("variant_id"),
  amount: real("amount"),
  /** Epoch ms */
  occurredAt: integer("occurred_at", { mode: "number" }).notNull(),
  riskLevel: text("risk_level", { enum: ["harmless", "caution", "dangerous", "emergency"] }).notNull(),
  mgPerKg: real("mg_per_kg"),
  note: text("note"),
  createdByUserId: text("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export type ExposureRow = typeof exposures.$inferSelect;

// ---- Seasonal alerts and push notifications (spec 9) ----

/** Push registration for one signed-in device. Removed with the session when it signs out. */
export const pushDevices = sqliteTable("push_devices", {
  sessionId: text("session_id")
    .primaryKey()
    .references(() => deviceSessions.id, { onDelete: "cascade" }),
  expoPushToken: text("expo_push_token").notNull(),
  platform: text("platform", { enum: ["ios", "android"] }).notNull(),
  language: text("language", { enum: ["fi", "sv", "en"] }).notNull(),
  /** Rounded to 1 decimal (about 10 km): enough to pick the region, not to locate a home. */
  latitude: real("latitude"),
  longitude: real("longitude"),
  seasonalAlerts: integer("seasonal_alerts", { mode: "boolean" }).notNull().default(true),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  createdAt: createdAt(),
});

/** Which seasonal card has been pushed to which device, so each is sent once per season. */
export const seasonalNotificationsSent = sqliteTable(
  "seasonal_notifications_sent",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => deviceSessions.id, { onDelete: "cascade" }),
    cardId: text("card_id").notNull(),
    /** The year the card's window started, e.g. 2026 for Dec 2026 – Jan 2027 */
    seasonYear: integer("season_year").notNull(),
    sentAt: integer("sent_at", { mode: "number" }).notNull(),
  },
  (table) => [uniqueIndex("seasonal_sent_once").on(table.sessionId, table.cardId, table.seasonYear)],
);

export type PushDeviceRow = typeof pushDevices.$inferSelect;
