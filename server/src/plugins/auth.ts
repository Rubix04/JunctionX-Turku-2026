import jwt from "@fastify/jwt";
import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

import { unauthorized } from "../errors.js";

/** Claims in the short-lived access token. */
export type AccessTokenClaims = {
  /** User id */
  sub: string;
  /** Household id */
  hid: string;
};

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AccessTokenClaims;
    user: AccessTokenClaims;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    /** preHandler that requires a valid `Authorization: Bearer <access token>` header. */
    authenticate: (request: FastifyRequest) => Promise<void>;
  }
}

export const ACCESS_TOKEN_TTL = "15m";

export const authPlugin = fp(async (app: FastifyInstance, options: { secret: string }) => {
  await app.register(jwt, { secret: options.secret, sign: { expiresIn: ACCESS_TOKEN_TTL } });

  app.decorate("authenticate", async (request: FastifyRequest) => {
    try {
      await request.jwtVerify();
    } catch {
      throw unauthorized("UNAUTHORIZED", "A valid access token is required");
    }
  });
});

/** The signed-in user's ids. Only call in routes that use `app.authenticate`. */
export const currentUser = (request: FastifyRequest) => ({
  userId: request.user.sub,
  householdId: request.user.hid,
});
