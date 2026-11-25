// The network layer: a stalled request must fail instead of spinning, and an expired access
// token is renewed once and the request retried.

jest.mock('@/constants/config', () => ({ apiUrl: 'https://api.test', useMockData: false }));

import { ApiError, apiFetch, setAccessToken, setTokenRefresher } from '@/services/api-client';

const json = (status: number, body: unknown) =>
  ({ ok: status < 400, status, statusText: '', json: async () => body }) as unknown as Response;

afterEach(() => {
  jest.useRealTimers();
  setAccessToken(null);
  setTokenRefresher(null);
});

it('sends the access token and returns the answer', async () => {
  setAccessToken('token-1');
  const fetchMock = jest.fn(async () => json(200, { pets: [] }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;

  await expect(apiFetch('/pets')).resolves.toEqual({ pets: [] });
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe('https://api.test/pets');
  expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-1');
});

it('renews an expired token once and retries the request', async () => {
  setAccessToken('old');
  const refresher = jest.fn(async () => {
    setAccessToken('new');
    return true;
  });
  setTokenRefresher(refresher);
  globalThis.fetch = jest
    .fn()
    .mockResolvedValueOnce(json(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } }))
    .mockResolvedValueOnce(json(200, { ok: true })) as unknown as typeof fetch;

  await expect(apiFetch('/pets')).resolves.toEqual({ ok: true });
  expect(refresher).toHaveBeenCalledTimes(1);
});

it('turns an error answer into an ApiError with the server code', async () => {
  setAccessToken('token');
  globalThis.fetch = jest.fn(async () => json(404, { error: { code: 'PET_NOT_FOUND', message: 'No such pet' } })) as unknown as typeof fetch;

  await expect(apiFetch('/pets/x')).rejects.toMatchObject({ status: 404, code: 'PET_NOT_FOUND' });
});

it('fails with TIMEOUT when the server never answers', async () => {
  jest.useFakeTimers();
  setAccessToken('token');
  globalThis.fetch = jest.fn(
    (_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      }),
  ) as unknown as typeof fetch;

  const request = apiFetch('/pets');
  jest.advanceTimersByTime(20_000);
  await expect(request).rejects.toBeInstanceOf(ApiError);
  await expect(request).rejects.toMatchObject({ code: 'TIMEOUT' });
});
