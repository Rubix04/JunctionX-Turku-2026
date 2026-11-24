import { z } from "zod";

/**
 * What the AI writes about a pet's recent days. It explains the data; the traffic light itself
 * comes from the rules in symptoms/assessment.ts, and the AI may only suggest raising it.
 */
export const insightSchema = z.object({
  /** Two or three sentences for the owner */
  summary: z.string(),
  /** How the recovery compares with what the vet expected; null when nothing is being watched */
  comparison: z.enum(["asExpected", "slower", "worse"]).nullable(),
  /** Why the pet is where it is, each tied to where it came from */
  reasons: z.array(z.object({ source: z.enum(["vet", "behaviour"]), text: z.string() })),
  /** What to keep an eye on in the coming days */
  watchFor: z.array(z.string()),
  /** When to call the clinic */
  callVetIf: z.array(z.string()),
  /** One sentence on how the logged answers changed over the period, or null */
  trendNote: z.string().nullable(),
  /** The AI's own view of the level. Used only when it is higher than the rules' level. */
  suggestedLevel: z.enum(["normal", "monitor", "contactVet"]),
  /** Three to five short lines a vet can read in seconds, in the owner's language */
  vetSummary: z.array(z.string()),
});

export type Insight = z.infer<typeof insightSchema>;

/** The response of GET /pets/:petId/insights; matches client/src/types/insights.ts. */
export const insightResponseSchema = z.object({
  petId: z.string(),
  source: z.enum(["claude", "sample"]),
  ruleLevel: z.enum(["green", "yellow", "red"]),
  level: z.enum(["green", "yellow", "red"]),
  raisedByAi: z.boolean(),
  summary: z.string(),
  comparison: insightSchema.shape.comparison,
  reasons: insightSchema.shape.reasons,
  watchFor: z.array(z.string()),
  callVetIf: z.array(z.string()),
  trendNote: z.string().nullable(),
  vetSummary: z.array(z.string()),
});
