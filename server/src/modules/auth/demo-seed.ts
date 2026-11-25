import { and, eq, lt } from "drizzle-orm";

import type { Db } from "../../db/client.js";
import { type PetRow, pets, reminders } from "../../db/schema.js";
import { createSchedule, saveCarePlan } from "../care/service.js";
import { addDays } from "../care/time.js";
import { addWeight, savePlan } from "../diet/service.js";
import { createRecord, todayInFinland } from "../passport/service.js";
import type { Answer } from "../symptoms/content.js";
import { saveLog, startWatchListsForRecord } from "../symptoms/service.js";

// Demo history for the spec's example pets, the same story as the app's mock data
// (client/src/services/mock), so the app looks the same with and without the backend.
// Dates are relative to the sign-up day: Mirri is on day 5 of 10 after a urinary tract infection,
// and both pets have two weeks of daily logs.

const AURORA = "Eläinklinikka Aurora";
const KAARINA = "Kaarinan koiraklinikka";
const VET = "ELL Laine";

/** "2026-11-19" as "19.11." */
const dayMonth = (isoDate: string) => `${Number(isoDate.slice(8, 10))}.${Number(isoDate.slice(5, 7))}.`;

/** Weigh-ins every few weeks, as in the mock: [days ago, kg] */
const addWeights = (db: Db, pet: PetRow, today: string, weights: [number, number][]) => {
  for (const [offset, weightKg] of weights) {
    addWeight(db, pet.id, { weightKg, weighedOn: addDays(today, offset) }, today);
  }
};

const usual = { appetite: 1, energy: 1, drinking: 1, toilet: 1, pain: 0, vomiting: 0 } satisfies Record<string, Answer>;

const seedMirri = (db: Db, pet: PetRow, userId: string, today: string) => {
  db.update(pets)
    .set({ microchip: "246098100234517", markings: "Harmaa tiikerikuvioinen, valkoinen rinta ja tassut", sex: "female", neutered: true })
    .where(eq(pets.id, pet.id))
    .run();
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
  createRecord(db, pet.id, "visit", {
    visitedOn: addDays(today, -625),
    reason: "Hammastarkastus",
    clinic: AURORA,
    diagnosis: "Lievä ientulehdus",
  });
  createRecord(db, pet.id, "lab", {
    kind: "blood",
    takenOn: addDays(today, -267),
    title: "Verenkuva ja munuaisarvot",
    summary: "Kaikki arvot viitealueella.",
    clinic: AURORA,
  });
  createRecord(db, pet.id, "lab", {
    kind: "urine",
    takenOn: visitDate,
    title: "Virtsakoe",
    summary: "Löydettiin bakteereja ja valkosoluja. Ei kiteitä.",
    clinic: AURORA,
  });

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

  savePlan(db, pet, {
    dietType: "urinary",
    source: "vet",
    foodName: "Virtsateitä tukeva märkäruoka · Vet Diet Urinary S/O",
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

const seedRekku = (db: Db, pet: PetRow, userId: string, today: string) => {
  db.update(pets)
    .set({
      microchip: "246098100771203",
      markings: "Keltainen, lyhytkarvainen",
      registration: "FI28417/21 · Suomen Kennelliitto",
      sex: "male",
      neutered: false,
    })
    .where(eq(pets.id, pet.id))
    .run();
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
  createRecord(db, pet.id, "lab", {
    kind: "xray",
    takenOn: addDays(today, -58),
    title: "Röntgen, vasen etutassu",
    summary: "Ei murtumaa. Vain pehmytkudosvamma.",
    clinic: KAARINA,
  });
  createRecord(db, pet.id, "lab", {
    kind: "ultrasound",
    takenOn: addDays(today, -383),
    title: "Vatsan ultraääni",
    summary: "Normaalit löydökset. Tutkittiin vatsavaivojen vuoksi.",
    clinic: KAARINA,
  });
  savePlan(db, pet, {
    dietType: "hypoallergenic",
    source: "vet",
    foodName: "Kanaton aikuisen koiran ruoka",
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
export const seedDemoHistory = (db: Db, householdId: string, userId: string, today = todayInFinland()) => {
  for (const pet of db.select().from(pets).where(eq(pets.householdId, householdId)).all()) {
    if (pet.name === "Mirri") seedMirri(db, pet, userId, today);
    if (pet.name === "Rekku") seedRekku(db, pet, userId, today);
  }
};
