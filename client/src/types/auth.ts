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
  /** Single use. Kept in secure storage behind the device lock. */
  refreshToken: string;
  user: User;
};

/** POST /auth/bank/reauth: a new access token after confirming a sensitive action. */
export type AccessTokenResponse = {
  accessToken: string;
  expiresIn: number;
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

/** How the app is unlocked on this device after the first bank sign-in. */
export type LockMethod = 'face' | 'fingerprint' | 'pin';
