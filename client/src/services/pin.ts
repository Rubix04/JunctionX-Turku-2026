import * as Crypto from 'expo-crypto';

import { deleteStoredItem, getStoredItem, setStoredItem, storageKeys } from '@/services/secure-storage';

// The app's own PIN, used when face or fingerprint isn't set up. Only a salted hash is kept,
// and too many wrong guesses sign the device out (online banking needed again).

export const MAX_PIN_ATTEMPTS = 5;

const hashPin = (pin: string, salt: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);

export const savePin = async (pin: string) => {
  const salt = Crypto.randomUUID();
  await setStoredItem(storageKeys.pinSalt, salt);
  await setStoredItem(storageKeys.pinHash, await hashPin(pin, salt));
  await setStoredItem(storageKeys.pinAttempts, '0');
  await deleteStoredItem(storageKeys.pin);
};

export const clearPin = () =>
  Promise.all(
    [storageKeys.pin, storageKeys.pinHash, storageKeys.pinSalt, storageKeys.pinAttempts].map(deleteStoredItem),
  );

const matches = async (pin: string) => {
  const [salt, hash] = await Promise.all([
    getStoredItem(storageKeys.pinSalt),
    getStoredItem(storageKeys.pinHash),
  ]);
  if (salt && hash) {
    return (await hashPin(pin, salt)) === hash;
  }
  // Earlier builds stored the PIN as such; move it to a hash once it's entered correctly.
  const legacy = await getStoredItem(storageKeys.pin);
  if (legacy !== null && legacy === pin) {
    await savePin(pin);
    return true;
  }
  return false;
};

/** Checks the PIN and counts wrong guesses in a row. */
export const verifyPin = async (pin: string) => {
  const ok = await matches(pin);
  const failed = ok ? 0 : Number((await getStoredItem(storageKeys.pinAttempts)) ?? '0') + 1;
  await setStoredItem(storageKeys.pinAttempts, String(failed));
  return { ok, attemptsLeft: Math.max(0, MAX_PIN_ATTEMPTS - failed) };
};
