// Set EXPO_PUBLIC_API_URL in client/.env to use the real backend, e.g. http://192.168.1.10:3000
// (your computer's network address, not localhost, when running on a phone).
// Without it the app runs on mock data, so screens can be built without the server.
export const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || null;

// Release builds send tokens and health data, so they only talk to the backend over https.
// Development may use http on the local network (see the address example above).
if (!__DEV__ && apiUrl && !apiUrl.startsWith('https://')) {
  throw new Error(`EXPO_PUBLIC_API_URL must use https in a release build (got ${apiUrl})`);
}

export const useMockData = !apiUrl;
