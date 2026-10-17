import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { emergencyContent } from "../src/modules/emergency/content.js";
import { quickAssess } from "../src/modules/emergency/service.js";
import { todayInFinland } from "../src/modules/passport/service.js";
import { createTestApp, createTestUser, type TestApp } from "./helpers.js";

const safeAnswers = Object.fromEntries(
  emergencyContent.quickAssessment.questions.map((q) => [q.id, !q.dangerAnswer]),
) as Record<string, boolean>;

describe("quick assessment rules", () => {
  it("says to monitor and log when there are no emergency signs", () => {
    expect(quickAssess("dog", safeAnswers)).toMatchObject({ level: "monitor", triggered: [], unanswered: [] });
  });

  it("says to call now when the pet is not breathing", () => {
    const result = quickAssess("cat", { ...safeAnswers, breathing: false });
    expect(result.level).toBe("callNow");
    expect(result.triggered.map((q) => q.topicId)).toEqual(["cpr"]);
  });

  it("uses the more serious instruction for each species", () => {
    // A swollen, hard belly with retching can be a twisted stomach in dogs.
    expect(quickAssess("dog", { swollenAbdomen: true }).level).toBe("callNow");
    expect(quickAssess("cat", { swollenAbdomen: true }).level).toBe("goNow");
    expect(quickAssess("cat", { ateDangerous: true, conscious: false }).level).toBe("callNow");
  });

  it("asks species-specific questions only of that species", () => {
    expect(quickAssess("dog", { noUrine: true }).level).toBe("monitor");
    expect(quickAssess("cat", { noUrine: true }).level).toBe("callNow");
  });

  it("lists unanswered questions", () => {
    expect(quickAssess("dog", { breathing: true }).unanswered.map((q) => q.id)).not.toContain("breathing");
  });
});

