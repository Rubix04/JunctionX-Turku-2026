import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';

import { useMockData } from '@/constants/config';
import { apiFetch } from '@/services/api-client';
import { mockDelay } from '@/services/mock/delay';
import { getStoredItem, setStoredItem, storageKeys } from '@/services/secure-storage';
import type { Bank, EmailSignUpInput, SignedInDevice, SignInResponse } from '@/types/auth';

// Backend: server/src/modules/auth. Its bank provider is simulated: every bank
// signs in a test person straight away. Uses mock data when no API URL is set.

const mockBanks: Bank[] = [
  { id: 'op', name: 'OP' },
  { id: 'nordea', name: 'Nordea' },
  { id: 'danske', name: 'Danske Bank' },
  { id: 'spankki', name: 'S-Pankki' },
  { id: 'aktia', name: 'Aktia' },
  { id: 'saastopankki', name: 'Säästöpankki' },
  { id: 'pop', name: 'POP Pankki' },
  { id: 'handelsbanken', name: 'Handelsbanken' },
  { id: 'alandsbanken', name: 'Ålandsbanken' },
  { id: 'omasp', name: 'Oma Säästöpankki' },
];

const mockSession = (user = { id: 'mock-user', displayName: 'Aino Virtanen' }): SignInResponse => ({
  accessToken: 'mock-access-token',
  expiresIn: 900,
  refreshToken: `mock-refresh-${Date.now()}`,
  user: { ...user, householdId: 'mock-household' },
});

// Shown in the list of signed-in devices in Account.
const deviceName = () => Device.deviceName ?? Device.modelName ?? 'Phone';

export const getBanks = async (): Promise<Bank[]> => {
  if (useMockData) {
    return mockDelay(mockBanks);
  }
  const { banks } = await apiFetch<{ banks: Bank[] }>('/auth/banks');
  return banks;
};

export const signInWithBank = async (bankId: string): Promise<SignInResponse> => {
  if (useMockData) {
    return mockDelay(mockSession(), 600);
  }
  return apiFetch<SignInResponse>('/auth/bank', {
    method: 'POST',
    body: { bankId, deviceName: deviceName() },
  });
};

export type EmailAuthErrorCode = 'invalidCredentials' | 'emailTaken';

export class EmailAuthError extends Error {
  constructor(public code: EmailAuthErrorCode) {
    super(code);
  }
}

// Email accounts are mock only for now: the server has no email sign-in yet.
// Accounts live on this device, with a hash of the password instead of the password.
type MockUser = { id: string; displayName: string; email: string; passwordHash: string };

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const hashPassword = (email: string, password: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${normalizeEmail(email)}:${password}`);

/** Demo account for presentations: demo@tassuvahti.fi / demo1234 */
const demoUser = async (): Promise<MockUser> => ({
  id: 'mock-user',
  displayName: 'Aino Virtanen',
  email: 'demo@tassuvahti.fi',
  passwordHash: await hashPassword('demo@tassuvahti.fi', 'demo1234'),
});

const loadMockUsers = async (): Promise<MockUser[]> => {
  const saved = await getStoredItem(storageKeys.mockUsers).catch(() => null);
  const users: MockUser[] = saved ? JSON.parse(saved) : [];
  return [await demoUser(), ...users];
};

const saveMockUser = async (user: MockUser) => {
  const users = (await loadMockUsers()).filter((u) => u.id !== 'mock-user');
  await setStoredItem(storageKeys.mockUsers, JSON.stringify([...users, user]));
};

export const signInWithEmail = async (email: string, password: string): Promise<SignInResponse> => {
  const passwordHash = await hashPassword(email, password);
  const user = (await loadMockUsers()).find(
    (u) => u.email === normalizeEmail(email) && u.passwordHash === passwordHash,
  );
  if (!user) {
    await mockDelay(undefined, 600);
    throw new EmailAuthError('invalidCredentials');
  }
  return mockDelay(mockSession(user), 600);
};

export const signUpWithEmail = async ({ name, email, password }: EmailSignUpInput): Promise<SignInResponse> => {
  const users = await loadMockUsers();
  if (users.some((u) => u.email === normalizeEmail(email))) {
    await mockDelay(undefined, 600);
    throw new EmailAuthError('emailTaken');
  }
  const user: MockUser = {
    id: Crypto.randomUUID(),
    displayName: name.trim(),
    email: normalizeEmail(email),
    passwordHash: await hashPassword(email, password),
  };
  await saveMockUser(user);
  return mockDelay(mockSession(user), 600);
};

/** Swaps the single-use refresh token for new tokens. */
export const refreshSession = async (refreshToken: string): Promise<SignInResponse> => {
  if (useMockData) {
    return mockDelay(mockSession());
  }
  return apiFetch<SignInResponse>('/auth/refresh', { method: 'POST', body: { refreshToken } });
};

/** Ends this device's session on the server. */
export const signOutSession = async (): Promise<void> => {
  if (useMockData) {
    return;
  }
  await apiFetch<void>('/auth/logout', { method: 'POST' });
};

const mockDevices: SignedInDevice[] = [
  { id: 'this-device', deviceName: 'This phone', createdAt: Date.now() - 86_400_000 * 30, lastUsedAt: Date.now(), current: true },
  { id: 'old-tablet', deviceName: 'iPad', createdAt: Date.now() - 86_400_000 * 90, lastUsedAt: Date.now() - 86_400_000 * 12, current: false },
];

/** Devices signed in to this account, most recently used first. */
export const getSignedInDevices = async (): Promise<SignedInDevice[]> => {
  if (useMockData) {
    return mockDelay([...mockDevices]);
  }
  const { devices } = await apiFetch<{ devices: SignedInDevice[] }>('/auth/devices');
  return devices;
};

/** Signs another device out. It stops working at once and needs online banking again. */
export const signOutDevice = async (deviceId: string): Promise<void> => {
  if (useMockData) {
    mockDevices.splice(
      mockDevices.findIndex((device) => device.id === deviceId),
      1,
    );
    return mockDelay(undefined);
  }
  await apiFetch<void>(`/auth/devices/${deviceId}`, { method: 'DELETE' });
};
