import { readdirSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { todayInFinland } from "../src/modules/passport/service.js";
import { createTestApp, createTestUser, type TestApp } from "./helpers.js";

const DAY_MS = 86_400_000;
const today = () => todayInFinland();
const daysAgo = (days: number) => new Date(Date.parse(`${today()}T00:00:00Z`) - days * DAY_MS).toISOString().slice(0, 10);

const usual = { appetite: 1, energy: 1, drinking: 1, toilet: 1, pain: 0, vomiting: 0 };

const multipartBody = (file: Buffer, fileField = "file", filename = "log.jpg") => {
  const boundary = "----tassuvahti-test";
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${fileField}"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`,
    ),
    file,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return { payload, contentType: `multipart/form-data; boundary=${boundary}` };
};

/** The first bytes of an MP4 file are enough for the server to recognise it. */
const fakeMp4 = () => Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypisom"), Buffer.alloc(2000, 7)]);

describe("symptom tracking API", () => {
  let app: TestApp;
  let user: ReturnType<typeof createTestUser>;
  let petId: string;

  const request = (method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", url: string, payload?: object) =>
    app.inject({ method, url, headers: user.headers, payload });

  const saveLog = (date: string, body: object, query = "lang=en") => request("PUT", `/pets/${petId}/logs/${date}?${query}`, body);

  const attachmentFiles = () => {
    try {
      return readdirSync(join(app.config.UPLOAD_DIR, "log-attachments"));
    } catch {
      return [];
    }
  };

  beforeEach(async () => {
    app = await createTestApp();
    user = createTestUser(app);
    const created = await request("POST", "/pets", { name: "Mirri", species: "cat", birthDate: "2019-04-02", weightKg: 4.6 });
    petId = created.json().id;
  });

  afterEach(async () => {
    await app.close();
  });

  describe("public content", () => {
    it("serves the emergency list without signing in, by species", async () => {
      const cat = (await app.inject({ method: "GET", url: "/symptoms/emergency-list?species=cat&lang=en" })).json();
      expect(cat.content.status).toBe("sample");
      const ids = cat.emergencyList.map((e: { symptom: string }) => e.symptom);
      expect(ids).toContain("noUrine");
      expect(ids).not.toContain("swollenAbdomen");
      expect(cat.emergencyList[0].label).toBe("breathing difficulty");
    });

    it("lists the watch list templates", async () => {
      const body = (await app.inject({ method: "GET", url: "/symptoms/watch-list-templates?species=smallAnimal&lang=fi" })).json();
      const ids = body.templates.map((t: { id: string }) => t.id);
      expect(ids).toContain("digestion");
      expect(ids).not.toContain("urinary-tract");
    });
  });

  describe("daily log", () => {
    it("asks the general questions when there is no watch list", async () => {
      const body = (await request("GET", `/pets/${petId}/log-questions?lang=en`)).json();
      expect(body.questions.map((q: { id: string }) => q.id)).toEqual(["appetite", "energy", "drinking", "toilet", "pain", "vomiting"]);
      expect(body.questions[0]).toMatchObject({ label: "Appetite", options: ["Low", "Usual", "High"], source: "general" });
      expect(body.watchLists).toEqual([]);
    });

    it("saves the day's log and returns the assessment with its reasons", async () => {
      const response = await saveLog(today(), { answers: { ...usual, appetite: 0 }, note: "Left half of breakfast" });
      expect(response.statusCode).toBe(200);
      const { log } = response.json();
      expect(log).toMatchObject({ date: today(), note: "Left half of breakfast", attachments: [], outcome: null });
      expect(log.assessment).toMatchObject({ level: "monitor", trafficLight: "yellow", showEmergencyClinics: false });
      expect(log.assessment.reasons[0].text).toBe("Appetite: Low.");
      expect(log.assessment.symptoms).toEqual([{ id: "appetiteLoss", label: "poor appetite" }]);
      expect(log.assessment.disclaimer).toMatch(/does not replace a vet/);
    });

    it("replaces an earlier log from the same day", async () => {
      await saveLog(today(), { answers: { ...usual, appetite: 0 } });
      const second = (await saveLog(today(), { answers: usual })).json();
      expect(second.log.assessment.level).toBe("normal");
      const list = (await request("GET", `/pets/${petId}/logs`)).json();
      expect(list.logs).toHaveLength(1);
    });

    it("turns red and shows emergency clinics for an emergency symptom", async () => {
      const { log } = (await saveLog(today(), { emergencySymptoms: ["breathingDifficulty"] })).json();
      expect(log.assessment).toMatchObject({ level: "emergency", trafficLight: "red", showEmergencyClinics: true });
      expect(log.assessment.reasons[0].text).toBe("Breathing difficulty always needs urgent care, whatever the history.");
    });

    it("rejects logs that can't be right", async () => {
      expect((await saveLog(daysAgo(-2), { answers: usual })).json().error.code).toBe("LOG_DATE_IN_FUTURE");
      expect((await saveLog(today(), { answers: { "uti-straining": 1 } })).json().error.code).toBe("UNKNOWN_QUESTION");
      expect((await saveLog(today(), {})).json().error.code).toBe("EMPTY_LOG");
      expect((await saveLog(today(), { emergencySymptoms: ["swollenAbdomen"] })).json().error.code).toBe("UNKNOWN_SYMPTOM");
      expect((await saveLog(today(), { answers: { appetite: 3 } })).statusCode).toBe(400);
    });

    it("uses the pet's history: three tired days in a row mean contacting a vet", async () => {
      await saveLog(daysAgo(2), { answers: { ...usual, energy: 0 } });
      await saveLog(daysAgo(1), { answers: { ...usual, energy: 0 } });
      const { log } = (await saveLog(today(), { answers: { ...usual, energy: 0 } })).json();
      expect(log.assessment.level).toBe("contactVet");
      expect(log.assessment.reasons.map((r: { code: string }) => r.code)).toContain("persistent");
    });

    it("uses the passport: the same symptom is more serious for a cat with kidney disease", async () => {
      await request("POST", `/pets/${petId}/passport/visits`, {
        visitedOn: daysAgo(60),
        reason: "Check-up",
        diagnosis: "Chronic kidney disease",
      });
      const { log } = (await saveLog(today(), { answers: { ...usual, appetite: 0 } })).json();
      expect(log.assessment.level).toBe("contactVet");
      expect(log.assessment.reasons[0].text).toBe(
        "The assessment is higher because Mirri has been diagnosed with kidney disease and has poor appetite.",
      );
    });

    it("uses something dangerous eaten recently from the knowledge base", async () => {
      await request("POST", `/pets/${petId}/exposures`, { substanceId: "lilies", occurredAt: new Date(Date.now() - 3_600_000).toISOString() });
      const { log } = (await saveLog(today(), { answers: { ...usual, vomiting: 1 } })).json();
      expect(log.assessment.level).toBe("emergency");
      expect(log.assessment.reasons[0].code).toBe("exposure");
    });

    it("mentions seasonal alerts that match the logged symptoms", async () => {
      const body = (await saveLog("2025-07-15", { answers: usual, symptoms: ["heavyPanting"] })).json();
      expect(body.seasonalAlerts.map((a: { id: string }) => a.id)).toContain("summer-heat-cars");
      expect(body.seasonalAlerts[0].matchedSymptoms).toEqual(["heavyPanting"]);
    });

    it("lists, reads and deletes logs", async () => {
      await saveLog(daysAgo(3), { answers: usual });
      await saveLog(daysAgo(1), { answers: { ...usual, pain: 2 } });
      const list = (await request("GET", `/pets/${petId}/logs?from=${daysAgo(2)}`)).json();
      expect(list.logs.map((l: { date: string }) => l.date)).toEqual([daysAgo(1)]);

      const one = (await request("GET", `/pets/${petId}/logs/${daysAgo(1)}?lang=fi`)).json();
      expect(one.assessment.title).toBe("Ota yhteyttä eläinlääkäriin");

      expect((await request("DELETE", `/pets/${petId}/logs/${daysAgo(1)}`)).statusCode).toBe(204);
      expect((await request("GET", `/pets/${petId}/logs/${daysAgo(1)}`)).json().error.code).toBe("LOG_NOT_FOUND");
    });

    it("records what the vet found, to compare with the assessment", async () => {
      await saveLog(today(), { answers: { ...usual, vomiting: 2 } });
      const visit = (
        await request("POST", `/pets/${petId}/passport/visits`, { visitedOn: today(), reason: "Vomiting", diagnosis: "Gastritis" })
      ).json();
      const response = await request("PUT", `/pets/${petId}/logs/${today()}/outcome`, {
        level: "contactVet",
        recordId: visit.id,
        note: "Gastritis, treated at home",
      });
      expect(response.json().outcome).toMatchObject({ level: "contactVet", recordId: visit.id, matched: true });
    });

    it("assesses without saving, for emergency mode", async () => {
      const body = (await request("POST", `/pets/${petId}/assess?lang=en`, { answers: { vomiting: 2 } })).json();
      expect(body).toMatchObject({ level: "contactVet", trafficLight: "red" });
      expect((await request("GET", `/pets/${petId}/logs`)).json().logs).toEqual([]);
    });

    it("keeps other households out", async () => {
      const stranger = createTestUser(app, "Stranger");
      const response = await app.inject({ method: "PUT", url: `/pets/${petId}/logs/${today()}`, headers: stranger.headers, payload: { answers: usual } });
      expect(response.json().error.code).toBe("PET_NOT_FOUND");
      expect((await app.inject({ method: "GET", url: `/pets/${petId}/health-status` })).statusCode).toBe(401);
    });
  });

  describe("health status and trends", () => {
    it("is green without logs and follows the latest recent log", async () => {
      const empty = (await request("GET", `/pets/${petId}/health-status?lang=en`)).json();
      expect(empty).toMatchObject({ level: "normal", trafficLight: "green", stale: true, loggedToday: false, latestLog: null });

      await saveLog(daysAgo(1), { answers: { ...usual, drinking: 2 } });
      const yellow = (await request("GET", `/pets/${petId}/health-status`)).json();
      expect(yellow).toMatchObject({ level: "monitor", trafficLight: "yellow", stale: false, loggedToday: false });
    });

    it("does not let an old log decide today's status", async () => {
      await saveLog(daysAgo(5), { answers: { ...usual, pain: 2 } });
      const body = (await request("GET", `/pets/${petId}/health-status`)).json();
      expect(body).toMatchObject({ level: "normal", stale: true });
      expect(body.latestLog.assessment.level).toBe("contactVet");
    });

    it("gives weekly trends with weights", async () => {
      await saveLog(today(), { answers: { ...usual, drinking: 2 } });
      await saveLog(daysAgo(14), { answers: usual });
      await request("POST", `/pets/${petId}/weights`, { weightKg: 4.8, weighedOn: today() });

      const body = (await request("GET", `/pets/${petId}/trends?weeks=4&lang=en`)).json();
      expect(body.weeks).toHaveLength(4);
      const thisWeek = body.weeks.at(-1);
      expect(thisWeek).toMatchObject({ loggedDays: 1, worstLevel: "monitor", weightKg: 4.8 });
      expect(body.weeks.reduce((sum: number, w: { loggedDays: number }) => sum + w.loggedDays, 0)).toBe(2);

      const drinking = body.questions.find((q: { id: string }) => q.id === "drinking");
      expect(drinking.weeks.at(-1)).toMatchObject({ answers: [0, 0, 1], unusualDays: 1 });
    });
  });

  describe("watch lists", () => {
    it("starts a watch list when a matching diagnosis is added to the passport", async () => {
      const visit = (
        await request("POST", `/pets/${petId}/passport/visits`, { visitedOn: daysAgo(3), reason: "Peeing often", diagnosis: "Virtsatieinfektio" })
      ).json();

      const lists = (await request("GET", `/pets/${petId}/watch-lists?lang=en`)).json();
      expect(lists.active).toHaveLength(1);
      expect(lists.active[0]).toMatchObject({
        templateId: "urinary-tract",
        condition: "Urinary tract infection",
        recordId: visit.id,
        source: "guidance",
        startDate: daysAgo(3),
        totalDays: 10,
        currentDay: 4,
      });
      expect(lists.active[0].intro).toMatch(/^While Mirri recovers/);

      const questions = (await request("GET", `/pets/${petId}/log-questions`)).json().questions;
      expect(questions.slice(0, 3).map((q: { id: string }) => q.id)).toEqual(["uti-water", "uti-trips", "uti-straining"]);

      const { log } = (await saveLog(today(), { answers: { "uti-straining": 2 } })).json();
      expect(log.assessment.level).toBe("emergency");
      expect(log.assessment.reasons[0].code).toBe("vetThreshold");
    });

    it("starts a recovery watch list after any surgery, but not for old ones", async () => {
      await request("POST", `/pets/${petId}/passport/surgeries`, { name: "Hammaskiven poisto", performedOn: daysAgo(1) });
      await request("POST", `/pets/${petId}/passport/surgeries`, { name: "Sterilointi", performedOn: "2020-05-01" });
      const lists = (await request("GET", `/pets/${petId}/watch-lists`)).json();
      expect(lists.active.map((l: { templateId: string }) => l.templateId)).toEqual(["post-surgery"]);
    });

    it("suggests templates for diagnoses that are not watched", async () => {
      await request("POST", `/pets/${petId}/passport/visits`, { visitedOn: "2024-01-10", reason: "Itching", diagnosis: "Atopic dermatitis" });
      const lists = (await request("GET", `/pets/${petId}/watch-lists`)).json();
      expect(lists.active).toEqual([]);
      expect(lists.suggestions.map((s: { templateId: string }) => s.templateId)).toEqual(["skin-allergy"]);
    });

    it("creates one from the vet's own instructions and lets the vet's limits replace the template's", async () => {
      const custom = await request("POST", `/pets/${petId}/watch-lists?lang=en`, {
        condition: "Eye infection",
        vetName: "Dr. Laine",
        days: 5,
        questions: [{ id: "eye", label: "Eye discharge", options: ["None", "Some", "A lot"], usualAnswer: 0, yellowIf: [1], redIf: [2] }],
      });
      expect(custom.statusCode).toBe(201);
      expect(custom.json()).toMatchObject({ condition: "Eye infection", source: "vet", totalDays: 5, endDate: daysAgo(-4) });

      const fromTemplate = (await request("POST", `/pets/${petId}/watch-lists`, { templateId: "kidney" })).json();
      expect(fromTemplate).toMatchObject({ source: "guidance", endDate: null, totalDays: null });

      const changed = await request("PATCH", `/pets/${petId}/watch-lists/${fromTemplate.id}`, {
        vetName: "Dr. Laine",
        thresholds: [{ questionId: "kidney-drinking", yellowIf: [], redIf: [0, 2] }],
      });
      expect(changed.json()).toMatchObject({ source: "vet", vetName: "Dr. Laine" });
      const { log } = (await saveLog(today(), { answers: { "kidney-drinking": 2 } })).json();
      expect(log.assessment.level).toBe("contactVet");
    });

    it("ends and deletes watch lists", async () => {
      const list = (await request("POST", `/pets/${petId}/watch-lists`, { templateId: "digestion", startDate: daysAgo(2) })).json();
      const ended = (await request("PATCH", `/pets/${petId}/watch-lists/${list.id}`, { end: true })).json();
      expect(ended).toMatchObject({ endDate: today(), active: true });
      const endedEarlier = (await request("PATCH", `/pets/${petId}/watch-lists/${list.id}`, { endDate: daysAgo(1) })).json();
      expect(endedEarlier.active).toBe(false);
      expect((await request("GET", `/pets/${petId}/watch-lists`)).json().past).toHaveLength(1);

      expect((await request("DELETE", `/pets/${petId}/watch-lists/${list.id}`)).statusCode).toBe(204);
      expect((await request("GET", `/pets/${petId}/watch-lists`)).json().past).toEqual([]);
    });

    it("rejects templates for another species and incomplete custom lists", async () => {
      const rabbit = (await request("POST", "/pets", { name: "Pupu", species: "smallAnimal" })).json();
      expect((await request("POST", `/pets/${rabbit.id}/watch-lists`, { templateId: "kidney" })).json().error.code).toBe(
        "TEMPLATE_WRONG_SPECIES",
      );
      expect((await request("POST", `/pets/${petId}/watch-lists`, { condition: "Something" })).json().error.code).toBe(
        "CONDITION_REQUIRED",
      );
    });
  });

  describe("attachments", () => {
    const upload = (date: string, file: Buffer, field?: string) => {
      const { payload, contentType } = multipartBody(file, field);
      return app.inject({
        method: "POST",
        url: `/pets/${petId}/logs/${date}/attachments`,
        headers: { ...user.headers, "content-type": contentType },
        payload,
      });
    };

    it("stores a photo as WebP without its metadata", async () => {
      await saveLog(today(), { answers: usual });
      const photo = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#F2A33A" } })
        .jpeg()
        .withMetadata()
        .toBuffer();
      const response = await upload(today(), photo);
      expect(response.statusCode).toBe(201);
      const attachment = response.json();
      expect(attachment).toMatchObject({ mediaType: "image", contentType: "image/webp" });

      const file = await app.inject({ method: "GET", url: attachment.url, headers: user.headers });
      expect(file.headers["content-type"]).toBe("image/webp");
      const metadata = await sharp(file.rawPayload).metadata();
      expect(Math.max(metadata.width ?? 0, metadata.height ?? 0)).toBe(1600);
      expect(metadata.exif).toBeUndefined();

      const log = (await request("GET", `/pets/${petId}/logs/${today()}`)).json();
      expect(log.attachments).toHaveLength(1);
    });

    it("stores a video and serves byte ranges", async () => {
      await saveLog(today(), { answers: usual });
      const attachment = (await upload(today(), fakeMp4(), "file")).json();
      expect(attachment).toMatchObject({ mediaType: "video", contentType: "video/mp4", sizeBytes: 2012 });

      const part = await app.inject({ method: "GET", url: attachment.url, headers: { ...user.headers, range: "bytes=0-99" } });
      expect(part.statusCode).toBe(206);
      expect(part.headers["content-range"]).toBe("bytes 0-99/2012");
      expect(part.rawPayload).toHaveLength(100);

      const outside = await app.inject({ method: "GET", url: attachment.url, headers: { ...user.headers, range: "bytes=5000-" } });
      expect(outside.statusCode).toBe(416);
    });

    it("rejects other files, a missing log and too many attachments", async () => {
      expect((await upload(today(), fakeMp4())).json().error.code).toBe("LOG_NOT_FOUND");
      await saveLog(today(), { answers: usual });
      expect((await upload(today(), Buffer.from("not a photo"))).json().error.code).toBe("INVALID_ATTACHMENT");
      expect((await upload(today(), fakeMp4(), "photo")).json().error.code).toBe("INVALID_UPLOAD");
      for (let i = 0; i < 3; i += 1) {
        expect((await upload(today(), fakeMp4())).statusCode).toBe(201);
      }
      expect((await upload(today(), fakeMp4())).json().error.code).toBe("TOO_MANY_ATTACHMENTS");
    });

    it("deletes the files with the attachment, the log and the pet", async () => {
      await saveLog(today(), { answers: usual });
      await saveLog(daysAgo(1), { answers: usual });
      const first = (await upload(today(), fakeMp4())).json();
      await upload(today(), fakeMp4());
      await upload(daysAgo(1), fakeMp4());
      expect(attachmentFiles()).toHaveLength(3);

      await request("DELETE", `/pets/${petId}/logs/${today()}/attachments/${first.id}`);
      expect(attachmentFiles()).toHaveLength(2);
      // A new log on the same day keeps its attachments.
      await saveLog(today(), { answers: { ...usual, pain: 1 } });
      expect((await request("GET", `/pets/${petId}/logs/${today()}`)).json().attachments).toHaveLength(1);

      await request("DELETE", `/pets/${petId}/logs/${today()}`);
      expect(attachmentFiles()).toHaveLength(1);
      await request("DELETE", `/pets/${petId}`);
      expect(attachmentFiles()).toEqual([]);
    });
  });
});
