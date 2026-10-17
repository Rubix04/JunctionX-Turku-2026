import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { PushMessage } from "../src/modules/alerts/push.js";
import { runReminderJob } from "../src/modules/care/job.js";
import { addDays, helsinkiLocal, helsinkiToEpoch, normalizeLocal } from "../src/modules/care/time.js";
import { todayInFinland } from "../src/modules/passport/service.js";
import { createTestApp, createTestUser, type TestApp } from "./helpers.js";

describe("Finnish local time", () => {
  it("converts local times to moments across daylight saving time", () => {
    expect(new Date(helsinkiToEpoch("2026-07-01T08:00:00")).toISOString()).toBe("2026-07-01T05:00:00.000Z");
    expect(new Date(helsinkiToEpoch("2026-12-01T08:00:00")).toISOString()).toBe("2026-12-01T06:00:00.000Z");
    // Clocks go back on 25 October 2026 at 04:00 local time.
    expect(new Date(helsinkiToEpoch("2026-10-25T12:00:00")).toISOString()).toBe("2026-10-25T10:00:00.000Z");
    expect(helsinkiLocal(Date.parse("2026-07-01T05:00:00Z"))).toBe("2026-07-01T08:00:00");
  });

  it("accepts a date alone as 09:00", () => {
    expect(normalizeLocal("2026-11-07")).toBe("2026-11-07T09:00:00");
    expect(normalizeLocal("2026-11-07T14:30")).toBe("2026-11-07T14:30:00");
  });
});

