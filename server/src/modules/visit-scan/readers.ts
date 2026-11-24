import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaContentBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { z } from "zod";

import type { Species } from "../../db/schema.js";
import { languageNames, SYSTEM_PROMPT } from "./prompt.js";
import { type VisitScanResult, visitScanSchema } from "./schema.js";

export type ScanLanguage = keyof typeof languageNames;

/** The document to read: a photo (already re-encoded as JPEG), a PDF, or pasted text. */
export type ScanInput =
  | { kind: "image"; data: Buffer }
  | { kind: "pdf"; data: Buffer }
  | { kind: "text"; text: string };

export type ScanContext = { petName: string; species: Species; lang: ScanLanguage };

/** Reads a vet document into a structured result. "source" says whether Claude or the sample answered. */
export type VisitNotesReader = (
  input: ScanInput,
  context: ScanContext,
) => Promise<{ result: VisitScanResult; source: "claude" | "sample" }>;

/** Why reading failed, so the route can answer with the right status. */
export class ScanError extends Error {
  constructor(
    readonly reason: "refused" | "unreadable" | "busy" | "unavailable",
    message: string,
  ) {
    super(message);
  }
}

// ---- Demo mode: a fixed sample, in the requested language ----

const samplePath = resolve(dirname(fileURLToPath(import.meta.url)), "../../../content/visit-scan-sample.json");
const sampleFile = z
  .object({ results: z.object({ fi: visitScanSchema, sv: visitScanSchema, en: visitScanSchema }) })
  .parse(JSON.parse(readFileSync(samplePath, "utf8")));

export const sampleReader: VisitNotesReader = async (_input, { petName, lang }) => {
  const sample = sampleFile.results[lang];
  return { source: "sample", result: { ...sample, findings: sample.findings.replaceAll("{pet}", petName) } };
};

// ---- Claude ----

export const VISIT_SCAN_MODEL = "claude-opus-5-5";

const documentBlock = (input: ScanInput): BetaContentBlockParam[] => {
  if (input.kind === "image") {
    return [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: input.data.toString("base64") } }];
  }
  if (input.kind === "pdf") {
    return [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: input.data.toString("base64") } }];
  }
  return [{ type: "text", text: `<document>\n${input.text}\n</document>` }];
};

/**
 * Reads the document with Claude. The answer is constrained to visitScanSchema, so it can be
 * saved without guessing at its shape. If Claude declines a request, the server-side fallback
 * retries on another model before giving up.
 */
export const createClaudeReader =
  (client: Pick<Anthropic, "beta">, model = VISIT_SCAN_MODEL): VisitNotesReader =>
  async (input, { petName, species, lang }) => {
    let response;
    try {
      response = await client.beta.messages.parse({
        model,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              ...documentBlock(input),
              {
                type: "text",
                text: `Pet: ${petName} (${species}). Write the owner-facing fields in ${languageNames[lang]}.`,
              },
            ],
          },
        ],
        output_config: { format: betaZodOutputFormat(visitScanSchema) },
      });
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) {
        throw new ScanError("busy", "The AI service is busy; try again in a moment");
      }
      if (error instanceof Anthropic.APIError) {
        throw new ScanError("unavailable", `The AI service failed: ${error.message}`);
      }
      throw error;
    }
    if (response.stop_reason === "refusal") {
      throw new ScanError("refused", "The AI declined to read this document");
    }
    if (!response.parsed_output) {
      throw new ScanError("unreadable", "The AI's answer could not be read");
    }
    return { source: "claude", result: response.parsed_output };
  };

/**
 * Picks the reader from the configuration. In auto mode Claude reads when a key is set, and a
 * Claude failure falls back to the sample so a demo keeps going; the response says which answered.
 */
export const readerFromConfig = (config: { ANTHROPIC_API_KEY?: string; VISIT_SCAN_MODE: "auto" | "claude" | "mock" }) => {
  const key = config.ANTHROPIC_API_KEY?.trim();
  if (config.VISIT_SCAN_MODE === "mock" || (config.VISIT_SCAN_MODE === "auto" && !key)) {
    return sampleReader;
  }
  // Reading a photo takes a while; one retry keeps the owner from waiting minutes.
  const claude = createClaudeReader(new Anthropic({ apiKey: key, timeout: 90_000, maxRetries: 1 }));
  if (config.VISIT_SCAN_MODE === "claude") {
    return claude;
  }
  const auto: VisitNotesReader = async (input, context) => {
    try {
      return await claude(input, context);
    } catch (error) {
      if (error instanceof ScanError && (error.reason === "busy" || error.reason === "unavailable")) {
        return sampleReader(input, context);
      }
      throw error;
    }
  };
  return auto;
};
