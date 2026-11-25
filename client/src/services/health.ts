import { mockDailyLogs, mockGeneralQuestions, mockWatchLists } from '@/services/mock/data';
import { mockDelay } from '@/services/mock/delay';
import type { DailyLog, HealthStatus, LogQuestion, TrafficLightLevel, WatchList } from '@/types/health';
import { evaluateLog } from '@/utils/evaluate-log';
import { daysBetween, todayIso } from '@/utils/format';

// Symptom tracking. No backend endpoints yet: mock only.

/** A log from today or yesterday says how the pet is doing now; an older one doesn't. */
const RECENT_LOG_DAYS = 2;

export const isRecentLog = (log: DailyLog | null, today = todayIso()): log is DailyLog =>
  log !== null && log.date <= today && daysBetween(log.date, today) < RECENT_LOG_DAYS;

/** The vet's watch list runs from its start date for `totalDays` days, then ends. */
export const isWatchListActive = (watchList: WatchList, today = todayIso()) =>
  watchList.startDate <= today && daysBetween(watchList.startDate, today) < watchList.totalDays;

/** The pet's watch list, only while it is running */
const watchListFor = (petId: string) => {
  const watchList = mockWatchLists.find((w) => w.petId === petId);
  return watchList && isWatchListActive(watchList) ? watchList : null;
};

const latestLogFor = (petId: string) =>
  mockDailyLogs
    .filter((log) => log.petId === petId)
    .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;

/** Oldest first */
export const getDailyLogs = async (petId: string): Promise<DailyLog[]> =>
  mockDelay(mockDailyLogs.filter((l) => l.petId === petId).sort((a, b) => a.date.localeCompare(b.date)));

/** Watch list questions first, then the general ones. */
export const getLogQuestions = async (petId: string): Promise<LogQuestion[]> =>
  mockDelay([...(watchListFor(petId)?.questions ?? []), ...mockGeneralQuestions]);

export const getHealthStatus = async (petId: string): Promise<HealthStatus> => {
  const watchList = watchListFor(petId);
  const latestLog = latestLogFor(petId);
  const questions = [...(watchList?.questions ?? []), ...mockGeneralQuestions];

  return mockDelay({
    petId,
    // Without a recent log there is nothing new to judge: the light shows "as usual".
    level: isRecentLog(latestLog) ? evaluateLog(latestLog, questions) : 'green',
    watchList,
    latestLog,
  });
};

/** Saves today's log and returns its traffic light. Replaces an earlier log from the same day. */
export const saveDailyLog = async (log: DailyLog): Promise<TrafficLightLevel> => {
  const existing = mockDailyLogs.findIndex((l) => l.petId === log.petId && l.date === log.date);
  if (existing >= 0) {
    mockDailyLogs.splice(existing, 1);
  }
  mockDailyLogs.push(log);

  const questions = await getLogQuestions(log.petId);
  return evaluateLog(log, questions);
};
