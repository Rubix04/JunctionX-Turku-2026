import { and, eq, lt } from "drizzle-orm";

import type { Db } from "../../db/client.js";
import { type PetRow, pets, reminders } from "../../db/schema.js";
import { createSchedule, saveCarePlan } from "../care/service.js";
import { addDays } from "../care/time.js";
import { addWeight, savePlan } from "../diet/service.js";
import { createRecord, todayInFinland } from "../passport/service.js";
import type { Answer } from "../symptoms/content.js";
import { saveLog, startWatchListsForRecord } from "../symptoms/service.js";
import { type DemoLanguage, demoTexts } from "./demo-texts.js";

// Demo history for the spec's example pets, the same story as the app's mock data
// (client/src/services/mock), so the app looks the same with and without the backend.
// Dates are relative to the sign-up day: Mirri is on day 5 of 10 after a urinary tract infection,
// and both pets have two weeks of daily logs. Texts are in the language the app signed in with.

type Texts = (typeof demoTexts)[DemoLanguage];

/** "2026-11-19" as "19.11." */
const dayMonth = (isoDate: string) => `${Number(isoDate.slice(8, 10))}.${Number(isoDate.slice(5, 7))}.`;

/** Weigh-ins every few weeks, as in the mock: [days ago, kg] */
const addWeights = (db: Db, pet: PetRow, today: string, weights: [number, number][]) => {
  for (const [offset, weightKg] of weights) {
    addWeight(db, pet.id, { weightKg, weighedOn: addDays(today, offset) }, today);
  }
};

const usual = { appetite: 1, energy: 1, drinking: 1, toilet: 1, pain: 0, vomiting: 0 } satisfies Record<string, Answer>;

const seedMirri = (db: Db, pet: PetRow, userId: string, today: string, text: Texts) => {
  const t = text.mirri;
  const AURORA = text.aurora;
  const VET = text.vet;
  db.update(pets)
    .set({ microchip: "246098100234517", markings: t.markings, sex: "female", neutered: true })
    .where(eq(pets.id, pet.id))
    .run();
  const visitDate = addDays(today, -4);
  const courseStart = addDays(today, -3);
  const courseEnd = addDays(courseStart, 9);
  const followUp = addDays(today, 5);

  createRecord(db, pet.id, "visit", {
    visitedOn: addDays(today, -267),
    reason: t.annualVisit,
    clinic: AURORA,
  });
  createRecord(db, pet.id, "vaccination", {
    name: t.vaccine,
    givenOn: addDays(today, -267),
    validUntil: addDays(today, 98),
    clinic: AURORA,
  });
  createRecord(db, pet.id, "surgery", { name: t.spay, performedOn: "2019-05-14", clinic: AURORA });
  createRecord(db, pet.id, "visit", {
    visitedOn: addDays(today, -625),
    reason: t.dentalVisit,
    clinic: AURORA,
    diagnosis: t.gingivitis,
  });
  createRecord(db, pet.id, "lab", {
    kind: "blood",
    takenOn: addDays(today, -267),
    title: t.bloodTitle,
    summary: t.bloodSummary,
    clinic: AURORA,
  });
  createRecord(db, pet.id, "lab", {
    kind: "urine",
    takenOn: visitDate,
    title: t.urineTitle,
    summary: t.urineSummary,
    clinic: AURORA,
  });

  const visit = createRecord(db, pet.id, "visit", {
    visitedOn: visitDate,
    reason: t.utiReason,
    clinic: AURORA,
    diagnosis: t.uti,
  });
  startWatchListsForRecord(db, pet, visit, userId, today);
  const medication = createRecord(db, pet.id, "medication", {
    name: t.antibiotic,
    dosage: t.dosage,
    startDate: courseStart,
    endDate: courseEnd,
    prescribedBy: VET,
  });

  const { plan } = saveCarePlan(
    db,
    pet,
    visit.id,
    {
      diagnosis: t.uti,
      vetName: VET,
      findings: t.findings,
      homeCare: [...t.homeCare],
      followUp: { title: t.followUp, dateTime: `${followUp}T14:30:00`, clinicName: AURORA },
      products: [
        { productId: "urinary-wet", name: t.urinaryFood, brand: "Vet Diet · Urinary S/O", prescription: null },
        { productId: "antibiotic", name: t.antibiotic, brand: "", prescription: { issuedTo: AURORA, pickedUpOn: visitDate } },
      ],
      originalText: t.originalText.replace("{date}", dayMonth(followUp)),
      checkedByClinic: true,
    },
    userId,
    { allowClinicCheck: true },
  );

  savePlan(db, pet, {
    dietType: "urinary",
    source: "vet",
    foodName: `${t.urinaryFood} · Vet Diet Urinary S/O`,
    mealsPerDay: 2,
    goal: "maintain",
  });
  addWeights(db, pet, today, [
    [-133, 5.0],
    [-116, 4.95],
    [-97, 4.9],
    [-81, 4.8],
    [-67, 4.75],
    [-60, 4.7],
    [-53, 4.65],
    [-4, 4.6],
  ]);

  // Doses at 8 and 20, the ones already due marked as given.
  const schedule = createSchedule(
    db,
    pet,
    userId,
    { medicationRecordId: medication.id, carePlanId: plan.id, times: ["08:00", "20:00"] },
    today,
  );
  db.update(reminders)
    .set({ doneAt: Date.now(), doneByUserId: userId })
    .where(and(eq(reminders.scheduleId, schedule.id), lt(reminders.dueAt, `${today}T00:00`)))
    .run();

  // Two weeks, as in the mock: fine at first, pain and a poor appetite two days before the visit,
  // straining on the visit day, drinking more since. Watch list questions only from the visit on.
  const uti = (water: Answer, trips: Answer, straining: Answer) => ({
    "uti-water": water,
    "uti-trips": trips,
    "uti-straining": straining,
  });
  const logs: { day: number; answers: Record<string, Answer> }[] = [
    { day: -14, answers: usual },
    { day: -13, answers: usual },
    { day: -12, answers: { ...usual, appetite: 2 } },
    { day: -11, answers: usual },
    { day: -10, answers: usual },
    { day: -9, answers: usual },
    { day: -8, answers: { ...usual, energy: 2 } },
    { day: -7, answers: usual },
    { day: -6, answers: { ...usual, pain: 1 } },
    { day: -5, answers: { ...usual, pain: 1, appetite: 0 } },
    { day: -4, answers: { ...usual, pain: 1, ...uti(1, 2, 1) } },
    { day: -3, answers: { ...usual, ...uti(1, 1, 0) } },
    { day: -2, answers: { ...usual, ...uti(2, 1, 0) } },
    { day: -1, answers: { ...usual, ...uti(2, 1, 0) } },
  ];
  for (const log of logs) {
    saveLog(db, pet, userId, addDays(today, log.day), { answers: log.answers, emergencySymptoms: [], symptoms: [] }, today);
  }
};

