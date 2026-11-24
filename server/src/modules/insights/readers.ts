import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";

import type { SeverityLevel } from "../symptoms/content.js";
import type { Language } from "../symptoms/service.js";
import { type InsightInput, levelTitle } from "./gather.js";
import { languageNames, SYSTEM_PROMPT } from "./prompt.js";
import { type Insight, insightSchema } from "./schema.js";

/** Writes the explanation of a pet's recent days. "source" says whether Claude or the sample wrote it. */
export type InsightWriter = (
  input: InsightInput,
  lang: Language,
) => Promise<{ insight: Insight; source: "claude" | "sample" }>;

// ---- Demo mode: built from the same data with fixed sentences ----

const sampleTexts = {
  fi: {
    noLogs: (pet: string) => `Lemmikin ${pet} vointia ei ole kirjattu viime päivinä. Kirjaa vointi, niin arvio tarkentuu.`,
    logs: (pet: string, days: number) => `Lemmikin ${pet} vointi on kirjattu ${days} kertaa kahden viikon aikana.`,
    plan: (diagnosis: string) => `Viimeisin hoitosuunnitelma: ${diagnosis.toLowerCase()}.`,
    medication: (name: string, end: string | null) => (end ? `${name}, kuuri ${end} asti` : `${name} käytössä`),
    watching: (condition: string) => `Seurannassa: ${condition.toLowerCase()}`,
    watchFor: ["Juominen ja ruokahalu", "Virkeys ja käytös"],
    callVetIf: ["Oireet pahenevat tai tulee uusia oireita", "Lemmikki ei syö tai juo vuorokauteen"],
    vetLogs: (days: number, worst: string) => `${days} kirjausta 14 päivässä, korkein taso: ${worst}.`,
  },
  sv: {
    noLogs: (pet: string) => `Inga dagsloggar för ${pet} de senaste dagarna. Logga måendet så blir bedömningen säkrare.`,
    logs: (pet: string, days: number) => `Måendet för ${pet} har loggats ${days} gånger de senaste två veckorna.`,
    plan: (diagnosis: string) => `Senaste vårdplan: ${diagnosis.toLowerCase()}.`,
    medication: (name: string, end: string | null) => (end ? `${name}, kur till ${end}` : `${name} används`),
    watching: (condition: string) => `Följs upp: ${condition.toLowerCase()}`,
    watchFor: ["Drickande och aptit", "Pigghet och beteende"],
    callVetIf: ["Symtomen blir värre eller nya symtom kommer", "Djuret äter eller dricker inte på ett dygn"],
    vetLogs: (days: number, worst: string) => `${days} loggar på 14 dagar, högsta nivå: ${worst}.`,
  },
  en: {
    noLogs: (pet: string) => `No daily logs for ${pet} in the last few days. Log how they are doing for a better picture.`,
    logs: (pet: string, days: number) => `${pet} has been logged ${days} times in the last two weeks.`,
    plan: (diagnosis: string) => `Latest care plan: ${diagnosis.toLowerCase()}.`,
    medication: (name: string, end: string | null) => (end ? `${name}, course until ${end}` : `${name} in use`),
    watching: (condition: string) => `Being watched: ${condition.toLowerCase()}`,
    watchFor: ["Drinking and appetite", "Energy and behaviour"],
    callVetIf: ["Symptoms get worse or new ones appear", "Your pet does not eat or drink for a day"],
    vetLogs: (days: number, worst: string) => `${days} logs in 14 days, highest level: ${worst}.`,
  },
};

const levelRank: Record<SeverityLevel, number> = { normal: 0, monitor: 1, contactVet: 2, emergency: 3 };

export const sampleWriter: InsightWriter = async (input, lang) => {
  const texts = sampleTexts[lang];
  const { pet, vet, behaviour, rules } = input;
  const worst = behaviour.reduce<SeverityLevel>(
    (level, log) => (levelRank[log.level] > levelRank[level] ? log.level : level),
    "normal",
  );

  const vetReasons = [
    ...vet.watchLists.map((w) => texts.watching(w.condition)),
    ...(vet.carePlan ? [texts.plan(vet.carePlan.diagnosis)] : []),
    ...vet.medications.map((m) => texts.medication(m.name, m.endDate)),
  ];

  const watching = vet.watchLists.length > 0 || vet.carePlan !== null;
  return {
    source: "sample",
    insight: {
      summary: [
        behaviour.length ? texts.logs(pet.name, behaviour.length) : texts.noLogs(pet.name),
        ...rules.reasons.slice(0, 1),
      ].join(" "),
      comparison: watching
        ? rules.level === "normal"
          ? "asExpected"
          : rules.level === "monitor"
            ? "slower"
            : "worse"
        : null,
      reasons: [
        ...vetReasons.map((text) => ({ source: "vet" as const, text })),
        ...rules.reasons.map((text) => ({ source: "behaviour" as const, text })),
      ],
      watchFor: texts.watchFor,
      callVetIf: texts.callVetIf,
      trendNote: null,
      // The sample never raises the level; only the AI may.
      suggestedLevel: "normal",
      vetSummary: [texts.vetLogs(behaviour.length, levelTitle(worst, lang)), ...vetReasons],
    },
  };
};

// ---- Claude ----

export const INSIGHTS_MODEL = "claude-opus-5-5";

/** Claude gave no usable answer; in auto mode the sample answers instead. */
export class InsightError extends Error {}

/**
 * Writes the insight with Claude. The answer is constrained to insightSchema. If Claude declines
 * a request, the server-side fallback retries on another model before giving up.
 */
export const createClaudeWriter =
  (client: Pick<Anthropic, "beta">, model = INSIGHTS_MODEL): InsightWriter =>
  async (input, lang) => {
    let response;
    try {
      response = await client.beta.messages.parse({
        model,
        max_tokens: 4000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `<pet_data>\n${JSON.stringify(input, null, 1)}\n</pet_data>\nWrite every text field in ${languageNames[lang]}.`,
          },
        ],
        output_config: { format: betaZodOutputFormat(insightSchema) },
      });
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        throw new InsightError(`The AI service failed: ${error.message}`);
      }
      throw error;
    }
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      throw new InsightError("The AI gave no usable answer");
    }
    return { source: "claude", insight: response.parsed_output };
  };

/**
 * Picks the writer from the configuration, like the visit scan: Claude when a key is set,
 * otherwise the sample. In auto mode a Claude failure falls back to the sample.
 */
export const writerFromConfig = (config: {
  ANTHROPIC_API_KEY?: string;
  INSIGHTS_MODE: "auto" | "claude" | "mock";
}): InsightWriter => {
  const key = config.ANTHROPIC_API_KEY?.trim();
  if (config.INSIGHTS_MODE === "mock" || (config.INSIGHTS_MODE === "auto" && !key)) {
    return sampleWriter;
  }
  const claude = createClaudeWriter(new Anthropic({ apiKey: key, timeout: 60_000, maxRetries: 1 }));
  if (config.INSIGHTS_MODE === "claude") {
    return claude;
  }
  return async (input, lang) => {
    try {
      return await claude(input, lang);
    } catch (error) {
      if (error instanceof InsightError) return sampleWriter(input, lang);
      throw error;
    }
  };
};
