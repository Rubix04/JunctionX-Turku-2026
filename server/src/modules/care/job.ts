import { and, eq, gte, inArray, isNull, lte } from "drizzle-orm";

import type { Db } from "../../db/client.js";
import { deviceSessions, pets, pushDevices, type ReminderKind, reminders, users } from "../../db/schema.js";
import type { PushMessage, PushSender } from "../alerts/push.js";
import { ensureUpcomingDoses } from "./service.js";

/** A reminder is pushed when due, or up to this long after (e.g. if the server was down). */
const LATE_WINDOW_MS = 30 * 60 * 1000;

const titles: Record<ReminderKind, Record<"fi" | "sv" | "en", string>> = {
  medication: { fi: "{pet}: lääke", sv: "{pet}: medicin", en: "{pet}: medicine" },
  visit: { fi: "{pet}: eläinlääkärikäynti", sv: "{pet}: veterinärbesök", en: "{pet}: vet visit" },
  vaccination: { fi: "{pet}: rokotus", sv: "{pet}: vaccination", en: "{pet}: vaccination" },
  deworming: { fi: "{pet}: madotus", sv: "{pet}: avmaskning", en: "{pet}: deworming" },
};

/**
 * Sends a push notification for each reminder that has come due and isn't done, to every device
 * in the pet's household that has reminders on. Each reminder is pushed once. Run it every few
 * minutes; it also tops up medication doses for the coming two weeks.
 */
export const runReminderJob = async (db: Db, send: PushSender, now = Date.now()) => {
  const stats = { reminders: 0, sent: 0, removed: 0, failed: 0 };
  ensureUpcomingDoses(db, null);

  const due = db
    .select({ reminder: reminders, petName: pets.name, householdId: pets.householdId })
    .from(reminders)
    .innerJoin(pets, eq(pets.id, reminders.petId))
    .where(
      and(
        isNull(reminders.doneAt),
        isNull(reminders.pushedAt),
        lte(reminders.dueAtMs, now),
        gte(reminders.dueAtMs, now - LATE_WINDOW_MS),
      ),
    )
    .all();
  stats.reminders = due.length;
  if (due.length === 0) {
    return stats;
  }

  const householdIds = [...new Set(due.map((row) => row.householdId))];
  const devices = db
    .select({ device: pushDevices, householdId: users.householdId })
    .from(pushDevices)
    .innerJoin(deviceSessions, eq(deviceSessions.id, pushDevices.sessionId))
    .innerJoin(users, eq(users.id, deviceSessions.userId))
    .where(
      and(eq(pushDevices.reminders, true), isNull(deviceSessions.revokedAt), inArray(users.householdId, householdIds)),
    )
    .all();

  const planned: { message: PushMessage; sessionId: string; reminderId: string }[] = [];
  for (const { reminder, petName, householdId } of due) {
    for (const { device } of devices.filter((d) => d.householdId === householdId)) {
      planned.push({
        sessionId: device.sessionId,
        reminderId: reminder.id,
        message: {
          to: device.expoPushToken,
          title: titles[reminder.kind][device.language].replace("{pet}", petName),
          body: reminder.detail ? `${reminder.title} · ${reminder.detail}` : reminder.title,
          data: { type: "reminder", reminderId: reminder.id, petId: reminder.petId },
        },
      });
    }
  }

  const markPushed = (ids: string[]) =>
    ids.length && db.update(reminders).set({ pushedAt: now }).where(inArray(reminders.id, ids)).run();

  // Reminders with no device are marked right away, so a phone registered later doesn't get old ones.
  const withDevice = new Set(planned.map((item) => item.reminderId));
  markPushed(due.map((row) => row.reminder.id).filter((id) => !withDevice.has(id)));
  if (planned.length === 0) {
    return stats;
  }

  // The others only once the push service has taken them: if sending fails, the next run tries
  // again (within LATE_WINDOW_MS) instead of the reminder being lost.
  let results: Awaited<ReturnType<PushSender>>;
  try {
    results = await send(planned.map((item) => item.message));
  } catch {
    stats.failed = planned.length;
    return stats;
  }
  const invalidSessions = new Set<string>();
  const delivered = new Set<string>();
  results.forEach((result, index) => {
    if (result === "sent") {
      stats.sent++;
      delivered.add(planned[index].reminderId);
    } else if (result === "invalidToken") {
      invalidSessions.add(planned[index].sessionId);
      delivered.add(planned[index].reminderId);
    } else {
      stats.failed++;
    }
  });
  // A reminder that reached at least one phone (or only dead tokens) is done; one that failed
  // everywhere is tried again on the next run.
  markPushed([...delivered]);
  if (invalidSessions.size) {
    db.delete(pushDevices).where(inArray(pushDevices.sessionId, [...invalidSessions])).run();
    stats.removed = invalidSessions.size;
  }
  return stats;
};