const seedRekku = (db: Db, pet: PetRow, userId: string, today: string, text: Texts) => {
  const t = text.rekku;
  const KAARINA = text.kaarina;
  db.update(pets)
    .set({
      microchip: "246098100771203",
      markings: t.markings,
      registration: t.registration,
      sex: "male",
      neutered: false,
    })
    .where(eq(pets.id, pet.id))
    .run();
  createRecord(db, pet.id, "visit", {
    visitedOn: addDays(today, -58),
    reason: t.limpReason,
    clinic: KAARINA,
    diagnosis: t.pawInjury,
  });
  createRecord(db, pet.id, "vaccination", {
    name: t.vaccine,
    givenOn: addDays(today, -383),
    validUntil: addDays(today, -18),
    clinic: KAARINA,
  });
  createRecord(db, pet.id, "vaccination", {
    name: t.rabies,
    givenOn: addDays(today, -748),
    validUntil: addDays(today, 347),
    clinic: KAARINA,
  });
  createRecord(db, pet.id, "allergy", { allergen: t.allergen, severity: "mild" });
  createRecord(db, pet.id, "lab", {
    kind: "xray",
    takenOn: addDays(today, -58),
    title: t.xrayTitle,
    summary: t.xraySummary,
    clinic: KAARINA,
  });
  createRecord(db, pet.id, "lab", {
    kind: "ultrasound",
    takenOn: addDays(today, -383),
    title: t.ultrasoundTitle,
    summary: t.ultrasoundSummary,
    clinic: KAARINA,
  });
  savePlan(db, pet, {
    dietType: "hypoallergenic",
    source: "vet",
    foodName: t.food,
    mealsPerDay: 2,
    goal: "maintain",
  });
  addWeights(db, pet, today, [
    [-107, 31.4],
    [-74, 31.1],
    [-46, 31.0],
  ]);

  // Two weeks of logs: tired after a long walk one day, extra hungry another.
  for (let offset = -14; offset <= -1; offset++) {
    const answers: Record<string, Answer> =
      offset === -9 ? { ...usual, energy: 0 } : offset === -3 ? { ...usual, appetite: 2 } : usual;
    saveLog(db, pet, userId, addDays(today, offset), { answers, emergencySymptoms: [], symptoms: [] }, today);
  }
};

/** Fills a new demo household's pets with the same history as the app's mock data. */
export const seedDemoHistory = (
  db: Db,
  householdId: string,
  userId: string,
  language: DemoLanguage = "fi",
  today = todayInFinland(),
) => {
  const text = demoTexts[language];
  for (const pet of db.select().from(pets).where(eq(pets.householdId, householdId)).all()) {
    if (pet.name === "Mirri") seedMirri(db, pet, userId, today, text);
    if (pet.name === "Rekku") seedRekku(db, pet, userId, today, text);
  }
};
