import { randomUUID } from "node:crypto";

import { and, eq, gt, inArray, isNull } from "drizzle-orm";

import type { Db } from "../../db/client.js";
import { deviceSessions, pets, pushDevices, seasonalNotificationsSent, users } from "../../db/schema.js";
import { todayInFinland } from "../passport/service.js";
import { alertsContent, type AlertsContent } from "./content.js";
import type { PushMessage, PushSender } from "./push.js";
import { activeCards, regionFor } from "./season.js";

// Notifications go out only in the daytime, Finnish time, and at most one a day per device.
const SEND_FROM_HOUR = 9;
const SEND_UNTIL_HOUR = 20;
const MIN_HOURS_BETWEEN = 20;

export const hourInFinland = (now: Date) =>
  Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/Helsinki" }).format(now));

/**
 * Sends each seasonal card that is active for a device's region and household pets, once per
 * season. Run it every hour; it does nothing outside daytime hours.
 */
export const runSeasonalAlertJob = async (
  db: Db,
  send: PushSender,
  now = new Date(),
  content: AlertsContent = alertsContent,
) => {
  const stats = { devices: 0, sent: 0, removed: 0, failed: 0 };
  const hour = hourInFinland(now);
  if (hour < SEND_FROM_HOUR || hour >= SEND_UNTIL_HOUR) {
    return stats;
  }
  const today = todayInFinland(now);

  const devices = db
    .select({ device: pushDevices, householdId: users.householdId })
    .from(pushDevices)
    .innerJoin(deviceSessions, eq(deviceSessions.id, pushDevices.sessionId))
    .innerJoin(users, eq(users.id, deviceSessions.userId))
    .where(and(eq(pushDevices.seasonalAlerts, true), isNull(deviceSessions.revokedAt)))
    .all();
  stats.devices = devices.length;

  const planned: Array<{ message: PushMessage; sessionId: string; cardId: string; seasonYear: number }> = [];

  for (const { device, householdId } of devices) {
    const sentRecently = db
      .select({ id: seasonalNotificationsSent.id })
      .from(seasonalNotificationsSent)
      .where(
        and(
          eq(seasonalNotificationsSent.sessionId, device.sessionId),
          gt(seasonalNotificationsSent.sentAt, now.getTime() - MIN_HOURS_BETWEEN * 60 * 60 * 1000),
        ),
      )
      .get();
    if (sentRecently) {
      continue;
    }

    const householdPets = db.select().from(pets).where(eq(pets.householdId, householdId)).all();
    const alreadySent = new Set(
      db
        .select()
        .from(seasonalNotificationsSent)
        .where(eq(seasonalNotificationsSent.sessionId, device.sessionId))
        .all()
        .map((row) => `${row.cardId}:${row.seasonYear}`),
    );

    const region = regionFor(device.latitude);
    const next = activeCards(content, { date: today, region })
      .map((active) => ({
        ...active,
        petNames: householdPets.filter((pet) => active.card.species.includes(pet.species)).map((pet) => pet.name),
      }))
      .find((active) => active.petNames.length > 0 && !alreadySent.has(`${active.card.id}:${active.seasonYear}`));

    if (next) {
      planned.push({
        sessionId: device.sessionId,
        cardId: next.card.id,
        seasonYear: next.seasonYear,
        message: {
          to: device.expoPushToken,
          title: next.card.title[device.language],
          body: `${next.petNames.join(", ")}: ${next.card.pushText[device.language]}`,
          data: { type: "seasonalAlert", cardId: next.card.id },
        },
      });
    }
  }

  if (planned.length === 0) {
    return stats;
  }

  const results = await send(planned.map((item) => item.message));
  const invalidSessions: string[] = [];
  results.forEach((result, index) => {
    const item = planned[index];
    if (result === "sent") {
      db.insert(seasonalNotificationsSent)
        .values({
          id: randomUUID(),
          sessionId: item.sessionId,
          cardId: item.cardId,
          seasonYear: item.seasonYear,
          sentAt: now.getTime(),
        })
        .onConflictDoNothing()
        .run();
      stats.sent++;
    } else if (result === "invalidToken") {
      invalidSessions.push(item.sessionId);
    } else {
      stats.failed++;
    }
  });
  if (invalidSessions.length) {
    db.delete(pushDevices).where(inArray(pushDevices.sessionId, invalidSessions)).run();
    stats.removed = invalidSessions.length;
  }
  return stats;
};
