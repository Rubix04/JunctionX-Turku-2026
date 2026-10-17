import { mockDelay } from '@/services/mock/delay';
import { mockEmergencySigns, mockFirstAidTopics } from '@/services/mock/first-aid';
import { mockSeasonalAlerts, mockSpeciesTopics } from '@/services/mock/seasonal';
import type { Season, SeasonalAlert, SpeciesTopic } from '@/types/alerts';
import type { EmergencySign, FirstAidTopic } from '@/types/first-aid';
import type { Species } from '@/types/pet';

// Vet-maintained content: seasonal alerts, species topics and first aid guides.
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

// First aid works without network delay: it is used in emergencies.
export const getFirstAidTopics = async (): Promise<FirstAidTopic[]> => mockFirstAidTopics;

export const getFirstAidTopic = async (topicId: string): Promise<FirstAidTopic | null> =>
  mockFirstAidTopics.find((t) => t.id === topicId) ?? null;

export const getEmergencySigns = async (): Promise<EmergencySign[]> => mockEmergencySigns;
