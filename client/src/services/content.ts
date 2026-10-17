import { mockDelay } from '@/services/mock/delay';
import { mockSeasonalAlerts, mockSpeciesTopics } from '@/services/mock/seasonal';
import type { Season, SeasonalAlert, SpeciesTopic } from '@/types/alerts';
import type { Species } from '@/types/pet';

// Vet-maintained content: seasonal alerts and species topics.
// Will come from the content database; mock only for now.

/** The season for a date. Christmas and New Year (15 Dec – 6 Jan) have their own cards. */
export const seasonFor = (date = new Date()): Season => {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if ((month === 12 && day >= 15) || (month === 1 && day <= 6)) return 'holidays';
  if (month <= 2 || month === 12) return 'winter';
  if (month <= 5) return 'spring';
  if (month <= 8) return 'summer';
  return 'autumn';
};

/** Cards for the given species; all cards when no species is given */
export const getSeasonalAlerts = async (species?: Species[]): Promise<SeasonalAlert[]> =>
  mockDelay(
    mockSeasonalAlerts.filter((a) => !species?.length || a.species.some((s) => species.includes(s))),
  );

export const getSpeciesTopics = async (species: Species): Promise<SpeciesTopic[]> =>
  mockDelay(mockSpeciesTopics.filter((t) => t.species === species));

