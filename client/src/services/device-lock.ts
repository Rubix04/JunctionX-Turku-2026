import * as LocalAuthentication from 'expo-local-authentication';

import type { LockMethod } from '@/types/auth';

/** The lock methods this device supports. PIN always works. */
export const getAvailableLockMethods = async (): Promise<LockMethod[]> => {
  const methods: LockMethod[] = [];

  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync().catch(() => false),
    LocalAuthentication.isEnrolledAsync().catch(() => false),
  ]);

  if (hasHardware && isEnrolled) {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      methods.push('face');
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      methods.push('fingerprint');
    }
  }

  methods.push('pin');
  return methods;
};

/** Shows the system face / fingerprint prompt. Resolves true on success. */
export const authenticateWithBiometrics = async (promptMessage: string, cancelLabel: string) => {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel,
    // Our own PIN is the fallback, not the device passcode.
    disableDeviceFallback: true,
  });
  return result.success;
};
