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

/**
 * One weigh-in. Most come from vet visits (the visit's weight is copied here); owners can add
 * their own, e.g. from the clinic's waiting-room scale. At most one per pet per day.
 */
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
    source: text("source", { enum: ["vet", "owner"] }).notNull(),
    /** The passport visit this weight came from; removed with the visit */
    visitRecordId: text("visit_record_id").references(() => healthRecords.id, { onDelete: "cascade" }),
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

/** The pet's current diet and what the portion is based on: the food package's feeding table. */
export const dietPlans = sqliteTable("diet_plans", {
  petId: text("pet_id")
    .primaryKey()
    .references(() => pets.id, { onDelete: "cascade" }),
  dietType: text("diet_type", { enum: dietTypes }).notNull(),
  /** Who chose the diet: the vet's instructions or the owner */
  source: text("source", { enum: ["vet", "owner"] }).notNull(),
  foodName: text("food_name").notNull(),
  /** Daily amount from the package's feeding table, in grams... */
  packageDailyGrams: real("package_daily_grams"),
  /** ...for a pet of this weight */
  packageForWeightKg: real("package_for_weight_kg"),
  mealsPerDay: integer("meals_per_day").notNull(),
  goal: text("goal", { enum: ["maintain", "lose"] }).notNull(),
  targetWeightKg: real("target_weight_kg"),
  /** Optional: grams in the owner's scoop or decilitre measure, to show portions in scoops */
  gramsPerScoop: real("grams_per_scoop"),
  notes: text("notes"),
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
  /** Medication, follow-up visit and vaccination reminders (spec 2) */
  reminders: integer("reminders", { mode: "boolean" }).notNull().default(true),
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

// ---- Symptom tracking and severity assessment (spec 1 and 12) ----

export const severityLevels = ["normal", "monitor", "contactVet", "emergency"] as const;

/** Text in the three app languages. Watch list questions are stored with their texts. */
export type LocalizedText = { fi: string; sv: string; en: string };

export type StoredQuestion = {
  id: string;
  label: LocalizedText;
  options: [LocalizedText, LocalizedText, LocalizedText];
  usualAnswer: 0 | 1 | 2;
  yellowIf: (0 | 1 | 2)[];
  redIf: (0 | 1 | 2)[];
  emergencyIf: (0 | 1 | 2)[];
  symptoms: Partial<Record<"0" | "1" | "2", string[]>>;
};

/**
 * What to watch after a diagnosis (spec 1). Created from a vet-reviewed template when a visit or
 * surgery is added to the passport, or by hand. The questions and their thresholds are copied
 * here, so the vet's own limits for this pet can replace the template's.
 */
export const watchLists = sqliteTable("watch_lists", {
  id: text("id").primaryKey(),
  petId: text("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  /** Id in content/symptom-tracking.json, or null for a list written from the vet's instructions */
  templateId: text("template_id"),
  condition: text("condition", { mode: "json" }).notNull().$type<LocalizedText>(),
  questions: text("questions", { mode: "json" }).notNull().$type<StoredQuestion[]>(),
  /** guidance: thresholds from the reviewed template; vet: the vet's own limits for this pet */
  source: text("source", { enum: ["guidance", "vet"] }).notNull(),
  vetName: text("vet_name"),
  /** The passport visit or surgery that started it; removed with it */
  recordId: text("record_id").references(() => healthRecords.id, { onDelete: "cascade" }),
  /** ISO dates. No end date: watched until ended, e.g. kidney disease. */
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  createdByUserId: text("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  createdAt: createdAt(),
});

/** Why the assessment came out as it did. Stored with the log, without language. */
export type StoredReason = {
  code: string;
  level: (typeof severityLevels)[number];
  params: Record<string, string | number | string[] | LocalizedText>;
};

export type StoredAssessment = {
  level: (typeof severityLevels)[number];
  symptoms: string[];
  reasons: StoredReason[];
  insufficientData: boolean;
};

/** The 30-second daily log (spec 1) and its severity assessment (spec 12). One per pet per day. */
export const dailyLogs = sqliteTable(
  "daily_logs",
  {
    id: text("id").primaryKey(),
    petId: text("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    /** ISO date */
    loggedOn: text("logged_on").notNull(),
    /** Question id → answer index 0, 1 or 2 */
    answers: text("answers", { mode: "json" }).notNull().$type<Record<string, 0 | 1 | 2>>(),
    /** Ticked from the emergency list, e.g. breathingDifficulty */
    emergencySymptoms: text("emergency_symptoms", { mode: "json" }).notNull().$type<string[]>(),
    /** Other symptoms the owner added, e.g. coughing */
    extraSymptoms: text("extra_symptoms", { mode: "json" }).notNull().$type<string[]>(),
    note: text("note"),
    level: text("level", { enum: severityLevels }).notNull(),
    assessment: text("assessment", { mode: "json" }).notNull().$type<StoredAssessment>(),
    /** What the vet found afterwards, to compare the rules with real outcomes (spec 12) */
    outcomeLevel: text("outcome_level", { enum: severityLevels }),
    outcomeRecordId: text("outcome_record_id").references(() => healthRecords.id, { onDelete: "set null" }),
    outcomeNote: text("outcome_note"),
    outcomeRecordedAt: integer("outcome_recorded_at", { mode: "number" }),
    createdByUserId: text("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("daily_logs_pet_day").on(table.petId, table.loggedOn)],
);

/** A photo or video attached to a daily log, e.g. of limping. */
export const logAttachments = sqliteTable("log_attachments", {
  id: text("id").primaryKey(),
  logId: text("log_id")
    .notNull()
    .references(() => dailyLogs.id, { onDelete: "cascade" }),
  /** File name in the upload folder */
  fileKey: text("file_key").notNull().unique(),
  mediaType: text("media_type", { enum: ["image", "video"] }).notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  createdAt: createdAt(),
});

export type WatchListRow = typeof watchLists.$inferSelect;
export type DailyLogRow = typeof dailyLogs.$inferSelect;
export type LogAttachmentRow = typeof logAttachments.$inferSelect;

// ---- Care plan, medication schedules and reminders (spec 2) ----

export type FollowUp = {
  title: string;
  /** Local Finnish time, e.g. "2026-10-22T14:30:00" */
  dateTime: string;
  clinicName: string;
};

export type CarePlanProduct = {
  /** Id in the product list (spec 8), or null for a product written by hand */
  productId: string | null;
  name: string;
  brand: string;
  /** Prescription medicines go through the prescription, not the store map */
  prescription: { issuedTo: string; pickedUpOn: string | null } | null;
};

/**
 * What the vet found and what to do at home, in plain language, for one passport visit.
 * Written from uploaded notes it stays a draft until the clinic checks it.
 */
export const carePlans = sqliteTable("care_plans", {
  id: text("id").primaryKey(),
  petId: text("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  visitRecordId: text("visit_record_id")
    .notNull()
    .unique()
    .references(() => healthRecords.id, { onDelete: "cascade" }),
  diagnosis: text("diagnosis").notNull(),
  vetName: text("vet_name"),
  checkedByClinic: integer("checked_by_clinic", { mode: "boolean" }).notNull().default(false),
  findings: text("findings").notNull(),
  homeCare: text("home_care", { mode: "json" }).notNull().$type<string[]>(),
  followUp: text("follow_up", { mode: "json" }).$type<FollowUp | null>(),
  products: text("products", { mode: "json" }).notNull().$type<CarePlanProduct[]>(),
  /** The vet's notes as they were written or uploaded */
  originalText: text("original_text").notNull(),
  createdByUserId: text("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  createdAt: createdAt(),
});

/**
 * When to give a medicine. Its doses become medication reminders, generated a couple of weeks
 * ahead, so long-term medicines (e.g. insulin) work the same way as a 10-day course.
 */
export const medicationSchedules = sqliteTable("medication_schedules", {
  id: text("id").primaryKey(),
  petId: text("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  /** The passport medication it belongs to; removed with it */
  medicationRecordId: text("medication_record_id").references(() => healthRecords.id, { onDelete: "cascade" }),
  carePlanId: text("care_plan_id").references(() => carePlans.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  /** e.g. "1 tablet · with food" */
  detail: text("detail").notNull(),
  /** ISO date of the first dose */
  startDate: text("start_date").notNull(),
  /** Null for a long-term medicine without an end */
  totalDays: integer("total_days"),
  /** Dose times, local Finnish time, e.g. ["08:00", "20:00"] */
  times: text("times", { mode: "json" }).notNull().$type<string[]>(),
  /** Set when stopped early; no doses after this date */
  stoppedOn: text("stopped_on"),
  /** Doses exist up to and including this date */
  generatedUntil: text("generated_until"),
  createdByUserId: text("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  createdAt: createdAt(),
});

export const reminderKinds = ["medication", "visit", "vaccination", "deworming"] as const;
export type ReminderKind = (typeof reminderKinds)[number];
export const reminderSources = ["owner", "medication", "followUp", "vaccination"] as const;

/** One thing to do at a given time, shared by the household ("did you already give it?"). */
export const reminders = sqliteTable(
  "reminders",
  {
    id: text("id").primaryKey(),
    petId: text("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: reminderKinds }).notNull(),
    title: text("title").notNull(),
    detail: text("detail").notNull(),
    /** Local Finnish time, e.g. "2026-10-17T08:00:00"... */
    dueAt: text("due_at").notNull(),
    /** ...and the same moment in epoch ms, for sorting and push notifications */
    dueAtMs: integer("due_at_ms", { mode: "number" }).notNull(),
    /** Where it came from. Only the owner's own reminders can be edited or deleted. */
    source: text("source", { enum: reminderSources }).notNull(),
    scheduleId: text("schedule_id").references(() => medicationSchedules.id, { onDelete: "cascade" }),
    carePlanId: text("care_plan_id").references(() => carePlans.id, { onDelete: "cascade" }),
    /** The passport vaccination it reminds about */
    recordId: text("record_id").references(() => healthRecords.id, { onDelete: "cascade" }),
    doneAt: integer("done_at", { mode: "number" }),
    doneByUserId: text("done_by_user_id").references(() => users.id, { onDelete: "set null" }),
    pushedAt: integer("pushed_at", { mode: "number" }),
    createdByUserId: text("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  // One reminder per dose: generating doses again must not duplicate them.
  (table) => [uniqueIndex("reminders_schedule_dose").on(table.scheduleId, table.dueAt)],
);

export type CarePlanRow = typeof carePlans.$inferSelect;
export type MedicationScheduleRow = typeof medicationSchedules.$inferSelect;
export type ReminderRow = typeof reminders.$inferSelect;
