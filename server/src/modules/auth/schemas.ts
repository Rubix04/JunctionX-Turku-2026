import { z } from "zod";

const bankId = z.string().min(1).max(40);
// Only meaningful with the mock provider: chooses which test person signs in.
const testPersonId = z.string().max(40).optional();

export const bankSignInSchema = z.object({
  bankId,
  /** Shown in the list of signed-in devices, e.g. "Maija's iPhone". */
  deviceName: z.string().trim().min(1).max(80),
  testPersonId,
});

export const bankReauthSchema = z.object({ bankId, testPersonId });

export const refreshSchema = z.object({ refreshToken: z.string().min(1) });

export const userSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  householdId: z.string(),
});

export const tokensSchema = z.object({
  accessToken: z.string(),
  /** Seconds until the access token expires */
  expiresIn: z.number(),
  /** Store in the device's secure storage behind the biometric/PIN lock. Single use. */
  refreshToken: z.string(),
});

export const signInResponseSchema = tokensSchema.extend({ user: userSchema });

export const accessTokenResponseSchema = tokensSchema.pick({ accessToken: true, expiresIn: true });

export const banksResponseSchema = z.object({
  banks: z.array(z.object({ id: z.string(), name: z.string() })),
});

export const deviceSchema = z.object({
  id: z.string(),
  deviceName: z.string(),
  createdAt: z.number(),
  lastUsedAt: z.number(),
  /** True for the device making the request */
  current: z.boolean(),
});

export const devicesResponseSchema = z.object({ devices: z.array(deviceSchema) });

export const deviceParamsSchema = z.object({ sessionId: z.string() });
