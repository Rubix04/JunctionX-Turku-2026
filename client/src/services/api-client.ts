import { apiUrl } from '@/constants/config';

// Error body sent by the backend: { error: { code, message } }
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

let accessToken: string | null = null;

// Set by the auth flow after signing in, cleared on sign out.
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

// For requests that don't go through apiFetch, e.g. images loaded by expo-image.
export const getAccessToken = () => accessToken;

/**
 * Sensitive actions (e.g. changing insurance details) answer 403 BANK_REAUTH_REQUIRED when the
 * last bank sign-in is too old. Confirm with the bank (useAuth().confirmWithBank) and retry.
 */
export const isBankReauthRequired = (error: unknown) =>
  error instanceof ApiError && error.status === 403 && error.code === 'BANK_REAUTH_REQUIRED';

// Gets a new access token when the old one has expired. Resolves false if the
// session is gone. Set by AuthProvider.
let refreshAccessToken: (() => Promise<boolean>) | null = null;
let refreshing: Promise<boolean> | null = null;

export const setTokenRefresher = (refresher: (() => Promise<boolean>) | null) => {
  refreshAccessToken = refresher;
};

// Refresh tokens are single use, so parallel requests share one refresh.
const refreshOnce = () => {
  if (!refreshing && refreshAccessToken) {
    refreshing = refreshAccessToken().finally(() => {
      refreshing = null;
    });
  }
  return refreshing ?? Promise.resolve(false);
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Internal: false on the retry after a token refresh */
  retryOnUnauthorized?: boolean;
};

export const apiFetch = async <T>(
  path: string,
  { method = 'GET', body, retryOnUnauthorized = true }: RequestOptions = {},
): Promise<T> => {
  if (!apiUrl) {
    throw new Error('EXPO_PUBLIC_API_URL is not set');
  }

  // FormData (file uploads) sets its own multipart Content-Type with the boundary.
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers: Record<string, string> = {};
  if (body !== undefined && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
  });

  const isSignInCall = path === '/auth/bank' || path === '/auth/refresh';
  const canRefresh = retryOnUnauthorized && accessToken !== null && !isSignInCall;
  if (response.status === 401 && canRefresh && (await refreshOnce())) {
    return apiFetch<T>(path, { method, body, retryOnUnauthorized: false });
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      data?.error?.code ?? 'REQUEST_ERROR',
      data?.error?.message ?? response.statusText,
    );
  }

  return (response.status === 204 ? undefined : await response.json()) as T;
};
