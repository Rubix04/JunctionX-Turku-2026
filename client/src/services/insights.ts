import { useMockData } from '@/constants/config';
import i18n from '@/i18n';
import { apiFetch } from '@/services/api-client';
import { getCarePlan, getMedicationCourse } from '@/services/care';
import { getTrends } from '@/services/diet';
import { getDailyLogs, getHealthStatus, getLogQuestions, isRecentLog } from '@/services/health';
import { getPet } from '@/services/pets';
import type { DailyLog, LogQuestion, TrafficLightLevel } from '@/types/health';
import type { Insight, InsightComparison, InsightReason } from '@/types/insights';
import { addDays, currentLanguage, daysBetween, formatDayMonth, formatNumber, todayIso } from '@/utils/format';

// AI analysis of a pet's recent days: what the vet said and what the daily logs show, read together.
// The backend endpoint (server/src/modules/insights) is coming. Until then, and without an API key,
// the sample below builds the analysis from the same data with fixed sentences, so the demo reacts
// to what the owner logs. Like the AI, it may raise the rules' level but never lower it.

/** How far back the analysis looks */
const WINDOW_DAYS = 14;
/** Symptoms this soon after a course ended may mean the illness is coming back */
const AFTER_COURSE_DAYS = 7;

const order: TrafficLightLevel[] = ['green', 'yellow', 'red'];
const higher = (a: TrafficLightLevel, b: TrafficLightLevel) => (order.indexOf(a) >= order.indexOf(b) ? a : b);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const t = (key: string, params?: Record<string, unknown>) => i18n.t(`insights.${key}`, params);

const isFlagged = (question: LogQuestion, answer: number | undefined) =>
  answer !== undefined && [...question.yellowIf, ...question.redIf].includes(answer as 0 | 1 | 2);

/** Days in a row, ending on the latest log, with the same answer to the question. */
const streakOf = (logs: DailyLog[], latest: DailyLog, questionId: string) => {
  const byDate = new Map(logs.map((log) => [log.date, log]));
  let days = 0;
  while (byDate.get(addDays(latest.date, -days))?.answers[questionId] === latest.answers[questionId]) {
    days += 1;
  }
  return days;
};

const sampleInsight = async (petId: string): Promise<Insight> => {
  const [pet, status, logs, questions, plan, course, trends] = await Promise.all([
    getPet(petId),
    getHealthStatus(petId),
    getDailyLogs(petId),
    getLogQuestions(petId),
    getCarePlan(petId),
    getMedicationCourse(petId),
    getTrends(petId),
  ]);
  const name = pet.name;
  const watchList = status.watchList;
  // The analysis is about today: an old log is history, not how the pet is doing now.
  const latest = isRecentLog(status.latestLog) ? status.latestLog : null;
  const anchor = todayIso();
  const recent = logs.filter((log) => log.date > addDays(anchor, -WINDOW_DAYS) && log.date <= anchor);
  const watchedIds = new Set(watchList?.questions.map((q) => q.id) ?? []);

  // From the daily logs
  const behaviour: string[] = [];
  let aiLevel: TrafficLightLevel = 'green';
  const flagged = latest ? questions.filter((q) => isFlagged(q, latest.answers[q.id])) : [];
  for (const question of flagged) {
    const answer = question.options[latest!.answers[question.id]].toLowerCase();
    const label = question.label;
    const days = streakOf(recent, latest!, question.id);
    behaviour.push(days >= 2 ? t('streak', { label, answer, days }) : t('today', { label, answer }));
    if (days >= 3) aiLevel = higher(aiLevel, 'red');
    else if (days >= 2 && watchedIds.has(question.id)) aiLevel = higher(aiLevel, 'yellow');
  }
  if (flagged.length >= 3) {
    behaviour.push(t('severalSigns', { name, count: flagged.length }));
    aiLevel = higher(aiLevel, 'red');
  }
  if (latest && !flagged.length) behaviour.push(t('allUsual', { date: formatDayMonth(latest.date) }));
  if (!recent.length) behaviour.push(t('noLogs', { name }));

  // From the vet
  const vet: string[] = [];
  if (watchList) vet.push(t('vet.watching', { condition: watchList.condition.toLowerCase(), vet: watchList.vetName }));
  if (plan) {
    vet.push(t('vet.plan', { diagnosis: plan.diagnosis.toLowerCase(), clinic: plan.clinicName }));
    if (plan.homeCare[0]) vet.push(t('vet.instruction', { text: plan.homeCare[0] }));
  }
  if (course) {
    const courseEnd = addDays(course.startDate, course.totalDays - 1);
    const daysAfter = daysBetween(courseEnd, anchor);
    vet.push(
      daysAfter > 0
        ? t('vet.courseEnded', { medicine: course.name, date: formatDayMonth(courseEnd) })
        : t('vet.courseUntil', { medicine: course.name, date: formatDayMonth(courseEnd) }),
    );
    if (daysAfter > 0 && daysAfter <= AFTER_COURSE_DAYS && flagged.length) {
      behaviour.unshift(t('afterCourse', { medicine: course.name.toLowerCase(), days: daysAfter }));
      aiLevel = higher(aiLevel, 'red');
    }
  }

  const level = higher(status.level, aiLevel);
  const comparison: InsightComparison | null = watchList
    ? level === 'green'
      ? 'asExpected'
      : level === 'yellow'
        ? 'slower'
        : 'worse'
    : null;

  const lead = watchList
    ? t(`summary.${comparison}`, { name, condition: watchList.condition.toLowerCase() })
    : t(`summary.${level}`, { name });

  // Water intake: the latest week against the one before and the vet's watch level
  const weeks = trends?.waterByWeek ?? [];
  const [previous, now] = weeks.slice(-2);
  let trendNote: string | null = null;
  if (previous && now) {
    const change = Math.round(((now.ml - previous.ml) / previous.ml) * 100);
    const params = { dl: formatNumber(now.ml / 100), change: `${change > 0 ? '+' : ''}${change}` };
    trendNote =
      trends?.waterWatchMl && now.ml > trends.waterWatchMl ? t('trend.aboveWatch', params) : t('trend.normal', params);
  }

  const reasons: InsightReason[] = [
    ...vet.map((text) => ({ source: 'vet' as const, text })),
    ...behaviour.map((text) => ({ source: 'behaviour' as const, text })),
  ];

  // Feels like the AI is reading, as it will with the real one.
  await wait(1200);

  return {
    petId,
    source: 'sample',
    ruleLevel: status.level,
    level,
    raisedByAi: level !== status.level,
    summary: [lead, behaviour[0]].filter(Boolean).join(' '),
    comparison,
    reasons,
    watchFor: watchList ? watchList.questions.map((q) => q.label) : flagged.map((q) => q.label),
    callVetIf: [...(watchList ? [watchList.redWhen] : []), t('callVet.worse'), t('callVet.noFood')],
    trendNote,
    vetSummary: [t('vetSummary.logs', { count: recent.length, days: WINDOW_DAYS }), ...behaviour, ...vet],
  };
};

/** The analysis for one pet. Uses the backend when it has the endpoint, otherwise the sample. */
export const getInsights = async (petId: string): Promise<Insight> => {
  if (!useMockData) {
    try {
      return await apiFetch<Insight>(`/pets/${petId}/insights?lang=${currentLanguage()}`);
    } catch {
      // The endpoint is not there yet: fall back to the sample.
    }
  }
  return sampleInsight(petId);
};
