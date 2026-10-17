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
import { dietRoutes } from "./modules/diet/routes.js";
import { passportRoutes, sharedPassportRoutes } from "./modules/passport/routes.js";
import { petPhotoRoutes } from "./modules/pet-photos/routes.js";
import { petRoutes } from "./modules/pets/routes.js";
import { authPlugin } from "./plugins/auth.js";

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
};

export const buildApp = async ({
  config,
  db,
  logger = false,
  bankProvider = mockBankProvider,
}: BuildAppOptions) => {
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
  await app.register(authPlugin, { secret: config.JWT_SECRET });

  app.get("/health", async () => ({ status: "ok" }));
  await app.register(authRoutes, { prefix: "/auth", bankProvider });
  await app.register(petRoutes, { prefix: "/pets" });
  await app.register(petPhotoRoutes, { prefix: "/pets" });
  await app.register(passportRoutes, { prefix: "/pets" });
  await app.register(sharedPassportRoutes, { prefix: "/shared" });
  await app.register(dietRoutes);

  return app;
};

export type App = Awaited<ReturnType<typeof buildApp>>;
