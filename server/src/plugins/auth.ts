import jwt from "@fastify/jwt";
import { and, eq, isNull } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

import { deviceSessions } from "../db/schema.js";
import { forbidden, unauthorized } from "../errors.js";

/** Claims in the short-lived access token. */
export type AccessTokenClaims = {
  /** User id */
  sub: string;
  /** Household id */
  hid: string;
  /** Device session id */
  sid: string;
  /** Epoch ms of the last online banking authentication on this device */
  bat: number;
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

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export const authPlugin = fp(async (app: FastifyInstance, options: { secret: string }) => {
  await app.register(jwt, {
    secret: options.secret,
    sign: { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
  });

  app.decorate("authenticate", async (request: FastifyRequest) => {
    try {
      await request.jwtVerify();
    } catch {
      throw unauthorized("UNAUTHORIZED", "A valid access token is required");
    }
    // A device signed out from settings must stop working right away, not when its token expires.
    const session = app.db
      .select({ id: deviceSessions.id })
      .from(deviceSessions)
      .where(and(eq(deviceSessions.id, request.user.sid), isNull(deviceSessions.revokedAt)))
      .get();
    if (!session) {
      throw unauthorized("SESSION_REVOKED", "This device has been signed out");
    }
  });
});

/** The signed-in user's ids. Only call in routes that use `app.authenticate`. */
export const currentUser = (request: FastifyRequest) => ({
  userId: request.user.sub,
  householdId: request.user.hid,
  sessionId: request.user.sid,
});

/**
 * preHandler for sensitive actions such as changing insurance details (spec 13).
 * Use after `app.authenticate`. If the last bank sign-in is too old it answers
 * 403 `BANK_REAUTH_REQUIRED`; the client then calls `POST /auth/bank/reauth` and retries.
 */
export const requireRecentBankAuth =
  (maxAgeMs = 5 * 60 * 1000) =>
  async (request: FastifyRequest) => {
    if (Date.now() - request.user.bat > maxAgeMs) {
      throw forbidden("BANK_REAUTH_REQUIRED", "Confirm this action with online banking");
    }
  };
