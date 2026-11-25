import { DR_LAINE } from '@/services/mock/clinics';
import { tr } from '@/services/mock/delay';
import { demoDate, demoMonth, demoWeek } from '@/services/mock/demo-date';
import type { DietPlan, Trends, WeightEntry } from '@/types/diet';

/** Week number label for the water chart, e.g. "vk 39" in Finnish */
const week = (n: number) => tr({ en: `W${n}`, fi: `vk ${n}`, sv: `v. ${n}` });

export const mockDietPlans: DietPlan[] = [
  {
    petId: 'mirri',
    name: tr({
      en: 'Urinary diet, mostly wet food',
      fi: 'Virtsatieruokavalio, pääosin märkäruokaa',
      sv: 'Urinvägsdiet, mest våtfoder',
    }),
    reason: tr({
      en: "Wet food adds water to every meal, which helps flush Mirri's bladder while she heals.",
      fi: 'Märkäruoka lisää vettä jokaiseen ateriaan, mikä auttaa huuhtelemaan Mirrin rakkoa paranemisen aikana.',
      sv: 'Våtfoder ger vatten i varje måltid, vilket hjälper till att skölja Mirris urinblåsa medan hon läker.',
    }),
    recommendedBy: DR_LAINE,
    dailyKcal: 200,
    foodKcalPer100g: 85,
    mealsPerDay: 3,
    targetWeightKg: 4.4,
    idealWeightKg: [4.2, 4.6],
    productId: 'urinary-wet',
  },
  {
    petId: 'rekku',
    name: tr({ en: 'Maintenance diet', fi: 'Ylläpitoruokavalio', sv: 'Underhållsdiet' }),
    reason: tr({
      en: 'A complete adult dog food. Keep treats under a tenth of the daily energy.',
      fi: 'Täysravinto aikuiselle koiralle. Pidä herkut alle kymmenesosassa päivän energiasta.',
      sv: 'Ett helfoder för vuxna hundar. Håll godbitarna under en tiondel av dagens energi.',
    }),
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
    { date: demoDate('2026-07-15'), weightKg: 5.0 },
    { date: demoDate('2026-08-01'), weightKg: 4.95 },
    { date: demoDate('2026-08-20'), weightKg: 4.9 },
    { date: demoDate('2026-09-05'), weightKg: 4.8 },
    { date: demoDate('2026-09-19'), weightKg: 4.75 },
    { date: demoDate('2026-09-26'), weightKg: 4.7 },
    { date: demoDate('2026-10-03'), weightKg: 4.65 },
    { date: demoDate('2026-10-13'), weightKg: 4.6 },
  ],
  rekku: [
    { date: demoDate('2026-08-10'), weightKg: 31.4 },
    { date: demoDate('2026-09-12'), weightKg: 31.1 },
    { date: demoDate('2026-10-10'), weightKg: 31.0 },
  ],
};

export const mockTrends: Trends[] = [
  {
    petId: 'mirri',
    waterByWeek: [
      { label: week(demoWeek(4)), ml: 215 },
      { label: week(demoWeek(3)), ml: 210 },
      { label: week(demoWeek(2)), ml: 220 },
      { label: week(demoWeek(1)), ml: 265 },
      { label: 'now', ml: 290 },
    ],
    waterByMonth: [
      { label: demoMonth(5), ml: 218 },
      { label: demoMonth(4), ml: 212 },
      { label: demoMonth(3), ml: 215 },
      { label: demoMonth(2), ml: 210 },
      { label: demoMonth(1), ml: 240 },
      { label: demoMonth(0), ml: 290 },
    ],
    waterWatchMl: 250,
  },
];
