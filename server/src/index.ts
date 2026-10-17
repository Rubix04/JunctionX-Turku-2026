import { existsSync } from "node:fs";

import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDb } from "./db/client.js";

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

const shutdown = async () => {
  await app.close();
  close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await app.listen({ port: config.PORT, host: config.HOST });
