// Symptom tracking: watch lists, daily logs and the traffic light.
// No backend endpoints yet; served from services/mock for now.

export type TrafficLightLevel = 'green' | 'yellow' | 'red';

/** Index of the chosen option: 0, 1 or 2. Option 1 is always "as usual". */
export type LogAnswer = 0 | 1 | 2;

export type LogQuestion = {
  id: string;
  label: string;
  /** Three answer options, e.g. ["Less", "Usual", "More"] */
  options: [string, string, string];
  /** Answers that turn the result yellow */
  yellowIf: LogAnswer[];
  /** Answers that turn the result red */
  redIf: LogAnswer[];
};

/** What the vet asked the owner to watch after a diagnosis. */
export type WatchList = {
  petId: string;
  condition: string;
  vetName: string;
  startDate: string;
  totalDays: number;
  questions: LogQuestion[];
};

export type DailyLog = {
  petId: string;
  /** ISO date */
  date: string;
  /** Question id -> answer */
  answers: Record<string, LogAnswer>;
};

export type HealthStatus = {
  petId: string;
  level: TrafficLightLevel;
  /** Null when the pet has no active watch list */
  watchList: WatchList | null;
  latestLog: DailyLog | null;
};