describe("care plan and reminders API", () => {
  let app: TestApp;
  let user: ReturnType<typeof createTestUser>;
  let petId: string;
  const today = () => todayInFinland();

  const request = (method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", url: string, payload?: object) =>
    app.inject({ method, url, headers: user.headers, payload });

  const addVisit = async (visitedOn: string, extra: object = {}) =>
    (await request("POST", `/pets/${petId}/passport/visits`, { visitedOn, reason: "Peeing often", clinic: "Pet Clinic Aurora", ...extra })).json();

  const plan = {
    diagnosis: "Urinary tract infection",
    vetName: "Dr. Laine",
    findings: "Bacteria in the urine are irritating the bladder.",
    homeCare: ["Give the antibiotic morning and evening for 10 days.", "Help her drink."],
    followUp: { title: "Check-up and urine test", dateTime: `${addDays(todayInFinland(), 5)}T14:30`, clinicName: "Pet Clinic Aurora" },
    products: [
      { productId: null, name: "Urinary diet", brand: "VetFood" },
      { name: "Antibiotic", brand: "Pharma", prescription: { issuedTo: "Apteekki Aurora" } },
    ],
    originalText: "Dg: cystitis. Ab 10 d.",
  };

  beforeEach(async () => {
    app = await createTestApp();
    user = createTestUser(app, "Aino Virtanen");
    petId = (await request("POST", "/pets", { name: "Mirri", species: "cat", weightKg: 4.6 })).json().id;
  });

  afterEach(async () => {
    await app.close();
  });

  describe("visits and care plans", () => {
    it("lists passport visits with their care plan state, newest first", async () => {
      await addVisit("2026-03-02", { reason: "Annual check-up" });
      const latest = await addVisit(addDays(today(), -4), { diagnosis: "Urinary tract infection" });
      await request("PUT", `/pets/${petId}/visits/${latest.id}/care-plan`, plan);

      const { visits } = (await request("GET", `/pets/${petId}/visits`)).json();
      expect(visits.map((v: { title: string }) => v.title)).toEqual(["Urinary tract infection", "Annual check-up"]);
      expect(visits[0]).toMatchObject({ clinicName: "Pet Clinic Aurora", vetName: "Dr. Laine", draft: true });
      expect(visits[1]).toMatchObject({ vetName: null, draft: false, carePlanId: null });
    });

    it("saves a care plan in the app's shape and returns the latest one", async () => {
      expect((await request("GET", `/pets/${petId}/care-plan`)).json()).toEqual({ carePlan: null });
      const visit = await addVisit(addDays(today(), -4));
      const saved = await request("PUT", `/pets/${petId}/visits/${visit.id}/care-plan`, plan);
      expect(saved.statusCode).toBe(200);

      const { carePlan } = (await request("GET", `/pets/${petId}/care-plan`)).json();
      expect(carePlan).toMatchObject({
        visitId: visit.id,
        diagnosis: "Urinary tract infection",
        clinicName: "Pet Clinic Aurora",
        checkedByClinic: false,
        homeCare: plan.homeCare,
        followUp: { title: "Check-up and urine test", dateTime: `${addDays(today(), 5)}T14:30:00` },
        products: [
          { productId: null, name: "Urinary diet", brand: "VetFood", prescription: null },
          { productId: null, name: "Antibiotic", prescription: { issuedTo: "Apteekki Aurora", pickedUpOn: null } },
        ],
        originalText: "Dg: cystitis. Ab 10 d.",
      });
    });

    it("lets only demo mode mark a plan as checked by the clinic", async () => {
      const visit = await addVisit(today());
      const owner = (await request("PUT", `/pets/${petId}/visits/${visit.id}/care-plan`, { ...plan, checkedByClinic: true })).json();
      expect(owner.checkedByClinic).toBe(false);

      await app.close();
      app = await createTestApp({ DEMO_MODE: "true" });
      user = createTestUser(app);
      petId = (await request("POST", "/pets", { name: "Mirri", species: "cat" })).json().id;
      const demoVisit = await addVisit(today());
      const demo = (await request("PUT", `/pets/${petId}/visits/${demoVisit.id}/care-plan`, { ...plan, checkedByClinic: true })).json();
      expect(demo.checkedByClinic).toBe(true);
    });

    it("turns the follow-up visit into a reminder that follows the plan", async () => {
      const visit = await addVisit(today());
      await request("PUT", `/pets/${petId}/visits/${visit.id}/care-plan`, plan);
      const visitReminder = async () =>
        (await request("GET", `/pets/${petId}/reminders`)).json().reminders.find((r: { kind: string }) => r.kind === "visit");

      const first = await visitReminder();
      expect(first).toMatchObject({ title: "Check-up and urine test", detail: "Pet Clinic Aurora", source: "followUp", editable: false });
      await request("PATCH", `/reminders/${first.id}`, { done: true });

      // Moving the appointment makes it a new thing to remember.
      const moved = { ...plan, followUp: { ...plan.followUp, dateTime: `${addDays(today(), 6)}T10:00` } };
      await request("PUT", `/pets/${petId}/visits/${visit.id}/care-plan`, moved);
      expect(await visitReminder()).toMatchObject({ id: first.id, dueAt: `${addDays(today(), 6)}T10:00:00`, done: false });

      await request("PUT", `/pets/${petId}/visits/${visit.id}/care-plan`, { ...plan, followUp: null });
      expect(await visitReminder()).toBeUndefined();
    });

    it("adds a visit from uploaded notes as a draft", async () => {
      const response = await request("POST", `/pets/${petId}/visits/drafts`, {
        title: "Urinary tract infection",
        clinicName: "Pet Clinic Aurora",
        notes: "Dg: cystitis",
      });
      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({ date: today(), title: "Urinary tract infection", draft: true });

      const passport = (await request("GET", `/pets/${petId}/passport`)).json();
      expect(passport.visits[0]).toMatchObject({ reason: "Urinary tract infection", clinic: "Pet Clinic Aurora" });
      const { carePlan } = (await request("GET", `/pets/${petId}/care-plan`)).json();
      expect(carePlan).toMatchObject({ checkedByClinic: false, originalText: "Dg: cystitis" });
      // The diagnosis also starts its watch list (spec 1).
      expect((await request("GET", `/pets/${petId}/watch-lists`)).json().active[0].templateId).toBe("urinary-tract");
    });

    it("removes the care plan and its reminder with the visit", async () => {
      const visit = await addVisit(today());
      await request("PUT", `/pets/${petId}/visits/${visit.id}/care-plan`, plan);
      await request("DELETE", `/pets/${petId}/passport/visits/${visit.id}`);
      expect((await request("GET", `/pets/${petId}/care-plan`)).json().carePlan).toBeNull();
      expect((await request("GET", `/pets/${petId}/reminders`)).json().reminders).toEqual([]);
    });

    it("rejects unknown visits and bad times", async () => {
      expect((await request("PUT", `/pets/${petId}/visits/nope/care-plan`, plan)).json().error.code).toBe("VISIT_NOT_FOUND");
      const visit = await addVisit(today());
      const bad = await request("PUT", `/pets/${petId}/visits/${visit.id}/care-plan`, {
        ...plan,
        followUp: { ...plan.followUp, dateTime: "next week" },
      });
      expect(bad.statusCode).toBe(400);
    });
  });

  describe("medication schedules", () => {
    const antibiotic = () => ({ name: "Antibiotic", detail: "1 tablet · with food", totalDays: 10, times: ["20:00", "08:00"] });

    it("turns a 10-day course into dose reminders and counts the doses given", async () => {
      const created = await request("POST", `/pets/${petId}/medication-schedules`, antibiotic());
      expect(created.statusCode).toBe(201);
      expect(created.json()).toMatchObject({
        name: "Antibiotic",
        times: ["08:00", "20:00"],
        startDate: today(),
        endDate: addDays(today(), 9),
        active: true,
        dosesTotal: 20,
        dosesGiven: 0,
      });

      const { reminders } = (await request("GET", `/pets/${petId}/reminders?to=${addDays(today(), 30)}`)).json();
      expect(reminders).toHaveLength(20);
      expect(reminders[0]).toMatchObject({ kind: "medication", title: "Antibiotic", detail: "1 tablet · with food", dueAt: `${today()}T08:00:00` });

      const marked = (await request("PATCH", `/reminders/${reminders[0].id}`, { done: true })).json();
      expect(marked).toMatchObject({ done: true, doneBy: "Aino Virtanen" });
      const { course } = (await request("GET", `/pets/${petId}/medication-course`)).json();
      expect(course).toMatchObject({ name: "Antibiotic", dosesTotal: 20, dosesGiven: 1, totalDays: 10 });
    });

    it("keeps who gave a dose when someone else marks it again", async () => {
      await request("POST", `/pets/${petId}/medication-schedules`, antibiotic());
      const [dose] = (await request("GET", `/pets/${petId}/reminders`)).json().reminders;
      await request("PATCH", `/reminders/${dose.id}`, { done: true });

      const partner = createTestUser(app, "Partner");
      // Same household: give the partner a token for it.
      const token = app.jwt.sign({ sub: partner.userId, hid: user.householdId, sid: partner.sessionId, bat: Date.now() });
      const again = await app.inject({
        method: "PATCH",
        url: `/reminders/${dose.id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { done: true },
      });
      expect(again.json()).toMatchObject({ done: true, doneBy: "Aino Virtanen" });
    });

    it("generates two weeks ahead for a long-term medicine without duplicating doses", async () => {
      await request("POST", `/pets/${petId}/medication-schedules`, { name: "Insulin", times: ["07:30", "19:30"] });
      const count = async () =>
        (await request("GET", `/pets/${petId}/reminders?to=${addDays(today(), 60)}`)).json().reminders.length;
      expect(await count()).toBe(30);
      expect(await count()).toBe(30);
      const { schedules } = (await request("GET", `/pets/${petId}/medication-schedules`)).json();
      expect(schedules[0]).toMatchObject({ totalDays: null, endDate: null, dosesTotal: null });
    });

    it("takes the name, dosage and dates from a passport medication", async () => {
      const medication = (
        await request("POST", `/pets/${petId}/passport/medications`, {
          name: "Antibiotic",
          dosage: "50 mg twice a day",
          startDate: today(),
          endDate: addDays(today(), 6),
        })
      ).json();
      const schedule = (
        await request("POST", `/pets/${petId}/medication-schedules`, { medicationRecordId: medication.id, times: ["08:00", "20:00"] })
      ).json();
      expect(schedule).toMatchObject({ name: "Antibiotic", detail: "50 mg twice a day", totalDays: 7, dosesTotal: 14 });

      // Removed with the passport medication.
      await request("DELETE", `/pets/${petId}/passport/medications/${medication.id}`);
      expect((await request("GET", `/pets/${petId}/medication-schedules`)).json().schedules).toEqual([]);
      expect((await request("GET", `/pets/${petId}/reminders`)).json().reminders).toEqual([]);
    });

    it("stops a medicine and changes dose times from now on", async () => {
      const schedule = (await request("POST", `/pets/${petId}/medication-schedules`, antibiotic())).json();
      const tomorrow = addDays(today(), 1);
      const dosesOn = async (date: string) =>
        (await request("GET", `/pets/${petId}/reminders?from=${date}&to=${date}`)).json().reminders.map((r: { dueAt: string }) => r.dueAt);

      await request("PATCH", `/pets/${petId}/medication-schedules/${schedule.id}`, { times: ["09:00"] });
      expect(await dosesOn(tomorrow)).toEqual([`${tomorrow}T09:00:00`]);

      const stopped = (await request("PATCH", `/pets/${petId}/medication-schedules/${schedule.id}`, { stop: true })).json();
      expect(stopped).toMatchObject({ stoppedOn: today(), endDate: today(), active: true });
      expect(await dosesOn(tomorrow)).toEqual([]);
    });

    it("rejects a schedule without a name or with bad times", async () => {
      expect((await request("POST", `/pets/${petId}/medication-schedules`, { times: ["08:00"] })).json().error.code).toBe("NAME_REQUIRED");
      expect((await request("POST", `/pets/${petId}/medication-schedules`, { name: "X", times: ["25:00"] })).statusCode).toBe(400);
    });
  });

  describe("vaccination reminders", () => {
    it("reminds to book a time a month before the latest dose runs out", async () => {
      const validUntil = addDays(today(), 60);
      const first = (
        await request("POST", `/pets/${petId}/passport/vaccinations`, { name: "Rabies", givenOn: addDays(today(), -300), validUntil })
      ).json();
      const vaccinations = async () =>
        (await request("GET", `/pets/${petId}/reminders?lang=en&to=${addDays(today(), 400)}`)).json().reminders;

      const [reminder] = await vaccinations();
      expect(reminder).toMatchObject({ kind: "vaccination", title: "Rabies", dueAt: `${addDays(validUntil, -30)}T09:00:00` });
      expect(reminder.detail).toMatch(/^Valid until .* · book a time$/);

      // A new dose replaces the old reminder; removing it brings the old one back.
      const newer = (
        await request("POST", `/pets/${petId}/passport/vaccinations`, { name: "rabies", givenOn: today(), validUntil: addDays(today(), 365) })
      ).json();
      expect((await vaccinations()).map((r: { dueAt: string }) => r.dueAt)).toEqual([`${addDays(today(), 335)}T09:00:00`]);
      await request("DELETE", `/pets/${petId}/passport/vaccinations/${newer.id}`);
      expect((await vaccinations())[0].dueAt).toBe(`${addDays(validUntil, -30)}T09:00:00`);
      expect(first.id).toBeTruthy();
    });
  });

  describe("own reminders", () => {
    it("adds, edits and deletes the owner's own reminders for the whole household", async () => {
      const rekku = (await request("POST", "/pets", { name: "Rekku", species: "dog" })).json();
      const created = await request("POST", "/reminders", {
        petId: rekku.id,
        kind: "deworming",
        title: "Deworming",
        dueAt: addDays(today(), 10),
      });
      expect(created.statusCode).toBe(201);
      expect(created.json()).toMatchObject({ detail: "", dueAt: `${addDays(today(), 10)}T09:00:00`, editable: true, done: false });

      await request("POST", "/reminders", { petId, kind: "visit", title: "Dental check", dueAt: `${addDays(today(), 2)}T10:15` });
      const all = (await request("GET", "/reminders")).json().reminders;
      expect(all.map((r: { title: string }) => r.title)).toEqual(["Dental check", "Deworming"]);
      expect((await request("GET", `/reminders?petId=${rekku.id}`)).json().reminders).toHaveLength(1);

      const edited = (await request("PATCH", `/reminders/${created.json().id}`, { title: "Deworming tablet", dueAt: addDays(today(), 11) })).json();
      expect(edited).toMatchObject({ title: "Deworming tablet", dueAt: `${addDays(today(), 11)}T09:00:00` });
      expect((await request("DELETE", `/reminders/${created.json().id}`)).statusCode).toBe(204);
    });

    it("does not let generated reminders be edited or deleted", async () => {
      await request("POST", `/pets/${petId}/medication-schedules`, { name: "Antibiotic", totalDays: 2, times: ["08:00"] });
      const [dose] = (await request("GET", `/pets/${petId}/reminders`)).json().reminders;
      expect((await request("PATCH", `/reminders/${dose.id}`, { title: "Other" })).json().error.code).toBe("REMINDER_NOT_EDITABLE");
      expect((await request("DELETE", `/reminders/${dose.id}`)).json().error.code).toBe("REMINDER_NOT_EDITABLE");
    });

    it("keeps other households out", async () => {
      const mine = (await request("POST", "/reminders", { petId, kind: "deworming", title: "Deworming", dueAt: today() })).json();
      const stranger = createTestUser(app, "Stranger");
      const as = (method: "GET" | "PATCH" | "POST", url: string, payload?: object) =>
        app.inject({ method, url, headers: stranger.headers, payload });
      expect((await as("GET", "/reminders")).json().reminders).toEqual([]);
      expect((await as("PATCH", `/reminders/${mine.id}`, { done: true })).json().error.code).toBe("REMINDER_NOT_FOUND");
      expect((await as("POST", "/reminders", { petId, kind: "deworming", title: "X", dueAt: today() })).json().error.code).toBe(
        "PET_NOT_FOUND",
      );
    });
  });

  describe("push notifications", () => {
    const registerDevice = (body: object = {}) =>
      request("PUT", "/notifications/device", { expoPushToken: "ExponentPushToken[abc]", platform: "ios", language: "fi", ...body });

    it("pushes each due reminder once to the household's devices", async () => {
      await registerDevice();
      const now = Date.now();
      const dueAt = helsinkiLocal(now - 60_000).slice(0, 16);
      await request("POST", "/reminders", { petId, kind: "medication", title: "Antibiotic", detail: "1 tablet", dueAt });
      await request("POST", "/reminders", { petId, kind: "deworming", title: "Later", dueAt: addDays(today(), 3) });

      const sent: PushMessage[] = [];
      const send = async (messages: PushMessage[]) => {
        sent.push(...messages);
        return messages.map(() => "sent" as const);
      };
      expect(await runReminderJob(app.db, send, now)).toMatchObject({ reminders: 1, sent: 1 });
      expect(sent[0]).toMatchObject({ to: "ExponentPushToken[abc]", title: "Mirri: lääke", body: "Antibiotic · 1 tablet" });
      expect(sent[0].data).toMatchObject({ type: "reminder" });

      expect(await runReminderJob(app.db, send, now + 60_000)).toMatchObject({ reminders: 0, sent: 0 });
    });

    it("respects the device's reminder setting and skips reminders already done", async () => {
      await registerDevice({ reminders: false });
      const now = Date.now();
      await request("POST", "/reminders", { petId, kind: "medication", title: "A", dueAt: helsinkiLocal(now - 60_000).slice(0, 16) });
      const sent: PushMessage[] = [];
      const send = async (messages: PushMessage[]) => {
        sent.push(...messages);
        return messages.map(() => "sent" as const);
      };
      await runReminderJob(app.db, send, now);
      expect(sent).toEqual([]);
      expect((await request("GET", "/notifications/device")).json()).toMatchObject({ reminders: false, seasonalAlerts: true });
    });
  });
});
