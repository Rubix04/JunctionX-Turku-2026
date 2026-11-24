// Seasonal alerts (spec 9). Matches GET /pets/:petId/alerts in server/src/modules/alerts.

export type Season = 'winter' | 'spring' | 'summer' | 'autumn';

export type SeasonalAlert = {
  id: string;
  season: Season;
  title: string;
  /** What can happen, in one or two sentences */
  risk: string;
  /** What the owner can do */
  prevention: string[];
  watchFor: string[];
  ifHappens: string;
  /** Extra notes for this pet's species and age */
  notes: string[];
  /** ISO date the season ends, or null */
  activeUntil: string | null;
};
