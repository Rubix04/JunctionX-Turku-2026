import type { DailyLog, LogQuestion, TrafficLightLevel } from '@/types/health';

// Traffic light for one daily log: red if any answer hits a red threshold,
// yellow if any hits a yellow one, otherwise green. The thresholds come from
// the vet's watch list; the app only suggests, the vet sets the limits.
export const evaluateLog = (log: DailyLog, questions: LogQuestion[]): TrafficLightLevel => {
  let level: TrafficLightLevel = 'green';

  for (const question of questions) {
    const answer = log.answers[question.id];
    if (answer === undefined) {
      continue;
    }
    if (question.redIf.includes(answer)) {
      return 'red';
    }
    if (question.yellowIf.includes(answer)) {
      level = 'yellow';
    }
  }

  return level;
};
