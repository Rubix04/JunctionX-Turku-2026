// Diet, weight and trends (spec 3). Shapes follow server/src/modules/diet.

export type WeightEntry = { date: string; weightKg: number };

export type DietPlan = {
  petId: string;
  name: string;
  reason: string;
  recommendedBy: string | null;
  /** Daily energy set by the vet; null = estimated from weight */
  dailyKcal: number | null;
  foodKcalPer100g: number;
  mealsPerDay: number;
  targetWeightKg: number | null;
  idealWeightKg: [number, number] | null;
  productId: string | null;
};

/** Average per week, oldest first */
export type WaterIntakeWeek = { label: string; ml: number };

export type Trends = {
  petId: string;
  waterByWeek: WaterIntakeWeek[];
  waterByMonth: WaterIntakeWeek[];
  /** Watch level from the vet's thresholds, ml per day */
  waterWatchMl: number | null;
};
