import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Keychain (iOS) / Keystore (Android). Web has no secure storage: the session (auth.*) goes to
// sessionStorage, so it is gone when the tab closes and isn't left behind on a shared computer;
// settings such as the language stay in localStorage. Both can still be read by scripts on the
// page, so a public web version needs an httpOnly cookie from the backend instead.
const webStore = (key: string) => (key.startsWith('auth.') ? globalThis.sessionStorage : globalThis.localStorage);

const webStorage = {
  get: (key: string) => {
    try {
      return webStore(key)?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  set: (key: string, value: string) => {
    try {
      webStore(key)?.setItem(key, value);
    } catch {
      // Private mode or blocked storage: the value only lasts until reload.
    }
  },
  delete: (key: string) => {
    try {
      webStore(key)?.removeItem(key);
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
