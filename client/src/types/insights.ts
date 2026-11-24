// AI analysis of a pet's recent days: the vet's data and the daily logs read together.
// Matches GET /pets/:petId/insights (server/src/modules/insights, coming); mock for now.

import type { TrafficLightLevel } from '@/types/health';

export type InsightReason = {
  /** "vet": visits, care plan, medication. "behaviour": the daily logs. */
  source: 'vet' | 'behaviour';
  text: string;
};

/** How the recovery compares with what the vet expected */
export type InsightComparison = 'asExpected' | 'slower' | 'worse';

export type Insight = {
  petId: string;
  /** "claude" when the AI wrote it; "sample" in demo mode */
  source: 'claude' | 'sample';
  /** Level from the app's rules alone */
  ruleLevel: TrafficLightLevel;
  /** Final level: the higher of the rules' and the AI's. The AI can raise it, never lower it. */
  level: TrafficLightLevel;
  raisedByAi: boolean;
  /** Two or three sentences for the owner */
  summary: string;
  /** Null when no condition is being watched */
  comparison: InsightComparison | null;
  reasons: InsightReason[];
  watchFor: string[];
  callVetIf: string[];
  /** One sentence about the water intake chart, or null */
  trendNote: string | null;
  /** Short lines for the vet, e.g. when sharing the passport */
  vetSummary: string[];
};
