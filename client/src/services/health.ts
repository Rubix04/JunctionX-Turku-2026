import { mockDailyLogs, mockGeneralQuestions, mockWatchLists } from '@/services/mock/data';
import { mockDelay } from '@/services/mock/delay';
import type { DailyLog, HealthStatus, LogQuestion, TrafficLightLevel } from '@/types/health';
import { evaluateLog } from '@/utils/evaluate-log';

// Symptom tracking. No backend endpoints yet: mock only.

const watchListFor = (petId: string) => mockWatchLists.find((w) => w.petId === petId) ?? null;

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
    level: latestLog ? evaluateLog(latestLog, questions) : 'green',
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
