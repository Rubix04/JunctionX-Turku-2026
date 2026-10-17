import type { DietPlan, Trends, WeightEntry } from '@/types/diet';

export const mockDietPlans: DietPlan[] = [
  {
    petId: 'mirri',
    name: 'Urinary diet, mostly wet food',
    reason: "Wet food adds water to every meal, which helps flush Mirri's bladder while she heals.",
    recommendedBy: 'Dr. Laine',
    dailyKcal: 200,
    foodKcalPer100g: 85,
    mealsPerDay: 3,
    targetWeightKg: 4.4,
    idealWeightKg: [4.2, 4.6],
    productId: 'urinary-wet',
  },
  {
    petId: 'rekku',
    name: 'Maintenance diet',
    reason: 'A complete adult dog food. Keep treats under a tenth of the daily energy.',
    recommendedBy: null,
    dailyKcal: null,
    foodKcalPer100g: 370,
    mealsPerDay: 2,
    targetWeightKg: null,
    idealWeightKg: [29, 32],
    productId: 'joint-supplement',
  },
];

export const mockWeights: Record<string, WeightEntry[]> = {
  mirri: [
    { date: '2026-07-15', weightKg: 5.0 },
    { date: '2026-08-01', weightKg: 4.95 },
    { date: '2026-08-20', weightKg: 4.9 },
    { date: '2026-09-05', weightKg: 4.8 },
    { date: '2026-09-19', weightKg: 4.75 },
    { date: '2026-09-26', weightKg: 4.7 },
    { date: '2026-10-03', weightKg: 4.65 },
    { date: '2026-10-13', weightKg: 4.6 },
  ],
  rekku: [
    { date: '2026-08-10', weightKg: 31.4 },
    { date: '2026-09-12', weightKg: 31.1 },
    { date: '2026-10-10', weightKg: 31.0 },
  ],
};

export const mockTrends: Trends[] = [
  {
    petId: 'mirri',
    waterByWeek: [
      { label: 'W39', ml: 215 },
      { label: 'W40', ml: 210 },
      { label: 'W41', ml: 220 },
      { label: 'W42', ml: 265 },
      { label: 'now', ml: 290 },
    ],
    waterByMonth: [
      { label: '2026-05', ml: 218 },
      { label: '2026-06', ml: 212 },
      { label: '2026-07', ml: 215 },
      { label: '2026-08', ml: 210 },
      { label: '2026-09', ml: 240 },
      { label: '2026-10', ml: 290 },
    ],
    waterWatchMl: 250,
  },
];
