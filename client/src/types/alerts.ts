import type { Localized } from '@/types/content';
import type { Species } from '@/types/pet';

// Seasonal alerts (spec 9). Maintained by a vet; each card shows its update date.

export type Season = 'winter' | 'spring' | 'summer' | 'autumn' | 'holidays';

export type SeasonalAlert = {
  id: string;
  season: Season;
  /** Which species the card is for */
  species: Species[];
  title: Localized;
  risk: Localized;
  prevention: Localized;
  watchFor: Localized;
  /** Daily log question ids that match this risk, e.g. "vomiting" */
  relatedSymptoms: string[];
  /** Knowledge base entry or first aid guide to open from the card */
  substanceId: string | null;
  firstAidTopic: string | null;
  updatedOn: string;
};

/** Short dog or cat section topics on the pet page (spec 11). */
export type SpeciesTopic = {
  id: string;
  species: Species;
  title: Localized;
  tip: Localized;
  /** Danger topics are highlighted in red, e.g. lilies for cats */
  danger: boolean;
  substanceId: string | null;
  firstAidTopic: string | null;
};
