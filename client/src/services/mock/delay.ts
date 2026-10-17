// Mock calls wait a moment so loading states show up as they will with the real API.
export const mockDelay = <T>(value: T, ms = 300) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));
