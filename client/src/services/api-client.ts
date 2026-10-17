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

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
};

export const apiFetch = async <T>(path: string, { method = 'GET', body }: RequestOptions = {}) => {
  if (!apiUrl) {
    throw new Error('EXPO_PUBLIC_API_URL is not set');
  }

  const headers: Record<string, string> = {};
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) {
    headers['Content-Type'] = 'application/json';
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

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
