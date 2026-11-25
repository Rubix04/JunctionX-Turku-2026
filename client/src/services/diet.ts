import { useMockData } from '@/constants/config';
import { apiFetch } from '@/services/api-client';
import { getCarePlan } from '@/services/care';
import { mockDelay } from '@/services/mock/delay';
import { mockDietPlans, mockTrends, mockWeights } from '@/services/mock/diet';
import { mockPets } from '@/services/mock/data';
import { getPet } from '@/services/pets';
import type { DietPlan, Trends, WeightEntry } from '@/types/diet';
import { currentLanguage, todayIso } from '@/utils/format';

// Diet, weight and trends (spec 3). Backend: server/src/modules/diet, used when an API URL is set;
// otherwise the mock data. Water intake has no backend yet (logs record "less / usual / more", not
// millilitres), so the demo pets show the mock chart either way.

// ---- Backend ----

type ApiDiet = {
  plan: {
    dietType: string;
    source: 'vet' | 'owner';
    foodName: string;
    mealsPerDay: number;
    targetWeightKg: number | null;
  } | null;
  diet: { title: string; summary: string } | null;
};
type ApiWeight = { weighedOn: string; weightKg: number };

/** Energy of the food per 100 g when the backend doesn't know it: a typical wet food */
const DEFAULT_KCAL_PER_100G = 85;

/** Products in the store finder that go with a diet type */
const productForDiet: Record<string, string> = { urinary: 'urinary-wet' };

// ---- API ----

export const getDietPlan = async (petId: string): Promise<DietPlan | null> => {
  if (!useMockData) {
    const [{ plan, diet }, carePlan] = await Promise.all([
      apiFetch<ApiDiet>(`/pets/${petId}/diet?lang=${currentLanguage()}`),
      getCarePlan(petId).catch(() => null),
    ]);
    if (!plan) return null;
    return {
      petId,
      name: plan.foodName,
      reason: diet?.summary ?? '',
      // The vet who wrote the latest care plan, when the vet chose the diet
      recommendedBy: plan.source === 'vet' ? carePlan?.vetName || null : null,
      dailyKcal: null,
      foodKcalPer100g: DEFAULT_KCAL_PER_100G,
      mealsPerDay: plan.mealsPerDay,
      targetWeightKg: plan.targetWeightKg,
      idealWeightKg: null,
      productId: productForDiet[plan.dietType] ?? null,
    };
  }
  return mockDelay(mockDietPlans.find((d) => d.petId === petId) ?? null);
};

/** Oldest first */
export const getWeights = async (petId: string): Promise<WeightEntry[]> => {
  if (!useMockData) {
    const { entries } = await apiFetch<{ entries: ApiWeight[] }>(`/pets/${petId}/weights`);
    return entries
      .map((e) => ({ date: e.weighedOn, weightKg: e.weightKg }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  return mockDelay([...(mockWeights[petId] ?? [])].sort((a, b) => a.date.localeCompare(b.date)));
};

/** Saves a weigh-in for today, replacing an earlier one from today */
export const logWeight = async (petId: string, weightKg: number): Promise<WeightEntry> => {
  if (!useMockData) {
    const saved = await apiFetch<ApiWeight>(`/pets/${petId}/weights`, { method: 'POST', body: { weightKg } });
    return { date: saved.weighedOn, weightKg: saved.weightKg };
  }
  const entry = { date: todayIso(), weightKg };
  const entries = (mockWeights[petId] ??= []);
  const existing = entries.findIndex((e) => e.date === entry.date);
  if (existing >= 0) {
    entries.splice(existing, 1);
  }
  entries.push(entry);
  return mockDelay(entry);
};

export const getTrends = async (petId: string): Promise<Trends | null> => {
  if (!useMockData) {
    // No water measurements on the backend yet: the demo pets keep the mock chart, by name.
    const pet = await getPet(petId);
    const mockId = mockPets.find((p) => p.name === pet.name)?.id;
    const trends = mockTrends.find((t) => t.petId === mockId);
    return trends ? mockDelay({ ...trends, petId }) : null;
  }
  return mockDelay(mockTrends.find((t) => t.petId === petId) ?? null);
};
