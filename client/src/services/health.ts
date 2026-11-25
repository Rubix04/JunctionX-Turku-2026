import { useMockData } from '@/constants/config';
import { apiFetch } from '@/services/api-client';
import { mockDailyLogs, mockGeneralQuestions, mockWatchLists } from '@/services/mock/data';
import { mockDelay } from '@/services/mock/delay';
import type { DailyLog, HealthStatus, LogAnswer, LogQuestion, TrafficLightLevel, WatchList } from '@/types/health';
import { evaluateLog } from '@/utils/evaluate-log';
import { currentLanguage, daysBetween, todayIso } from '@/utils/format';

// Symptom tracking: daily logs, watch lists and the traffic light.
// Backend: server/src/modules/symptoms, used when an API URL is set; otherwise the mock data.

/** A log from today or yesterday says how the pet is doing now; an older one doesn't. */
const RECENT_LOG_DAYS = 2;

export const isRecentLog = (log: DailyLog | null, today = todayIso()): log is DailyLog =>
  log !== null && log.date <= today && daysBetween(log.date, today) < RECENT_LOG_DAYS;

/** The vet's watch list runs from its start date for `totalDays` days, then ends. */
export const isWatchListActive = (watchList: WatchList, today = todayIso()) =>
  watchList.startDate <= today && daysBetween(watchList.startDate, today) < watchList.totalDays;

// ---- Backend ----

type ApiQuestion = {
  id: string;
  label: string;
  options: string[];
  yellowIf: LogAnswer[];
  redIf: LogAnswer[];
  emergencyIf: LogAnswer[];
};
type ApiWatchList = {
  condition: string;
  vetName: string | null;
  startDate: string;
  totalDays: number | null;
  currentDay: number | null;
  questions: ApiQuestion[];
  yellowAdvice: string[];
  redWhen: string;
  redReason: string;
};
type ApiLog = { date: string; answers: Record<string, LogAnswer>; assessment: { trafficLight: TrafficLightLevel } };
type ApiHealthStatus = { trafficLight: TrafficLightLevel; watchLists: ApiWatchList[]; latestLog: ApiLog | null };

// The app has two levels above green; the backend's emergency answers count as red here.
const toQuestion = (q: ApiQuestion): LogQuestion => ({
  id: q.id,
  label: q.label,
  options: q.options as LogQuestion['options'],
  yellowIf: q.yellowIf,
  redIf: [...q.redIf, ...q.emergencyIf],
});

const toWatchList = (petId: string, list: ApiWatchList): WatchList => ({
  petId,
  condition: list.condition,
  vetName: list.vetName ?? '',
  startDate: list.startDate,
  // Long-term lists have no end; show them as "day N of N".
  totalDays: list.totalDays ?? Math.max(list.currentDay ?? 1, 1),
  questions: list.questions.map(toQuestion),
  yellowAdvice: list.yellowAdvice,
  redWhen: list.redWhen,
  redReason: list.redReason,
});

const toLog = (petId: string, log: ApiLog): DailyLog => ({ petId, date: log.date, answers: log.answers });

const lang = () => currentLanguage();

// ---- Mock ----

/** The pet's watch list, only while it is running */
const watchListFor = (petId: string) => {
  const watchList = mockWatchLists.find((w) => w.petId === petId);
  return watchList && isWatchListActive(watchList) ? watchList : null;
};

const latestLogFor = (petId: string) =>
  mockDailyLogs
    .filter((log) => log.petId === petId)
    .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;

// ---- API ----

/** Oldest first */
export const getDailyLogs = async (petId: string): Promise<DailyLog[]> => {
  if (!useMockData) {
    const { logs } = await apiFetch<{ logs: ApiLog[] }>(`/pets/${petId}/logs?lang=${lang()}`);
    return logs.map((log) => toLog(petId, log)).sort((a, b) => a.date.localeCompare(b.date));
  }
  return mockDelay(mockDailyLogs.filter((l) => l.petId === petId).sort((a, b) => a.date.localeCompare(b.date)));
};

/** Watch list questions first, then the general ones. */
export const getLogQuestions = async (petId: string): Promise<LogQuestion[]> => {
  if (!useMockData) {
    const { questions } = await apiFetch<{ questions: ApiQuestion[] }>(`/pets/${petId}/log-questions?lang=${lang()}`);
    return questions.map(toQuestion);
  }
  return mockDelay([...(watchListFor(petId)?.questions ?? []), ...mockGeneralQuestions]);
};

export const getHealthStatus = async (petId: string): Promise<HealthStatus> => {
  if (!useMockData) {
    // The backend already leaves out old logs and ended watch lists.
    const status = await apiFetch<ApiHealthStatus>(`/pets/${petId}/health-status?lang=${lang()}`);
    return {
      petId,
      level: status.trafficLight,
      watchList: status.watchLists[0] ? toWatchList(petId, status.watchLists[0]) : null,
      latestLog: status.latestLog ? toLog(petId, status.latestLog) : null,
    };
  }

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
  if (!useMockData) {
    // The backend's assessment also reads the pet's history (illnesses, earlier days, medication).
    const saved = await apiFetch<{ log: ApiLog }>(`/pets/${log.petId}/logs/${log.date}?lang=${lang()}`, {
      method: 'PUT',
      body: { answers: log.answers, emergencySymptoms: [], symptoms: [] },
    });
    return saved.log.assessment.trafficLight;
  }

  const existing = mockDailyLogs.findIndex((l) => l.petId === log.petId && l.date === log.date);
  if (existing >= 0) {
    mockDailyLogs.splice(existing, 1);
  }
  mockDailyLogs.push(log);

  const questions = await getLogQuestions(log.petId);
  return evaluateLog(log, questions);
};
