import { isRecentLog, isWatchListActive } from '@/services/health';
import type { DailyLog, LogQuestion, WatchList } from '@/types/health';
import { evaluateLog } from '@/utils/evaluate-log';
import { formatPhone } from '@/utils/links';
import { isOpenNow } from '@/utils/opening-hours';
import { estimateDailyKcal, gramsPerDay } from '@/utils/portion';
import { isValidEmail } from '@/utils/validation';

const question = (id: string, yellowIf: (0 | 1 | 2)[], redIf: (0 | 1 | 2)[]) =>
  ({ id, label: id, options: ['Less', 'As usual', 'More'], yellowIf, redIf }) as unknown as LogQuestion;

const log = (date: string, answers: Record<string, 0 | 1 | 2> = {}): DailyLog => ({ petId: 'p', date, answers });

describe('traffic light for a daily log', () => {
  const questions = [question('water', [2], []), question('straining', [1], [2])];

  it('is green when every answer is as usual', () => {
    expect(evaluateLog(log('2026-11-25', { water: 1, straining: 0 }), questions)).toBe('green');
  });

  it('is yellow when an answer hits a yellow limit', () => {
    expect(evaluateLog(log('2026-11-25', { water: 2, straining: 0 }), questions)).toBe('yellow');
  });

  it('is red when any answer hits a red limit, whatever the others say', () => {
    expect(evaluateLog(log('2026-11-25', { water: 2, straining: 2 }), questions)).toBe('red');
  });
});

describe('what counts as current', () => {
  it('uses a log from today or yesterday, not older ones or future dates', () => {
    expect(isRecentLog(log('2026-11-25'), '2026-11-25')).toBe(true);
    expect(isRecentLog(log('2026-11-24'), '2026-11-25')).toBe(true);
    expect(isRecentLog(log('2026-11-23'), '2026-11-25')).toBe(false);
    expect(isRecentLog(log('2026-11-26'), '2026-11-25')).toBe(false);
    expect(isRecentLog(null, '2026-11-25')).toBe(false);
  });

  it('runs a watch list for its days only', () => {
    const watchList = { startDate: '2026-11-20', totalDays: 10 } as WatchList;
    expect(isWatchListActive(watchList, '2026-11-19')).toBe(false);
    expect(isWatchListActive(watchList, '2026-11-20')).toBe(true);
    expect(isWatchListActive(watchList, '2026-11-29')).toBe(true);
    expect(isWatchListActive(watchList, '2026-11-30')).toBe(false);
  });
});

describe('opening hours', () => {
  const weekdays = { open: '08:00', close: '18:00' };
  const clinic = { hours: [weekdays, weekdays, weekdays, weekdays, weekdays, null, null] };

  it('is open inside the hours and closed outside them', () => {
    expect(isOpenNow(clinic, new Date(2026, 10, 25, 12, 0))).toBe(true); // Wednesday noon
    expect(isOpenNow(clinic, new Date(2026, 10, 25, 18, 0))).toBe(false); // closing time
    expect(isOpenNow(clinic, new Date(2026, 10, 28, 12, 0))).toBe(false); // Saturday
  });

  it('is always open for a 24 h emergency clinic', () => {
    expect(isOpenNow({ ...clinic, emergency24h: true }, new Date(2026, 10, 28, 3, 0))).toBe(true);
  });
});

describe('small helpers', () => {
  it('estimates daily energy and grams of food', () => {
    expect(estimateDailyKcal('cat', 4.6)).toBe(264); // 70 × 4.6^0.75 × 1.2
    expect(gramsPerDay(200, 85)).toBe(235);
  });

  it('checks email addresses', () => {
    expect(isValidEmail(' aino@example.fi ')).toBe(true);
    expect(isValidEmail('aino@example')).toBe(false);
  });

  it('groups a Finnish phone number', () => {
    expect(formatPhone('+358400000001')).toBe('+358 40 000 0001');
  });
});
