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
  createdAt: createdAt(),
});

export type UserRow = typeof users.$inferSelect;
export type PetRow = typeof pets.$inferSelect;
