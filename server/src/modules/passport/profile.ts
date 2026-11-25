import { asc, eq } from "drizzle-orm";

import type { Db } from "../../db/client.js";
import { type HealthRecordRow, type PetRow, users } from "../../db/schema.js";
import { daysBetween } from "../symptoms/assessment.js";
import { activeWatchLists } from "../symptoms/service.js";
import { todayInFinland } from "./service.js";

/** A diagnosis counts as resolved once nothing is watched for it and a month has passed. */
const RESOLVED_AFTER_DAYS = 30;

const data = (record: HealthRecordRow) => record.data as Record<string, string | null>;

/**
 * The passport's first card: who the pet is and its diagnoses. Diagnoses come from the visits
 * in the passport; one is ongoing while a watch list follows it or the visit was recent.
 */
export const passportProfile = (db: Db, pet: PetRow, records: HealthRecordRow[], today = todayInFinland()) => {
  const owner = db
    .select({ displayName: users.displayName })
    .from(users)
    .where(eq(users.householdId, pet.householdId))
    .orderBy(asc(users.createdAt))
    .get();
  const watched = new Set(activeWatchLists(db, pet.id, today).map((list) => list.recordId));

  return {
    microchip: pet.microchip,
    markings: pet.markings,
    registration: pet.registration,
    sex: pet.sex,
    neutered: pet.neutered,
    ownerName: owner?.displayName ?? null,
    conditions: records
      .filter((record) => record.kind === "visit" && data(record).diagnosis)
      .map((record) => {
        const diagnosedOn = data(record).visitedOn as string;
        return {
          id: record.id,
          name: data(record).diagnosis as string,
          diagnosedOn,
          resolved: !watched.has(record.id) && daysBetween(diagnosedOn, today) > RESOLVED_AFTER_DAYS,
        };
      }),
  };
};
