import { existsSync } from "node:fs";

import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDb } from "./db/client.js";
import { runSeasonalAlertJob } from "./modules/alerts/job.js";
import { createExpoSender, createLogSender } from "./modules/alerts/push.js";
import { runReminderJob } from "./modules/care/job.js";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const config = loadConfig();
const { db, close } = createDb(config.DATABASE_PATH);
const app = await buildApp({
  config,
  db,
  logger: true,
});

// Seasonal alert push notifications (spec 9): checked every hour, sent in the daytime.
// Reminders (spec 2): checked every minute, sent when due.
const JOB_INTERVAL_MS = 60 * 60 * 1000;
const REMINDER_JOB_INTERVAL_MS = 60 * 1000;
let seasonalJob: NodeJS.Timeout | undefined;
let reminderJob: NodeJS.Timeout | undefined;
if (config.PUSH_MODE !== "off") {
  const send =
    config.PUSH_MODE === "expo" ? createExpoSender(app.log, config.EXPO_ACCESS_TOKEN) : createLogSender(app.log);
  const runJob = () =>
    runSeasonalAlertJob(db, send)
      .then((stats) => stats.sent && app.log.info({ seasonalAlerts: stats }, "seasonal alerts sent"))
      .catch((error) => app.log.error(error, "seasonal alert job failed"));
  seasonalJob = setInterval(runJob, JOB_INTERVAL_MS);
  void runJob();

  const runReminders = () =>
    runReminderJob(db, send)
      .then((stats) => stats.sent && app.log.info({ reminders: stats }, "reminders sent"))
      .catch((error) => app.log.error(error, "reminder job failed"));
  reminderJob = setInterval(runReminders, REMINDER_JOB_INTERVAL_MS);
  void runReminders();
}

const shutdown = async () => {
  clearInterval(seasonalJob);
  clearInterval(reminderJob);
  await app.close();
  close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await app.listen({ port: config.PORT, host: config.HOST });
