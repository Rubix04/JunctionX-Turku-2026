import i18n, { type Language } from '@/i18n';
import type { Localized } from '@/types/content';

// Dates and numbers in the app language. Finnish and Swedish use Finnish formats.
const locales: Record<Language, string> = { en: 'en-GB', fi: 'fi-FI', sv: 'sv-FI' };

export const currentLanguage = (): Language => {
  const lang = i18n.language as Language;
  return lang in locales ? lang : 'en';
};

const locale = () => locales[currentLanguage()];

/** Picks the text for the app language from content that has all three. */
export const localize = <T>(text: Localized<T>): T => text[currentLanguage()] ?? text.en;

/** "2026-10-17" for today, in local time */
export const todayIso = (now = new Date()) => {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

/** Parses "2026-10-17" as a local date, not UTC */
export const parseDate = (iso: string) =>
  iso.length === 10 ? new Date(`${iso}T00:00:00`) : new Date(iso);

export const addDays = (iso: string, days: number) => {
  const date = parseDate(iso);
  date.setDate(date.getDate() + days);
  return todayIso(date);
};

/** Whole days from a to b */
export const daysBetween = (a: string, b: string) =>
  Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86_400_000);

const format = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale(), options).format(parseDate(iso));

/** "17 Oct" */
export const formatDayMonth = (iso: string) => format(iso, { day: 'numeric', month: 'short' });

/** "17 October 2026" */
export const formatLongDate = (iso: string) =>
  format(iso, { day: 'numeric', month: 'long', year: 'numeric' });

/** "17.10.2026" */
export const formatShortDate = (iso: string) =>
  format(iso, { day: '2-digit', month: '2-digit', year: 'numeric' });

/** "Saturday 17 October" */
export const formatWeekdayDate = (iso: string) =>
  format(iso, { weekday: 'long', day: 'numeric', month: 'long' });

/** "Thu 22 Oct" */
export const formatShortWeekdayDate = (iso: string) =>
  format(iso, { weekday: 'short', day: 'numeric', month: 'short' });

/** "Oct" */
export const formatMonth = (iso: string) => format(iso, { month: 'short' });

/** "OCT" */
export const formatMonthShort = (iso: string) =>
  format(iso, { month: 'short' }).replace('.', '').toUpperCase();

/** "20:00" */
export const formatTime = (iso: string) =>
  new Intl.DateTimeFormat(locale(), { hour: '2-digit', minute: '2-digit', hour12: false }).format(
    new Date(iso),
  );

export const formatNumber = (value: number, maximumFractionDigits = 1) =>
  new Intl.NumberFormat(locale(), { maximumFractionDigits }).format(value);

export const formatEuros = (value: number) =>
  new Intl.NumberFormat(locale(), { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(
    value,
  );

/** Full years from the birth date to today */
export const ageInYears = (birthDate: string, today = todayIso()) => {
  const birth = parseDate(birthDate);
  const now = parseDate(today);
  let years = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
    years -= 1;
  }
  return years;
};

/** Accepts "4.6" and "4,6" */
export const parseDecimal = (text: string) => {
  const value = Number(text.replace(',', '.').trim());
  return text.trim() !== '' && Number.isFinite(value) ? value : null;
};

/** "dd.mm.yyyy" -> "yyyy-mm-dd", or null if it isn't a real date */
export const parseFinnishDate = (text: string) => {
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text.trim());
  if (!match) {
    return null;
  }
  const [, day, month, year] = match;
  const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const date = parseDate(iso);
  return date.getDate() === Number(day) && date.getMonth() + 1 === Number(month) ? iso : null;
};
