import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { eq } from "drizzle-orm";

import type { Db } from "../../db/client.js";
import { type PetRow, pets } from "../../db/schema.js";
import { saveCarePlan } from "../care/service.js";
import { addDays } from "../care/time.js";
import { createRecord, todayInFinland } from "../passport/service.js";
import type { Answer } from "../symptoms/content.js";
import { saveLog, startWatchListsForRecord } from "../symptoms/service.js";

// Demo history for the spec's example pets, so a demo account has something to show and the AI
// has vet data and daily logs to read together. Dates are relative to the sign-up day.
//
// Mirri: a urinary tract infection found 6 days ago, a 5-day antibiotic course that ended 2 days
// ago, and daily logs where the symptoms ease during the course and come back after it.
// Rekku: a healed paw injury and the annual vaccines.

const documentPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../content/demo-documents/mirri-virtsatieinfektio.txt",
);

/** "2026-11-19" as "19.11.2026" */
const finnishDate = (isoDate: string) => {
  const [year, month, day] = isoDate.split("-");
  return `${Number(day)}.${Number(month)}.${year}`;
};

const usual = { appetite: 1, energy: 1, drinking: 1, toilet: 1, pain: 0, vomiting: 0 } satisfies Record<string, Answer>;

const seedMirri = (db: Db, pet: PetRow, userId: string, today: string) => {
  const visitDate = addDays(today, -6);
  const courseEnd = addDays(today, -2);
  const followUp = addDays(today, 1);

  const visit = createRecord(db, pet.id, "visit", {
    visitedOn: visitDate,
    reason: "Tihentynyt virtsaaminen",
    clinic: "Eläinklinikka Aurora",
    diagnosis: "Virtsatieinfektio",
  });
  startWatchListsForRecord(db, pet, visit, userId, today);
  createRecord(db, pet.id, "medication", {
    name: "Antibiootti",
    dosage: "1 tabletti 2 kertaa päivässä ruoan kanssa",
    startDate: visitDate,
    endDate: courseEnd,
    prescribedBy: "ELL Laura Laine",
  });
  createRecord(db, pet.id, "vaccination", {
    name: "Kissanflunssa ja kissarutto",
    givenOn: addDays(today, -260),
    validUntil: addDays(today, 105),
    clinic: "Eläinklinikka Aurora",
  });

  const originalText = readFileSync(documentPath, "utf8")
    .replaceAll("{visitDate}", finnishDate(visitDate))
    .replaceAll("{courseEnd}", finnishDate(courseEnd))
    .replaceAll("{followUp}", `${finnishDate(followUp)} klo 10.00`);
  saveCarePlan(
    db,
    pet,
    visit.id,
    {
      diagnosis: "Virtsatieinfektio",
      vetName: "ELL Laura Laine",
      findings:
        "Mirrin virtsassa on bakteereja, jotka ärsyttävät virtsarakkoa. Siksi hän käy laatikolla usein ja virtsaa vain vähän kerrallaan. Virtsateissä ei ole tukosta.",
      homeCare: [
        "Raikasta vettä useassa paikassa, kupit erillään ruokakupista.",
        "Märkäruokaa 2 kertaa päivässä, jotta Mirri saa enemmän nestettä.",
        "Seuraa hiekkalaatikkokäyntejä ja virtsan väriä päivittäin.",
        "Anna koko antibioottikuuri loppuun, vaikka oireet helpottaisivat.",
      ],
      followUp: { title: "Kontrollikäynti ja virtsanäyte", dateTime: `${followUp}T10:00:00`, clinicName: "Eläinklinikka Aurora" },
      products: [
        { productId: null, name: "Antibiootti", brand: "Reseptilääke", prescription: { issuedTo: "Aino Virtanen", pickedUpOn: visitDate } },
      ],
      originalText,
      checkedByClinic: true,
    },
    userId,
    { allowClinicCheck: true },
  );

  // Better during the course, worse again after it: drinking less and more trips to the box.
  const logs: { day: number; answers: Record<string, Answer>; note?: string }[] = [
    {
      day: -6,
      answers: { ...usual, pain: 1, "uti-water": 1, "uti-trips": 2, "uti-straining": 1 },
      note: "Klinikalta kotiin, ensimmäinen tabletti annettu.",
    },
    { day: -5, answers: { ...usual, "uti-water": 1, "uti-trips": 2, "uti-straining": 0 } },
    { day: -4, answers: { ...usual, "uti-water": 1, "uti-trips": 1, "uti-straining": 0 } },
    { day: -3, answers: { ...usual, "uti-water": 1, "uti-trips": 1, "uti-straining": 0 }, note: "Tuntuu jo ihan omalta itseltään." },
    { day: -2, answers: { ...usual, "uti-water": 1, "uti-trips": 1, "uti-straining": 0 }, note: "Viimeinen tabletti illalla." },
    {
      day: -1,
      answers: { ...usual, drinking: 0, "uti-water": 0, "uti-trips": 2, "uti-straining": 0 },
      note: "Joi tänään vähän ja kävi laatikolla monta kertaa.",
    },
  ];
  for (const log of logs) {
    saveLog(
      db,
      pet,
      userId,
      addDays(today, log.day),
      { answers: log.answers, emergencySymptoms: [], symptoms: [], note: log.note ?? null },
      today,
    );
  }
};

const seedRekku = (db: Db, pet: PetRow, userId: string, today: string) => {
  createRecord(db, pet.id, "visit", {
    visitedOn: addDays(today, -58),
    reason: "Ontuminen vasen etujalka",
    clinic: "Kaarinan koiraklinikka",
    diagnosis: "Anturavamma, ei murtumaa",
  });
  createRecord(db, pet.id, "vaccination", {
    name: "Penikkatauti, parvo ja hepatiitti",
    givenOn: addDays(today, -19),
    validUntil: addDays(today, 3 * 365 - 19),
    clinic: "Kaarinan koiraklinikka",
  });
  createRecord(db, pet.id, "allergy", { allergen: "Kanaproteiini", reaction: "Kutina ja vatsavaivat", severity: "mild" });
  for (const day of [-3, -2, -1]) {
    saveLog(db, pet, userId, addDays(today, day), { answers: usual, emergencySymptoms: [], symptoms: [] }, today);
  }
};

/** Fills a new demo household's pets with a visit history, a care plan and daily logs. */
export const seedDemoHistory = (db: Db, householdId: string, userId: string, today = todayInFinland()) => {
  const household = db.select().from(pets).where(eq(pets.householdId, householdId)).all();
  for (const pet of household) {
    if (pet.name === "Mirri") seedMirri(db, pet, userId, today);
    if (pet.name === "Rekku") seedRekku(db, pet, userId, today);
  }
};
