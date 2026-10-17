import type { FastifyPluginAsyncZod, ZodTypeProvider } from "fastify-type-provider-zod";

import type { DeviceSessionRow, UserRow } from "../../db/schema.js";
import { forbidden } from "../../errors.js";
import { ACCESS_TOKEN_TTL_SECONDS, currentUser } from "../../plugins/auth.js";
import type { BankIdentityProvider } from "./bank-provider.js";
import {
  accessTokenResponseSchema,
  bankReauthSchema,
  bankSignInSchema,
  banksResponseSchema,
  deviceParamsSchema,
  devicesResponseSchema,
  refreshSchema,
  signInResponseSchema,
  userSchema,
} from "./schemas.js";
import {
  createDeviceSession,
  findOrCreateUser,
  getUser,
  hashIdentity,
  listActiveSessions,
  markBankReauthenticated,
  revokeSession,
  rotateRefreshToken,
} from "./service.js";

/**
 * Spec 13 sign-in flow:
 * 1. First time on a device: `POST /auth/bank` → access + refresh token.
 * 2. The app keeps the refresh token in secure storage, unlocked with biometrics or a PIN.
 * 3. On each app open / when the access token expires: `POST /auth/refresh`.
 * 4. A long inactivity, a new device or a revoked session → 401 `SESSION_EXPIRED` → back to step 1.
 * 5. Sensitive actions answer 403 `BANK_REAUTH_REQUIRED` → `POST /auth/bank/reauth`, then retry.
 */
export const authRoutes: FastifyPluginAsyncZod<{ bankProvider: BankIdentityProvider }> = async (
  app,
  { bankProvider },
) => {
  const signAccessToken = (user: UserRow, session: DeviceSessionRow) =>
    app.jwt.sign({ sub: user.id, hid: user.householdId, sid: session.id, bat: session.bankAuthAt });

  const toUserDto = (user: UserRow) => ({
    id: user.id,
    displayName: user.displayName,
    householdId: user.householdId,
  });

  app.get("/banks", { schema: { response: { 200: banksResponseSchema } } }, async () => ({
    banks: [...bankProvider.banks],
  }));

  app.post(
    "/bank",
    { schema: { body: bankSignInSchema, response: { 200: signInResponseSchema } } },
    async (request) => {
      const identity = await bankProvider.identify(request.body);
      const user = findOrCreateUser(app.db, identity, {
        secret: app.config.IDENTITY_HASH_SECRET,
        seedDemoPets: app.config.DEMO_MODE,
      });
      const { session, refreshToken } = createDeviceSession(app.db, user.id, request.body.deviceName);
      return {
        accessToken: signAccessToken(user, session),
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        refreshToken,
        user: toUserDto(user),
      };
    },
  );

  app.post(
    "/refresh",
    { schema: { body: refreshSchema, response: { 200: signInResponseSchema } } },
    async (request) => {
      const { session, refreshToken } = rotateRefreshToken(app.db, request.body.refreshToken);
      const user = getUser(app.db, session.userId);
      return {
        accessToken: signAccessToken(user, session),
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        refreshToken,
        user: toUserDto(user),
      };
    },
  );

  // Everything below needs a signed-in device.
  await app.register(async (scope) => {
    const authed = scope.withTypeProvider<ZodTypeProvider>();
    authed.addHook("preHandler", app.authenticate);

    authed.get("/me", { schema: { response: { 200: userSchema } } }, async (request) =>
      toUserDto(getUser(app.db, currentUser(request).userId)),
    );

    authed.post(
      "/bank/reauth",
      { schema: { body: bankReauthSchema, response: { 200: accessTokenResponseSchema } } },
      async (request) => {
        const { userId, sessionId } = currentUser(request);
        const user = getUser(app.db, userId);
        const identity = await bankProvider.identify(request.body);
        if (hashIdentity(identity.personId, app.config.IDENTITY_HASH_SECRET) !== user.identityHash) {
          throw forbidden("IDENTITY_MISMATCH", "Signed in with a different person's credentials");
        }
        const session = markBankReauthenticated(app.db, sessionId);
        return { accessToken: signAccessToken(user, session), expiresIn: ACCESS_TOKEN_TTL_SECONDS };
      },
    );

    authed.post("/logout", async (request, reply) => {
      const { userId, sessionId } = currentUser(request);
      revokeSession(app.db, userId, sessionId);
      return reply.status(204).send();
    });

    authed.get("/devices", { schema: { response: { 200: devicesResponseSchema } } }, async (request) => {
      const { userId, sessionId } = currentUser(request);
      return {
        devices: listActiveSessions(app.db, userId).map((session) => ({
          id: session.id,
          deviceName: session.deviceName,
          createdAt: session.createdAt,
          lastUsedAt: session.lastUsedAt,
          current: session.id === sessionId,
        })),
      };
    });

    authed.delete(
      "/devices/:sessionId",
      { schema: { params: deviceParamsSchema } },
      async (request, reply) => {
        revokeSession(app.db, currentUser(request).userId, request.params.sessionId);
        return reply.status(204).send();
      },
    );
  });
};
