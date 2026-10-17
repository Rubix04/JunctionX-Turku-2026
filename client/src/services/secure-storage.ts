import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Keychain (iOS) / Keystore (Android). Web has no secure storage, so values go to
// localStorage there: fine for the demo build, not for real credentials.
const webStorage = {
  get: (key: string) => {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  set: (key: string, value: string) => {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Private mode or blocked storage: the value only lasts until reload.
    }
  },
  delete: (key: string) => {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // Nothing to remove.
    }
  },
};

export const storageKeys = {
  refreshToken: 'auth.refreshToken',
  displayName: 'auth.displayName',
  /** Mock only: accounts created with email on this device */
  mockUsers: 'auth.mockUsers',
  language: 'settings.language',
} as const;

type StorageKey = (typeof storageKeys)[keyof typeof storageKeys];

export const getStoredItem = async (key: StorageKey) =>
  Platform.OS === 'web' ? webStorage.get(key) : SecureStore.getItemAsync(key);

export const setStoredItem = async (key: StorageKey, value: string) => {
  if (Platform.OS === 'web') {
    webStorage.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
};

export const deleteStoredItem = async (key: StorageKey) => {
  if (Platform.OS === 'web') {
    webStorage.delete(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
};
