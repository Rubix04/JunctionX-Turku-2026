import { and, eq, lt } from "drizzle-orm";

import type { Db } from "../../db/client.js";
import { type PetRow, pets, reminders } from "../../db/schema.js";
import { createSchedule, saveCarePlan } from "../care/service.js";
import { addDays } from "../care/time.js";
import { createRecord, todayInFinland } from "../passport/service.js";
import type { Answer } from "../symptoms/content.js";
import { saveLog, startWatchListsForRecord } from "../symptoms/service.js";

// Demo history for the spec's example pets, the same story as the app's mock data
// (client/src/services/mock), so the app looks the same with and without the backend.
// Dates are relative to the sign-up day: Mirri is on day 5 of 10 after a urinary tract infection.

const AURORA = "Eläinklinikka Aurora";
const KAARINA = "Kaarinan koiraklinikka";
const VET = "ELL Laine";

/** "2026-11-19" as "19.11." */
const dayMonth = (isoDate: string) => `${Number(isoDate.slice(8, 10))}.${Number(isoDate.slice(5, 7))}.`;

const usual = { appetite: 1, energy: 1, drinking: 1, toilet: 1, pain: 0, vomiting: 0 } satisfies Record<string, Answer>;

const seedMirri = (db: Db, pet: PetRow, userId: string, today: string) => {
  const visitDate = addDays(today, -4);
  const courseStart = addDays(today, -3);
  const courseEnd = addDays(courseStart, 9);
  const followUp = addDays(today, 5);

  createRecord(db, pet.id, "visit", {
    visitedOn: addDays(today, -267),
    reason: "Vuositarkastus ja rokotukset",
    clinic: AURORA,
  });
  createRecord(db, pet.id, "vaccination", {
    name: "Kissanflunssa ja kissarutto",
    givenOn: addDays(today, -267),
    validUntil: addDays(today, 98),
    clinic: AURORA,
  });
  createRecord(db, pet.id, "surgery", { name: "Sterilointi", performedOn: "2019-05-14", clinic: AURORA });

  const visit = createRecord(db, pet.id, "visit", {
    visitedOn: visitDate,
    reason: "Tihentynyt virtsaaminen",
    clinic: AURORA,
    diagnosis: "Virtsatieinfektio",
  });
  startWatchListsForRecord(db, pet, visit, userId, today);
  const medication = createRecord(db, pet.id, "medication", {
    name: "Antibiootti",
    dosage: "1 tabletti 2 kertaa päivässä ruoan kanssa",
    startDate: courseStart,
    endDate: courseEnd,
    prescribedBy: VET,
  });

  const { plan } = saveCarePlan(
    db,
    pet,
    visit.id,
    {
      diagnosis: "Virtsatieinfektio",
      vetName: VET,
      findings:
        "Mirrin virtsassa on bakteereja, jotka ärsyttävät virtsarakkoa. Siksi hän käy laatikolla usein ja virtsaa vain vähän kerrallaan.",
      homeCare: [
        "Anna antibioottia aamuin illoin 10 päivän ajan, vaikka vointi paranisi aiemmin.",
        "Tue juomista: raikasta vettä useaan paikkaan ja märkäruokaa.",
        "Kirjaa juominen, laatikkokäynnit ja ponnistelu päivittäin.",
      ],
      followUp: { title: "Kontrollikäynti ja virtsanäyte", dateTime: `${followUp}T14:30:00`, clinicName: AURORA },
      products: [
        { productId: "urinary-wet", name: "Virtsateitä tukeva märkäruoka", brand: "Vet Diet · Urinary S/O", prescription: null },
        { productId: "antibiotic", name: "Antibiootti", brand: "", prescription: { issuedTo: AURORA, pickedUpOn: visitDate } },
      ],
      originalText: `Dg: bakteerikystiitti. Virtsan liuskakoe: leuk +++, ery ++, nitriitti +. Sedimentti: bakteereja, ei kiteitä. Hoito: amoksisilliini/klavulaanihappo 50 mg 1x2 p.o. 10 vrk. Märkä virtsatieruokavalio, lisää juomista. Kontrolli ${dayMonth(followUp)} jos ei paranemista.`,
      checkedByClinic: true,
    },
    userId,
    { allowClinicCheck: true },
  );

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

  // As in the mock: straining on the visit day, then drinking more for the last two days.
  const logs: { day: number; answers: Record<string, Answer> }[] = [
    { day: -4, answers: { ...usual, pain: 1, "uti-water": 1, "uti-trips": 2, "uti-straining": 1 } },
    { day: -3, answers: { ...usual, "uti-water": 1, "uti-trips": 1, "uti-straining": 0 } },
    { day: -2, answers: { ...usual, "uti-water": 2, "uti-trips": 1, "uti-straining": 0 } },
    { day: -1, answers: { ...usual, "uti-water": 2, "uti-trips": 1, "uti-straining": 0 } },
  ];
  for (const log of logs) {
    saveLog(db, pet, userId, addDays(today, log.day), { answers: log.answers, emergencySymptoms: [], symptoms: [] }, today);
  }
};

const seedRekku = (db: Db, pet: PetRow, today: string) => {
  createRecord(db, pet.id, "visit", {
    visitedOn: addDays(today, -58),
    reason: "Ontuminen vasen etujalka",
    clinic: KAARINA,
    diagnosis: "Anturavamma, ei murtumaa",
  });
  createRecord(db, pet.id, "vaccination", {
    name: "Penikkatauti, parvo ja hepatiitti",
    givenOn: addDays(today, -383),
    validUntil: addDays(today, -18),
    clinic: KAARINA,
  });
  createRecord(db, pet.id, "vaccination", {
    name: "Raivotauti",
    givenOn: addDays(today, -748),
    validUntil: addDays(today, 347),
    clinic: KAARINA,
  });
  createRecord(db, pet.id, "allergy", { allergen: "Kanaproteiini", severity: "mild" });
};

/** Fills a new demo household's pets with the same history as the app's mock data. */
export const seedDemoHistory = (db: Db, householdId: string, userId: string, today = todayInFinland()) => {
  for (const pet of db.select().from(pets).where(eq(pets.householdId, householdId)).all()) {
    if (pet.name === "Mirri") seedMirri(db, pet, userId, today);
    if (pet.name === "Rekku") seedRekku(db, pet, today);
  }
};
