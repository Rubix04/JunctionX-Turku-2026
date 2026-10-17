import type { Language } from '@/i18n';

/** Text in each app language, for content that comes from the content database. */
export type Localized<T = string> = Record<Language, T>;
