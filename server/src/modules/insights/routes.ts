import { createHash } from "node:crypto";

import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { currentUser } from "../../plugins/auth.js";
import { todayInFinland } from "../passport/service.js";
import { petParamsSchema } from "../pets/schemas.js";
import { getPet } from "../pets/service.js";
import { maxLevel, trafficLightFor } from "../symptoms/assessment.js";
import { gatherInsightInput } from "./gather.js";
import type { InsightWriter } from "./readers.js";
import { insightResponseSchema } from "./schema.js";

/**
 * GET /pets/:petId/insights?lang=fi: the AI reads the vet's data and the daily logs together.
 *
 * The rules decide the level; the AI may raise it up to "contact a vet", never lower it, and
 * emergencies stay with the rules. Answers are kept per pet, language and data, so the AI is only
 * asked again when something changes (a new log, visit or care plan).
 */

const MAX_CACHED = 500;

type InsightResponse = z.infer<typeof insightResponseSchema>;

export const insightsRoutes: FastifyPluginAsyncZod<{ writer: InsightWriter }> = async (app, { writer }) => {
  app.addHook("preHandler", app.authenticate);
  const cache = new Map<string, InsightResponse>();
  // The app asks for the same pet from several screens at once: one AI call serves them all.
  const inFlight = new Map<string, Promise<InsightResponse>>();

  app.get(
    "/:petId/insights",
    {
      schema: {
        params: petParamsSchema,
        querystring: z.object({ lang: z.enum(["fi", "sv", "en"]).default("fi") }),
        response: { 200: insightResponseSchema },
      },
    },
    async (request) => {
      const pet = getPet(app.db, currentUser(request).householdId, request.params.petId);
      const { lang } = request.query;
      const input = gatherInsightInput(app.db, pet, lang, todayInFinland());
      const key = `${pet.id}:${lang}:${createHash("sha256").update(JSON.stringify(input)).digest("hex")}`;
      const cached = cache.get(key);
      if (cached) {
        return cached;
      }
      const pending = inFlight.get(key);
      if (pending) {
        return pending;
      }
      const work = (async () => {
        const { insight, source } = await writer(input, lang);
        const ruleLevel = input.rules.level;
        const level = maxLevel(ruleLevel, insight.suggestedLevel);
        const response: InsightResponse = {
          petId: pet.id,
          source,
          ruleLevel: trafficLightFor(ruleLevel),
          level: trafficLightFor(level),
          raisedByAi: trafficLightFor(level) !== trafficLightFor(ruleLevel),
          summary: insight.summary,
          comparison: insight.comparison,
          reasons: insight.reasons,
          watchFor: insight.watchFor,
          callVetIf: insight.callVetIf,
          trendNote: insight.trendNote,
          vetSummary: insight.vetSummary,
        };

        // Only the AI's answer is kept. The sample is cheap to rebuild, and when it stood in for a
        // failed AI call, keeping it would hide the real analysis until the pet's data changes.
        if (source === "claude") {
          if (cache.size >= MAX_CACHED) {
            cache.delete(cache.keys().next().value as string);
          }
          cache.set(key, response);
        }
        return response;
      })();
      inFlight.set(key, work);
      try {
        return await work;
      } finally {
        inFlight.delete(key);
      }
    },
  );
};
