import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

import { ApiError, setAccessToken, setTokenRefresher } from '@/services/api-client';
import * as authService from '@/services/auth';
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
  checkPin: (pin: string) => Promise<boolean>;
  /** Call after face, fingerprint or PIN check passed. Resolves false if the session expired. */
  unlock: () => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const clearStoredSession = () =>
  Promise.all([
    deleteStoredItem(storageKeys.refreshToken),
    deleteStoredItem(storageKeys.lockMethod),
    deleteStoredItem(storageKeys.pin),
    deleteStoredItem(storageKeys.displayName),
  ]);

const isSessionGone = (error: unknown) =>
  error instanceof ApiError && (error.status === 401 || error.status === 403);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [lockMethod, setLockMethod] = useState<LockMethod | null>(null);
  const [pendingSignIn, setPendingSignIn] = useState<SignInResponse | null>(null);

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
        // Stored in the Keychain / Keystore, which is encrypted by the OS.
        pin ? setStoredItem(storageKeys.pin, pin) : deleteStoredItem(storageKeys.pin),
      ]);
      setAccessToken(pendingSignIn.accessToken);
      setDisplayName(pendingSignIn.user.displayName);
      setLockMethod(method);
      setPendingSignIn(null);
      setStatus('signedIn');
    },

    checkPin: async (pin) => (await getStoredItem(storageKeys.pin)) === pin,

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

    signOut: async () => {
      // Best effort: sign out locally even if the server can't be reached.
      await authService.signOutSession().catch(() => undefined);
      await resetToSignedOut();
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