describe("emergency API", () => {
  let app: TestApp;

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("without signing in", () => {
    it("serves first aid guides in the app's shape, sample content until reviewed", async () => {
      const response = await app.inject({ method: "GET", url: "/emergency/first-aid" });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.content.status).toBe("sample");
      expect(body.topics.map((t: { id: string }) => t.id)).toEqual([
        "cpr",
        "choking",
        "bleeding",
        "heatstroke",
        "seizure",
        "poisoning",
        "snakebite",
        "carAccident",
      ]);
      const cpr = body.topics[0];
      expect(cpr).toMatchObject({ icon: "heartPulse", rhythmBpm: 110, reviewed: false, title: { fi: "Elvytys" } });
      expect(cpr.steps.some((s: { bySize?: object }) => s.bySize && "largeDog" in s.bySize)).toBe(true);
      expect(body.disclaimer.en).toMatch(/does not replace/);
    });

    it("lets clients cache the guides", async () => {
      const first = await app.inject({ method: "GET", url: "/emergency/first-aid/cpr" });
      expect(first.headers["cache-control"]).toContain("max-age");
      const etag = first.headers.etag as string;
      const again = await app.inject({ method: "GET", url: "/emergency/first-aid/cpr", headers: { "if-none-match": etag } });
      expect(again.statusCode).toBe(304);
      expect(again.body).toBe("");
      expect((await app.inject({ method: "GET", url: "/emergency/first-aid/nope" })).json().error.code).toBe("TOPIC_NOT_FOUND");
    });

    it("serves the emergency signs without server-side fields", async () => {
      const { signs } = (await app.inject({ method: "GET", url: "/emergency/signs" })).json();
      expect(signs).toHaveLength(10);
      expect(signs[0]).toEqual({
        id: "notBreathing",
        label: { en: "Not breathing or no heartbeat", fi: "Ei hengitä tai syke puuttuu", sv: "Andas inte eller ingen puls" },
        topicId: "cpr",
      });
    });

    it("asks the yes/no questions for a species in the chosen language", async () => {
      const dog = (await app.inject({ method: "GET", url: "/emergency/questions?species=dog&lang=en" })).json();
      expect(dog.questions[0]).toEqual({ id: "breathing", text: "Is your pet breathing?", dangerAnswer: false, topicId: "cpr" });
      expect(dog.questions.map((q: { id: string }) => q.id)).not.toContain("noUrine");
    });

    it("turns the answers into one instruction and the guides to open", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/emergency/assess?lang=en",
        payload: { species: "dog", answers: { breathing: true, heavyBleeding: true, ateDangerous: true } },
      });
      expect(response.json()).toMatchObject({
        level: "callNow",
        title: "Call the emergency clinic now",
        callEmergencyClinic: true,
        showEmergencyClinics: true,
        logSymptoms: false,
        openKnowledgeBase: true,
        guides: [
          { id: "bleeding", title: "Heavy bleeding" },
          { id: "poisoning", title: "Suspected poisoning" },
        ],
      });

      const calm = (
        await app.inject({ method: "POST", url: "/emergency/assess?lang=fi", payload: { species: "cat", answers: { breathing: true } } })
      ).json();
      expect(calm).toMatchObject({ level: "monitor", title: "Seuraa ja kirjaa oireet", logSymptoms: true, showEmergencyClinics: false });
      expect(calm.disclaimer).toMatch(/eivätkä korvaa hoitoa/);
    });
  });

  describe("for a signed-in user's pet", () => {
    let user: ReturnType<typeof createTestUser>;
    let petId: string;
    const request = (method: "GET" | "POST", url: string, payload?: object) =>
      app.inject({ method, url, headers: user.headers, payload });

    beforeEach(async () => {
      user = createTestUser(app);
      petId = (
        await request("POST", "/pets", { name: "Mirri", species: "cat", breed: "Domestic shorthair", birthDate: "2017-04-02", weightKg: 4.6 })
      ).json().id;
    });

    it("needs a sign-in", async () => {
      expect((await app.inject({ method: "GET", url: `/pets/${petId}/emergency/summary` })).statusCode).toBe(401);
    });

    it("skips what the history already answers", async () => {
      const before = (await request("GET", `/pets/${petId}/emergency/questions`)).json();
      expect(before.questions.map((q: { id: string }) => q.id)).toContain("ateDangerous");
      expect(before.questions.map((q: { id: string }) => q.id)).toContain("noUrine");

      await request("POST", `/pets/${petId}/exposures`, { substanceId: "lilies", occurredAt: new Date(Date.now() - 2 * 3_600_000).toISOString() });
      const after = (await request("GET", `/pets/${petId}/emergency/questions?lang=en`)).json();
      expect(after.questions.map((q: { id: string }) => q.id)).not.toContain("ateDangerous");
      expect(after.known).toEqual({ ateDangerous: true });
      expect(after.knownReasons).toEqual([{ questionId: "ateDangerous", text: "Lily" }]);
    });

    it("raises the instruction with the pet's history and gives a summary for the vet", async () => {
      await request("POST", `/pets/${petId}/passport/medications`, { name: "Antibiotic", dosage: "50 mg twice a day", startDate: todayInFinland() });
      await request("POST", `/pets/${petId}/passport/allergies`, { allergen: "Chicken" });
      await request("POST", `/pets/${petId}/exposures`, { substanceId: "lilies", occurredAt: new Date(Date.now() - 2 * 3_600_000).toISOString() });

      // Repeated vomiting alone means "go now"; after eating lilies it is possible poisoning.
      const body = (await request("POST", `/pets/${petId}/emergency/assess?lang=en`, { answers: { breathing: true, continuousVomiting: true } })).json();
      expect(body.level).toBe("callNow");
      expect(body.history.level).toBe("emergency");
      expect(body.history.reasons.map((r: { code: string }) => r.code)).toContain("exposure");

      expect(body.summary).toMatchObject({
        pet: { name: "Mirri", species: "cat", weightKg: 4.6 },
        medications: [{ name: "Antibiotic", dosage: "50 mg twice a day" }],
        allergies: [{ allergen: "Chicken", severity: "unknown" }],
        exposures: [{ substance: "Lily", hoursAgo: 2 }],
      });
      expect(body.summary.text.split("\n")).toEqual([
        "Mirri: cat (Domestic shorthair)",
        expect.stringMatching(/^Age: \d+ years$/),
        "Weight: 4.6 kg",
        expect.stringMatching(/^Symptoms now: .*repeated vomiting/),
        "Medication: Antibiotic 50 mg twice a day",
        "Allergies: Chicken",
        "Has eaten: Lily, 2 h ago",
      ]);
    });

    it("gives the summary on its own, ignoring unknown symptoms", async () => {
      const summary = (await request("GET", `/pets/${petId}/emergency/summary?lang=fi&symptoms=seizures,nonsense`)).json();
      expect(summary.symptoms).toEqual([{ id: "seizures", label: "kouristelu" }]);
      expect(summary.text).toContain("Lääkitys: ei tiedossa");
    });

    it("keeps other households out", async () => {
      const stranger = createTestUser(app, "Stranger");
      const response = await app.inject({ method: "GET", url: `/pets/${petId}/emergency/summary`, headers: stranger.headers });
      expect(response.json().error.code).toBe("PET_NOT_FOUND");
    });
  });
});
