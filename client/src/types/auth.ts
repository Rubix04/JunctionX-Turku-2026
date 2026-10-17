// Matches the backend's auth schemas (server/src/modules/auth/schemas.ts).

export type Bank = {
  id: string;
  name: string;
};

export type User = {
  id: string;
  displayName: string;
  householdId: string;
};

export type SignInResponse = {
  accessToken: string;
  /** Seconds until the access token expires */
  expiresIn: number;
  /** Single use. Kept in secure storage. */
  refreshToken: string;
  user: User;
};

export type EmailSignUpInput = {
  name: string;
  email: string;
  password: string;
};

/** A signed-in device, listed in Account (GET /auth/devices). */
export type SignedInDevice = {
  id: string;
  deviceName: string;
  /** Epoch ms */
  createdAt: number;
  /** Epoch ms */
  lastUsedAt: number;
  /** True for the device the app is running on */
  current: boolean;
};

