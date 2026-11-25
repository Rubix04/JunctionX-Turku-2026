import type { DayHours } from '@/types/clinic';

const minutes = (time: string) => {
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
};

/** Monday = 0, as in the opening hours data */
const weekdayIndex = (date: Date) => (date.getDay() + 6) % 7;

type Hours = { hours: DayHours[]; emergency24h?: boolean };

export const isOpenNow = ({ hours, emergency24h }: Hours, now = new Date()) => {
  if (emergency24h) {
    return true;
  }
  const today = hours[weekdayIndex(now)];
  if (!today) {
    return false;
  }
  const current = now.getHours() * 60 + now.getMinutes();
  return current >= minutes(today.open) && current < minutes(today.close);
};
