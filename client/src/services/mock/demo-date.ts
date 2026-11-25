import { addDays, daysBetween, parseDate, todayIso } from '@/utils/format';

// The demo story (Mirri's urinary tract infection) was written as if today were 17 October 2026:
// visit on the 13th, logs up to yesterday, antibiotic doses today. Every date in the mock data is
// moved by the same number of days, so the story always happens around the real today instead
// of drifting into the past (an ended watch list, a course "day 10 of 10" for weeks).
const STORY_TODAY = '2026-10-17';

/** Days between the story's today and the real one, fixed when the app starts. */
const offset = daysBetween(STORY_TODAY, todayIso());

/** A story date ("2026-10-13" or "2026-10-22T14:30:00") moved to the same place around today. */
export const demoDate = (iso: string) => {
  const date = addDays(iso.slice(0, 10), offset);
  return iso.length > 10 ? `${date}${iso.slice(10)}` : date;
};

/** ISO week number, e.g. 42, `weeksAgo` weeks before today */
export const demoWeek = (weeksAgo: number) => {
  const date = parseDate(addDays(todayIso(), -7 * weeksAgo));
  // ISO 8601: weeks start on Monday, and week 1 holds the year's first Thursday.
  const thursday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const yearStart = new Date(thursday.getFullYear(), 0, 1);
  return Math.floor(Math.round((thursday.getTime() - yearStart.getTime()) / 86_400_000) / 7) + 1;
};

/** "2026-09" for `monthsAgo` months before this month */
export const demoMonth = (monthsAgo: number) => {
  const now = parseDate(todayIso());
  const month = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
};
