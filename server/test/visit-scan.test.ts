import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { addDays } from "../src/modules/care/time.js";
import { todayInFinland } from "../src/modules/passport/service.js";
import {
  createClaudeReader,
  readerFromConfig,
  sampleReader,
  ScanError,
  type VisitNotesReader,
} from "../src/modules/visit-scan/readers.js";
import type { VisitScanResult } from "../src/modules/visit-scan/schema.js";
import { createTestApp, createTestUser, type TestApp } from "./helpers.js";

const photo = () =>
  sharp({ create: { width: 1200, height: 1600, channels: 3, background: "#ffffff" } }).jpeg().toBuffer();

const multipartBody = (file: Buffer, field = "file") => {
  const boundary = "----tassuvahti-scan";
  const payload = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${field}"; filename="notes.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
    file,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return { payload, contentType: `multipart/form-data; boundary=${boundary}` };
};

const result = (overrides: Partial<VisitScanResult> = {}): VisitScanResult => ({
  isVetDocument: true,
  visitDate: null,
  clinicName: "Pet Clinic Aurora",
  vetName: "Dr. Laine",
  diagnosis: "Ear infection",
  findings: "The left ear canal is inflamed.",
  procedures: ["Ear swab"],
  homeCare: ["Clean the ear once a day."],
  medications: [{ name: "Ear drops", dosage: "3 drops twice a day", durationDays: 7, prescription: true }],
  followUp: null,
  products: [],
  uncertain: [],
  transcript: "Otitis externa sin. Ear drops 3 gtt x 2, 7 d.",
  ...overrides,
});

describe("visit scan API", () => {
  let app: TestApp;
  let user: ReturnType<typeof createTestUser>;
  let petId: string;

  const setUp = async (reader?: VisitNotesReader) => {
    app = await createTestApp({}, reader ? { visitNotesReader: reader } : {});
    user = createTestUser(app);
    petId = (await app.inject({ method: "POST", url: "/pets", headers: user.headers, payload: { name: "Mirri", species: "cat" } })).json().id;
  };
  const scanPhoto = async (lang = "fi") => {
    const { payload, contentType } = multipartBody(await photo());
    return app.inject({
      method: "POST",
      url: `/pets/${petId}/visits/scan?lang=${lang}`,
      headers: { ...user.headers, "content-type": contentType },
      payload,
    });
  };
  const scanText = (text: string, lang = "en") =>
    app.inject({ method: "POST", url: `/pets/${petId}/visits/scan?lang=${lang}`, headers: user.headers, payload: { text } });

  afterEach(async () => {
    await app.close();
  });

  describe("in demo mode (no API key)", () => {
    beforeEach(() => setUp());

    it("turns a photo into a draft visit and care plan in the owner's language", async () => {
      const response = await scanPhoto("fi");
      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.source).toBe("sample");
      expect(body.visit).toMatchObject({ title: "Virtsatieinfektio", clinicName: "Pet Clinic Aurora", draft: true });
      expect(body.carePlan).toMatchObject({ diagnosis: "Virtsatieinfektio", checkedByClinic: false, vetName: "ELL Laine" });
      expect(body.carePlan.findings).toContain("Mirri");
      // The medicine and the undated follow-up become instructions; the prescription is listed.
      expect(body.carePlan.homeCare).toContain("Antibiootti: 1 tabletti 2 kertaa päivässä ruoan kanssa, 10 d");
      expect(body.carePlan.homeCare).toContain("Jälkitarkastus: Kontrollikäynti ja virtsanäyte");
      expect(body.carePlan.followUp).toBeNull();
      expect(body.carePlan.products).toContainEqual(
        expect.objectContaining({ name: "Antibiootti", prescription: { issuedTo: "Pet Clinic Aurora", pickedUpOn: null } }),
      );
      expect(body.uncertain).toHaveLength(1);
      expect(body.procedures).toEqual(["Yleistutkimus", "Virtsanäyte"]);
    });

    it("saves it like any visit: in the passport, as the latest care plan, with its watch list", async () => {
      await scanText("Dx: cystitis. Antibiotic 10 days, re-check in 10 days.");
      const get = (url: string) => app.inject({ method: "GET", url, headers: user.headers }).then((r) => r.json());
      expect((await get(`/pets/${petId}/passport`)).visits).toHaveLength(1);
      expect((await get(`/pets/${petId}/care-plan`)).carePlan.diagnosis).toBe("Urinary tract infection");
      expect((await get(`/pets/${petId}/watch-lists`)).active.map((w: { templateId: string }) => w.templateId)).toContain(
        "urinary-tract",
      );
    });

    it("rejects files that are not photos or PDFs, too-short text, and other households", async () => {
      const { payload, contentType } = multipartBody(Buffer.from("not an image at all"));
      const bad = await app.inject({
        method: "POST",
        url: `/pets/${petId}/visits/scan`,
        headers: { ...user.headers, "content-type": contentType },
        payload,
      });
      expect(bad.json().error.code).toBe("INVALID_DOCUMENT");
      expect((await scanText("short")).json().error.code).toBe("INVALID_TEXT");

      const stranger = createTestUser(app, "Stranger");
      const other = await app.inject({
        method: "POST",
        url: `/pets/${petId}/visits/scan`,
        headers: stranger.headers,
        payload: { text: "Some vet notes here" },
      });
      expect(other.json().error.code).toBe("PET_NOT_FOUND");
      expect((await app.inject({ method: "POST", url: `/pets/${petId}/visits/scan`, payload: { text: "x".repeat(20) } })).statusCode).toBe(401);
    });
  });

  describe("with the AI's reading", () => {
    it("makes a dated follow-up a reminder and keeps the visit date", async () => {
      const visitDate = addDays(todayInFinland(), -2);
      const followUpDate = addDays(todayInFinland(), 8);
      await setUp(async () => ({
        source: "claude",
        result: result({ visitDate, followUp: { title: "Ear re-check", date: followUpDate, time: "14:30" } }),
      }));
      const body = (await scanText("Otitis externa sin. Ear drops 3 gtt x 2, 7 d.")).json();
      expect(body).toMatchObject({ source: "claude", visit: { date: visitDate } });
      expect(body.carePlan.followUp).toEqual({ title: "Ear re-check", dateTime: `${followUpDate}T14:30:00`, clinicName: "Pet Clinic Aurora" });
      const { reminders } = (await app.inject({ method: "GET", url: `/pets/${petId}/reminders`, headers: user.headers })).json();
      expect(reminders.map((r: { title: string }) => r.title)).toContain("Ear re-check");
    });

    it("does not trust a visit date in the future", async () => {
      await setUp(async () => ({ source: "claude", result: result({ visitDate: addDays(todayInFinland(), 30) }) }));
      expect((await scanText("Some vet notes here")).json().visit.date).toBe(todayInFinland());
    });

    it("saves nothing when the document is not from a vet", async () => {
      await setUp(async () => ({ source: "claude", result: result({ isVetDocument: false }) }));
      expect((await scanText("A shopping list, not vet notes")).json().error.code).toBe("NOT_A_VET_DOCUMENT");
      const passport = (await app.inject({ method: "GET", url: `/pets/${petId}/passport`, headers: user.headers })).json();
      expect(passport.visits).toEqual([]);
    });

    it("answers 503 when the AI is busy and 422 when it declines", async () => {
      await setUp(async () => {
        throw new ScanError("busy", "busy");
      });
      expect((await scanText("Some vet notes here")).statusCode).toBe(503);
      await app.close();
      await setUp(async () => {
        throw new ScanError("refused", "no");
      });
      const refused = await scanText("Some vet notes here");
      expect(refused.statusCode).toBe(422);
      expect(refused.json().error.code).toBe("SCAN_REFUSED");
    });
  });
});

