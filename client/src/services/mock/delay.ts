import type { Localized } from '@/types/content';
import { localize } from '@/utils/format';

const TRANSLATION = Symbol('translation');

/**
 * A mock text in all three languages, typed as a plain string. mockDelay turns it into the app's
 * current language when the data is handed to a screen, so switching language works right away.
 */
export const tr = (text: Localized): string => ({ [TRANSLATION]: true, ...text }) as unknown as string;

/** Replaces every tr() text in the data with the current language. Returns copies. */
const translate = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(translate);
  if (value && typeof value === 'object') {
    if (TRANSLATION in value) return localize(value as unknown as Localized);
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, translate(item)]));
  }
  return value;
};

// Mock calls wait a moment so loading states show up as they will with the real API.
export const mockDelay = <T>(value: T, ms = 300) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(translate(value) as T), ms));
