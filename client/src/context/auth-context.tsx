import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

import { ApiError, setAccessToken, setTokenRefresher } from '@/services/api-client';
import * as authService from '@/services/auth';
import {
  deleteStoredItem,
  getStoredItem,
  setStoredItem,
  storageKeys,
} from '@/services/secure-storage';
import type { SignInResponse } from '@/types/auth';

/**
 * - loading: reading the saved session on app start
 * - signedOut: no saved session → sign-in screens
 * - signedIn: the app is open
 */
export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

type AuthContextValue = {
  status: AuthStatus;
  displayName: string | null;
  signInWithBank: (bankId: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const clearStoredSession = () =>
  Promise.all([
    deleteStoredItem(storageKeys.refreshToken),
    deleteStoredItem(storageKeys.displayName),
  ]);

const isSessionGone = (error: unknown) =>
  error instanceof ApiError && (error.status === 401 || error.status === 403);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [displayName, setDisplayName] = useState<string | null>(null);

  const resetToSignedOut = async () => {
    await clearStoredSession();
    setAccessToken(null);
    setDisplayName(null);
    setStatus('signedOut');
  };

  const startSession = async (session: SignInResponse) => {
    await Promise.all([
      setStoredItem(storageKeys.refreshToken, session.refreshToken),
      setStoredItem(storageKeys.displayName, session.user.displayName),
    ]);
    setAccessToken(session.accessToken);
    setDisplayName(session.user.displayName);
    setStatus('signedIn');
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
      const refreshToken = await getStoredItem(storageKeys.refreshToken);
      if (!refreshToken) {
        setStatus('signedOut');
        return;
      }
      const session = await refreshTokens();
      await startSession(session);
    };
    restore().catch(() => resetToSignedOut());
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

    signInWithBank: async (bankId) => {
      await startSession(await authService.signInWithBank(bankId));
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
