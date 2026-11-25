import cors from "@fastify/cors";
import Fastify, { type FastifyServerOptions } from "fastify";
import {
  hasZodFastifySchemaValidationErrors,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";

import type { Config } from "./config.js";
import type { Db } from "./db/client.js";
import { ApiError } from "./errors.js";
import { type BankIdentityProvider, mockBankProvider } from "./modules/auth/bank-provider.js";
import { authRoutes } from "./modules/auth/routes.js";
import { alertsRoutes, notificationRoutes, petAlertsRoutes } from "./modules/alerts/routes.js";
import { careRoutes, reminderRoutes } from "./modules/care/routes.js";
import { readerFromConfig, type VisitNotesReader } from "./modules/visit-scan/readers.js";
import { visitScanRoutes } from "./modules/visit-scan/routes.js";
import { emergencyRoutes, petEmergencyRoutes } from "./modules/emergency/routes.js";
import { clinicRoutes } from "./modules/clinics/routes.js";
import { dietRoutes } from "./modules/diet/routes.js";
import { exposureRoutes, knowledgeRoutes } from "./modules/knowledge/routes.js";
import { passportRoutes, sharedPassportRoutes } from "./modules/passport/routes.js";
import { petPhotoRoutes } from "./modules/pet-photos/routes.js";
import { petRoutes } from "./modules/pets/routes.js";
import { symptomContentRoutes, symptomRoutes } from "./modules/symptoms/routes.js";
import { authPlugin } from "./plugins/auth.js";
import { rateLimitPlugin } from "./plugins/rate-limit.js";

declare module "fastify" {
  interface FastifyInstance {
    db: Db;
    config: Config;
  }
}

type BuildAppOptions = {
  config: Config;
  db: Db;
  logger?: FastifyServerOptions["logger"];
  /** Online banking identification. Defaults to the mock until a real FTN broker is connected. */
  bankProvider?: BankIdentityProvider;
  /** Reads vet documents. Defaults to Claude when ANTHROPIC_API_KEY is set, otherwise the sample. */
  visitNotesReader?: VisitNotesReader;
};

export const buildApp = async ({
  config,
  db,
  logger = false,
  bankProvider = mockBankProvider,
  visitNotesReader = readerFromConfig(config),
}: BuildAppOptions) => {
  // The simulated bank signs everyone in as the same test person, so in production it would put
  // every user into one shared household. Production needs a real identity provider (or DEMO_MODE).
  if (bankProvider === mockBankProvider && config.NODE_ENV === "production" && !config.DEMO_MODE) {
    throw new Error("The simulated bank sign-in can't run in production: pass a real bankProvider or set DEMO_MODE=true");
  }

  const app = Fastify({ logger }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.decorate("db", db);
  app.decorate("config", config);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) {
      return reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message, ...(error.details && { details: error.details }) },
      });
    }
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "The request is invalid",
          details: error.validation.map((issue) => ({
            path: issue.instancePath,
            message: issue.message,
          })),
        },
      });
    }
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    if (statusCode >= 500) {
      request.log.error(error);
    }
    return reply.status(statusCode).send({
      error: {
        code: statusCode >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR",
        message: statusCode >= 500 ? "Something went wrong" : (error as Error).message,
      },
    });
  });

  await app.register(cors, { origin: true });
  // Too many requests from one client get 429; off in tests, which send many requests at once.
  if (config.NODE_ENV !== "test") {
    await app.register(rateLimitPlugin);
  }
  await app.register(authPlugin, { secret: config.JWT_SECRET });

  app.get("/health", async () => ({ status: "ok" }));
  await app.register(authRoutes, { prefix: "/auth", bankProvider });
  await app.register(petRoutes, { prefix: "/pets" });
  await app.register(petPhotoRoutes, { prefix: "/pets" });
  await app.register(passportRoutes, { prefix: "/pets" });
  await app.register(sharedPassportRoutes, { prefix: "/shared" });
  await app.register(dietRoutes);
  await app.register(clinicRoutes, { prefix: "/clinics" });
  await app.register(knowledgeRoutes, { prefix: "/knowledge" });
  await app.register(exposureRoutes, { prefix: "/pets" });
  await app.register(alertsRoutes, { prefix: "/alerts" });
  await app.register(petAlertsRoutes, { prefix: "/pets" });
  await app.register(notificationRoutes, { prefix: "/notifications" });
  await app.register(symptomContentRoutes, { prefix: "/symptoms" });
  await app.register(symptomRoutes, { prefix: "/pets" });
  await app.register(careRoutes, { prefix: "/pets" });
  await app.register(visitScanRoutes, { prefix: "/pets", reader: visitNotesReader });
  await app.register(reminderRoutes, { prefix: "/reminders" });
  await app.register(emergencyRoutes, { prefix: "/emergency" });
  await app.register(petEmergencyRoutes, { prefix: "/pets" });

  return app;
};

export type App = Awaited<ReturnType<typeof buildApp>>;
