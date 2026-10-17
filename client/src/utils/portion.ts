import type { Species } from '@/types/pet';

// Daily energy and portions (spec 3). Same formula as server/src/modules/diet/calculations.ts:
// resting energy 70 × kg^0.75, times a factor for an adult pet. Sample values until a vet reviews them.
const adultFactor: Record<Species, number> = { dog: 1.6, cat: 1.2, smallAnimal: 1.2 };

export const estimateDailyKcal = (species: Species, weightKg: number) =>
  Math.round(70 * weightKg ** 0.75 * adultFactor[species]);

export const gramsPerDay = (dailyKcal: number, kcalPer100g: number) =>
  Math.round((dailyKcal / kcalPer100g) * 100);