describe("Claude reader", () => {
  const fakeClient = (parse: (...args: unknown[]) => unknown) => ({ beta: { messages: { parse } } }) as never;
  const context = { petName: "Rekku", species: "dog" as const, lang: "sv" as const };

  it("sends the photo with the instructions and returns the parsed result", async () => {
    const parse = vi.fn().mockResolvedValue({ stop_reason: "end_turn", parsed_output: result() });
    const reader = createClaudeReader(fakeClient(parse));
    const read = await reader({ kind: "image", data: Buffer.from("jpeg-bytes") }, context);

    expect(read).toEqual({ source: "claude", result: result() });
    const request = parse.mock.calls[0][0];
    expect(request).toMatchObject({ model: "claude-opus-5-5", fallbacks: "default", betas: ["server-side-fallback-2026-07-01"] });
    expect(request.system).toContain("Extract only what the document says");
    expect(request.messages[0].content[0]).toMatchObject({ type: "image", source: { type: "base64", media_type: "image/jpeg" } });
    expect(request.messages[0].content[1].text).toBe("Pet: Rekku (dog). Write the owner-facing fields in Swedish.");
    expect(request.output_config.format).toBeDefined();
  });

  it("sends a PDF as a document and pasted text inside document tags", async () => {
    const parse = vi.fn().mockResolvedValue({ stop_reason: "end_turn", parsed_output: result() });
    const reader = createClaudeReader(fakeClient(parse));
    await reader({ kind: "pdf", data: Buffer.from("%PDF-1.7") }, context);
    await reader({ kind: "text", text: "Dx: otitis" }, context);
    expect(parse.mock.calls[0][0].messages[0].content[0]).toMatchObject({ type: "document", source: { media_type: "application/pdf" } });
    expect(parse.mock.calls[1][0].messages[0].content[0]).toEqual({ type: "text", text: "<document>\nDx: otitis\n</document>" });
  });

  it("reports a refusal, an unreadable answer and service errors", async () => {
    const reasonFor = async (parse: (...args: unknown[]) => unknown) =>
      createClaudeReader(fakeClient(parse))({ kind: "text", text: "notes" }, context).catch((e: ScanError) => e.reason);
    expect(await reasonFor(async () => ({ stop_reason: "refusal", parsed_output: null }))).toBe("refused");
    expect(await reasonFor(async () => ({ stop_reason: "end_turn", parsed_output: null }))).toBe("unreadable");
    expect(
      await reasonFor(async () => {
        throw new Anthropic.RateLimitError(429, undefined, "slow down", new Headers());
      }),
    ).toBe("busy");
    expect(
      await reasonFor(async () => {
        throw new Anthropic.InternalServerError(500, undefined, "boom", new Headers());
      }),
    ).toBe("unavailable");
  });

  it("uses the sample without a key, and Claude with one", () => {
    expect(readerFromConfig({ VISIT_SCAN_MODE: "auto" })).toBe(sampleReader);
    expect(readerFromConfig({ VISIT_SCAN_MODE: "auto", ANTHROPIC_API_KEY: "  " })).toBe(sampleReader);
    expect(readerFromConfig({ VISIT_SCAN_MODE: "mock", ANTHROPIC_API_KEY: "sk-ant-test" })).toBe(sampleReader);
    expect(readerFromConfig({ VISIT_SCAN_MODE: "auto", ANTHROPIC_API_KEY: "sk-ant-test" })).not.toBe(sampleReader);
  });
});
