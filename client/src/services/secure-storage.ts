import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Keychain (iOS) / Keystore (Android). Web has no secure storage, so values only
// live in memory there and the app asks to sign in again after a reload.
const webMemory = new Map<string, string>();

export const storageKeys = {
  refreshToken: 'auth.refreshToken',
  lockMethod: 'auth.lockMethod',
  /** Plain PIN from earlier builds; moved to pinHash on the next correct unlock. */
  pin: 'auth.pin',
  pinHash: 'auth.pinHash',
  pinSalt: 'auth.pinSalt',
  pinAttempts: 'auth.pinAttempts',
  displayName: 'auth.displayName',
  language: 'settings.language',
} as const;

type StorageKey = (typeof storageKeys)[keyof typeof storageKeys];

export const getStoredItem = async (key: StorageKey) =>
  Platform.OS === 'web' ? (webMemory.get(key) ?? null) : SecureStore.getItemAsync(key);

export const setStoredItem = async (key: StorageKey, value: string) => {
  if (Platform.OS === 'web') {
    webMemory.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
};

export const deleteStoredItem = async (key: StorageKey) => {
  if (Platform.OS === 'web') {
    webMemory.delete(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
};
