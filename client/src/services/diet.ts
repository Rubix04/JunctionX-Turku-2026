import { mockDelay } from '@/services/mock/delay';
import { mockDietPlans, mockTrends, mockWeights } from '@/services/mock/diet';
import type { DietPlan, Trends, WeightEntry } from '@/types/diet';
import { todayIso } from '@/utils/format';

// Diet, weight and trends (spec 3). Backend: server/src/modules/diet. Mock only until
// the client signs in to the backend.

export const getDietPlan = async (petId: string): Promise<DietPlan | null> =>
  mockDelay(mockDietPlans.find((d) => d.petId === petId) ?? null);

/** Oldest first */
export const getWeights = async (petId: string): Promise<WeightEntry[]> =>
  mockDelay([...(mockWeights[petId] ?? [])].sort((a, b) => a.date.localeCompare(b.date)));

/** Saves today's weight, replacing an earlier entry from today */
export const logWeight = async (petId: string, weightKg: number): Promise<WeightEntry> => {
  const entry = { date: todayIso(), weightKg };
  const entries = (mockWeights[petId] ??= []);
  const existing = entries.findIndex((e) => e.date === entry.date);
  if (existing >= 0) {
    entries.splice(existing, 1);
  }
  entries.push(entry);
  return mockDelay(entry);
};

export const getTrends = async (petId: string): Promise<Trends | null> =>
  mockDelay(mockTrends.find((t) => t.petId === petId) ?? null);
