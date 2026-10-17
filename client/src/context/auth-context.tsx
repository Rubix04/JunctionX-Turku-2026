import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { ApiError, setAccessToken, setTokenRefresher } from '@/services/api-client';
import * as authService from '@/services/auth';
import { clearPin, savePin, verifyPin } from '@/services/pin';
import {
  deleteStoredItem,
  getStoredItem,
  setStoredItem,
  storageKeys,
} from '@/services/secure-storage';
import type { LockMethod, SignInResponse } from '@/types/auth';

/**
 * - loading: reading the saved session on app start
 * - signedOut: first time on this device, or signed out → welcome and bank sign-in
 * - locked: a saved session exists → unlock with face, fingerprint or PIN
 * - signedIn: unlocked, the app is open
 */
export type AuthStatus = 'loading' | 'signedOut' | 'locked' | 'signedIn';

type AuthContextValue = {
  status: AuthStatus;
  displayName: string | null;
  lockMethod: LockMethod | null;
  /** Bank sign-in done, device lock not chosen yet */
  pendingSignIn: SignInResponse | null;
  signInWithBank: (bankId: string) => Promise<void>;
  /** Saves the session behind the chosen lock and opens the app. */
  finishSetup: (method: LockMethod, pin?: string) => Promise<void>;
  /** On the last wrong attempt the device is signed out and the app goes back to the welcome screen. */
  checkPin: (pin: string) => Promise<{ ok: boolean; attemptsLeft: number }>;
  /** Call after face, fingerprint or PIN check passed. Resolves false if the session expired. */
  unlock: () => Promise<boolean>;
  /** Locks the app now, as after a while in the background. */
  lock: () => void;
  signOut: () => Promise<void>;
  /**
   * Confirms a sensitive action with online banking when the server answers
   * BANK_REAUTH_REQUIRED (see isBankReauthRequired). Retry the action afterwards.
   */
  confirmWithBank: (bankId: string) => Promise<void>;
};

// Ask for face, fingerprint or PIN again after the app has been in the background this long.
const LOCK_AFTER_BACKGROUND_MS = 60 * 1000;

const AuthContext = createContext<AuthContextValue | null>(null);

const clearStoredSession = () =>
  Promise.all([
    deleteStoredItem(storageKeys.refreshToken),
    deleteStoredItem(storageKeys.lockMethod),
    deleteStoredItem(storageKeys.displayName),
    clearPin(),
  ]);

const isSessionGone = (error: unknown) =>
  error instanceof ApiError && (error.status === 401 || error.status === 403);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [lockMethod, setLockMethod] = useState<LockMethod | null>(null);
  const [pendingSignIn, setPendingSignIn] = useState<SignInResponse | null>(null);
  const backgroundedAt = useRef<number | null>(null);
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const resetToSignedOut = async () => {
    await clearStoredSession();
    setAccessToken(null);
    setDisplayName(null);
    setLockMethod(null);
    setPendingSignIn(null);
    setStatus('signedOut');
  };

  // Swaps the single-use refresh token for new tokens and saves the new refresh token.
  const refreshTokens = async () => {
    const refreshToken = await getStoredItem(storageKeys.refreshToken);
    if (!refreshToken) {
      throw new ApiError(401, 'NO_SESSION', 'No saved session');
    }
    const session = await authService.refreshSession(refreshToken);
    await setStoredItem(storageKeys.refreshToken, session.refreshToken);
    setAccessToken(session.accessToken);
    return session;
  };

  // Restore the saved session on app start.
  useEffect(() => {
    const restore = async () => {
      const [refreshToken, savedMethod, savedName] = await Promise.all([
        getStoredItem(storageKeys.refreshToken),
        getStoredItem(storageKeys.lockMethod),
        getStoredItem(storageKeys.displayName),
      ]);
      if (refreshToken && savedMethod) {
        setLockMethod(savedMethod as LockMethod);
        setDisplayName(savedName);
        setStatus('locked');
      } else {
        setStatus('signedOut');
      }
    };
    restore().catch(() => setStatus('signedOut'));
  }, []);

  // Lock again when the app comes back after a while in the background (spec 13: the app
  // opens with the device lock). Short trips, e.g. to the photo picker, don't lock.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundedAt.current = Date.now();
      } else if (state === 'active' && backgroundedAt.current !== null) {
        const away = Date.now() - backgroundedAt.current;
        backgroundedAt.current = null;
        if (away > LOCK_AFTER_BACKGROUND_MS && statusRef.current === 'signedIn') {
          setAccessToken(null);
          setStatus('locked');
        }
      }
    });
    return () => subscription.remove();
  }, []);

  // Let the API client renew an expired access token while the app is open.
  useEffect(() => {
    setTokenRefresher(async () => {
      try {
        await refreshTokens();
        return true;
      } catch (error) {
        if (isSessionGone(error)) {
          await resetToSignedOut();
        }
        return false;
      }
    });
    return () => setTokenRefresher(null);
  });

  const value: AuthContextValue = {
    status,
    displayName,
    lockMethod,
    pendingSignIn,

    signInWithBank: async (bankId) => {
      const session = await authService.signInWithBank(bankId);
      setPendingSignIn(session);
    },

    finishSetup: async (method, pin) => {
      if (!pendingSignIn) {
        throw new Error('Sign in with the bank first');
      }
      await Promise.all([
        setStoredItem(storageKeys.refreshToken, pendingSignIn.refreshToken),
        setStoredItem(storageKeys.lockMethod, method),
        setStoredItem(storageKeys.displayName, pendingSignIn.user.displayName),
        // Only a salted hash of the PIN is kept, in the Keychain / Keystore.
        pin ? savePin(pin) : clearPin(),
      ]);
      setAccessToken(pendingSignIn.accessToken);
      setDisplayName(pendingSignIn.user.displayName);
      setLockMethod(method);
      setPendingSignIn(null);
      setStatus('signedIn');
    },

    checkPin: async (pin) => {
      const result = await verifyPin(pin);
      if (!result.ok && result.attemptsLeft === 0) {
        // Too many wrong guesses: forget the session on this device. The server session
        // can't be used without the refresh token we delete here.
        await resetToSignedOut();
      }
      return result;
    },

    unlock: async () => {
      try {
        const session = await refreshTokens();
        setDisplayName(session.user.displayName);
        setStatus('signedIn');
        return true;
      } catch (error) {
        if (isSessionGone(error)) {
          await resetToSignedOut();
          return false;
        }
        throw error;
      }
    },

    lock: () => {
      setAccessToken(null);
      setStatus('locked');
    },

    signOut: async () => {
      // Best effort: sign out locally even if the server can't be reached.
      await authService.signOutSession().catch(() => undefined);
      await resetToSignedOut();
    },

    confirmWithBank: async (bankId) => {
      const { accessToken } = await authService.reauthenticateWithBank(bankId);
      setAccessToken(accessToken);
    },
  };

  return <AuthContext value={value}>{children}</AuthContext>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};
