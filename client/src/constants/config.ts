// Set EXPO_PUBLIC_API_URL in client/.env to use the real backend, e.g. http://192.168.1.10:3000
// (your computer's network address, not localhost, when running on a phone).
// Without it the app runs on mock data, so screens can be built without the server.
export const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? null;

export const useMockData = !apiUrl;
