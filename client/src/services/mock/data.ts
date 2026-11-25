import { AURORA, DR_LAINE } from '@/services/mock/clinics';
import { tr } from '@/services/mock/delay';
import type { CarePlan, MedicationCourse, Reminder, Visit } from '@/types/care';
import type { DailyLog, LogQuestion, WatchList } from '@/types/health';
import type { Pet } from '@/types/pet';

// Demo data from the design mockups: Mirri is recovering from a urinary tract
// infection (yellow), Rekku has no watch list (green). Texts are placeholders
// until vet-reviewed content comes from the backend. tr() texts follow the app language.

export const mockPets: Pet[] = [
  {
    id: 'mirri',
    name: 'Mirri',
    species: 'cat',
    breed: tr({ en: 'Domestic shorthair', fi: 'Maatiaiskissa', sv: 'Huskatt' }),
    birthDate: '2019-05-04',
    weightKg: 4.6,
    photoUrl: null,
  },
  {
    id: 'rekku',
    name: 'Rekku',
    species: 'dog',
    breed: 'Labrador',
    birthDate: '2021-08-19',
    weightKg: 31,
    photoUrl: null,
  },
];

const UTI = tr({ en: 'Urinary tract infection', fi: 'Virtsatieinfektio', sv: 'Urinvägsinfektion' });
const LESS_USUAL_MORE: LogQuestion['options'] = [
  tr({ en: 'Less', fi: 'Vähemmän', sv: 'Mindre' }),
  tr({ en: 'Usual', fi: 'Tavallinen', sv: 'Som vanligt' }),
  tr({ en: 'More', fi: 'Enemmän', sv: 'Mer' }),
];
const LOW_USUAL_HIGH: LogQuestion['options'] = [
  tr({ en: 'Low', fi: 'Heikko', sv: 'Låg' }),
  tr({ en: 'Usual', fi: 'Tavallinen', sv: 'Som vanligt' }),
  tr({ en: 'High', fi: 'Suuri', sv: 'Hög' }),
];

export const mockWatchLists: WatchList[] = [
  {
    petId: 'mirri',
    condition: UTI,
    vetName: DR_LAINE,
    startDate: '2026-10-14',
    totalDays: 10,
    questions: [
      {
        id: 'water',
        label: tr({ en: 'Water intake', fi: 'Juominen', sv: 'Drickande' }),
        options: LESS_USUAL_MORE,
        yellowIf: [0, 2],
        redIf: [],
      },
      {
        id: 'litter',
        label: tr({ en: 'Litter box trips', fi: 'Hiekkalaatikkokäynnit', sv: 'Besök i kattlådan' }),
        options: [
          tr({ en: 'Fewer', fi: 'Harvemmin', sv: 'Färre' }),
          tr({ en: 'Usual', fi: 'Tavallinen', sv: 'Som vanligt' }),
          tr({ en: 'More', fi: 'Useammin', sv: 'Fler' }),
        ],
        yellowIf: [0, 2],
        redIf: [],
      },
      {
        id: 'straining',
        label: tr({ en: 'Straining to urinate', fi: 'Virtsaamisen ponnistelu', sv: 'Krystningar vid urinering' }),
        options: [
          tr({ en: 'No', fi: 'Ei', sv: 'Nej' }),
          tr({ en: 'A little', fi: 'Vähän', sv: 'Lite' }),
          tr({ en: 'No urine', fi: 'Virtsaa ei tule', sv: 'Ingen urin' }),
        ],
        yellowIf: [1],
        redIf: [2],
      },
    ],
    yellowAdvice: [
      tr({
        en: 'Fill the water bowl to a mark in the morning and check it in the evening.',
        fi: 'Täytä vesikuppi merkkiin aamulla ja tarkista se illalla.',
        sv: 'Fyll vattenskålen till ett märke på morgonen och kontrollera den på kvällen.',
      }),
      tr({
        en: 'Log litter box trips again tonight, in more detail.',
        fi: 'Kirjaa hiekkalaatikkokäynnit uudelleen illalla tarkemmin.',
        sv: 'Logga besöken i kattlådan igen i kväll, noggrannare.',
      }),
    ],
    redWhen: tr({
      en: 'she strains without passing urine. Then contact a vet straight away.',
      fi: 'Mirri ponnistelee eikä virtsaa tule. Ota silloin heti yhteyttä eläinlääkäriin.',
      sv: 'Mirri krystar utan att urin kommer. Kontakta då en veterinär direkt.',
    }),
    redReason: tr({
      en: 'Straining without passing urine can mean a blocked urinary tract. Your vet listed this as a reason to call right away.',
      fi: 'Ponnistelu ilman virtsaa voi tarkoittaa virtsateiden tukosta. Eläinlääkäri mainitsi tämän syyksi soittaa heti.',
      sv: 'Krystningar utan urin kan betyda att urinvägarna är blockerade. Veterinären nämnde detta som skäl att ringa direkt.',
    }),
  },
];

// Asked on every daily log, with or without a watch list.
export const mockGeneralQuestions: LogQuestion[] = [
  { id: 'appetite', label: tr({ en: 'Appetite', fi: 'Ruokahalu', sv: 'Aptit' }), options: LOW_USUAL_HIGH, yellowIf: [0], redIf: [] },
  { id: 'energy', label: tr({ en: 'Energy', fi: 'Vireys', sv: 'Energi' }), options: LOW_USUAL_HIGH, yellowIf: [0], redIf: [] },
  {
    id: 'pain',
    label: tr({ en: 'Pain', fi: 'Kipu', sv: 'Smärta' }),
    options: [
      tr({ en: 'None', fi: 'Ei', sv: 'Ingen' }),
      tr({ en: 'Some', fi: 'Jonkin verran', sv: 'Något' }),
      tr({ en: 'Clear', fi: 'Selvää', sv: 'Tydlig' }),
    ],
    yellowIf: [1, 2],
    redIf: [],
  },
  {
    id: 'vomiting',
    label: tr({ en: 'Vomiting', fi: 'Oksentelu', sv: 'Kräkningar' }),
    options: [
      tr({ en: 'No', fi: 'Ei', sv: 'Nej' }),
      tr({ en: 'Once', fi: 'Kerran', sv: 'En gång' }),
      tr({ en: 'Repeated', fi: 'Toistuvasti', sv: 'Upprepade' }),
    ],
    yellowIf: [1, 2],
    redIf: [],
  },
];

export const mockDailyLogs: DailyLog[] = [
  {
    petId: 'mirri',
    date: '2026-10-13',
    answers: { water: 1, litter: 2, straining: 1, appetite: 1, energy: 1, pain: 1, vomiting: 0 },
  },
  {
    petId: 'mirri',
    date: '2026-10-14',
    answers: { water: 1, litter: 1, straining: 0, appetite: 1, energy: 1, pain: 0, vomiting: 0 },
  },
  {
    petId: 'mirri',
    date: '2026-10-15',
    answers: { water: 2, litter: 1, straining: 0, appetite: 1, energy: 1, pain: 0, vomiting: 0 },
  },
  {
    petId: 'mirri',
    date: '2026-10-16',
    answers: { water: 2, litter: 1, straining: 0, appetite: 1, energy: 1, pain: 0, vomiting: 0 },
  },
];

/** Family members who share the pet pages and reminders */
export const mockHousehold = {
  ownerFirstName: 'Aino',
  ownerFullName: 'Aino Virtanen',
  members: [{ id: 'juha', name: 'Juha', role: 'member' as const }],
};

export const mockVisits: Visit[] = [
  {
    id: 'visit-mirri-uti',
    petId: 'mirri',
    date: '2026-10-13',
    title: UTI,
    clinicName: AURORA,
    vetName: DR_LAINE,
  },
  {
    id: 'visit-mirri-annual',
    petId: 'mirri',
    date: '2026-03-02',
    title: tr({ en: 'Annual check-up & vaccines', fi: 'Vuositarkastus ja rokotukset', sv: 'Årlig hälsokontroll och vaccinationer' }),
    clinicName: AURORA,
    vetName: null,
  },
];

const ANTIBIOTIC = tr({ en: 'Antibiotic', fi: 'Antibiootti', sv: 'Antibiotika' });

export const mockCarePlans: CarePlan[] = [
  {
    petId: 'mirri',
    visitId: 'visit-mirri-uti',
    diagnosis: UTI,
    clinicName: AURORA,
    vetName: DR_LAINE,
    checkedByClinic: true,
    findings: tr({
      en: "Bacteria in Mirri's urine are irritating her bladder. That is why she visits the litter box often and passes only small amounts.",
      fi: 'Mirrin virtsassa on bakteereja, jotka ärsyttävät virtsarakkoa. Siksi hän käy laatikolla usein ja virtsaa vain vähän kerrallaan.',
      sv: 'Bakterier i Mirris urin irriterar urinblåsan. Därför går hon ofta på lådan och kissar bara lite åt gången.',
    }),
    homeCare: [
      tr({
        en: 'Give the antibiotic morning and evening for 10 days, even if she seems better.',
        fi: 'Anna antibioottia aamuin illoin 10 päivän ajan, vaikka vointi paranisi aiemmin.',
        sv: 'Ge antibiotikan morgon och kväll i 10 dagar, även om hon verkar må bättre.',
      }),
      tr({
        en: 'Help her drink: fresh water in several places, and wet food.',
        fi: 'Tue juomista: raikasta vettä useaan paikkaan ja märkäruokaa.',
        sv: 'Hjälp henne att dricka: färskt vatten på flera ställen och våtfoder.',
      }),
      tr({
        en: 'Log water, litter box trips and straining every day.',
        fi: 'Kirjaa juominen, laatikkokäynnit ja ponnistelu päivittäin.',
        sv: 'Logga drickande, besök i lådan och krystningar varje dag.',
      }),
    ],
    followUp: {
      title: tr({ en: 'Check-up and urine test', fi: 'Kontrollikäynti ja virtsanäyte', sv: 'Återbesök och urinprov' }),
      dateTime: '2026-10-22T14:30:00',
      clinicName: AURORA,
    },
    products: [
      {
        productId: 'urinary-wet',
        name: tr({ en: 'Urinary care wet food', fi: 'Virtsateitä tukeva märkäruoka', sv: 'Våtfoder för urinvägarna' }),
        brand: 'Vet Diet · Urinary S/O',
        prescription: null,
      },
      {
        productId: 'antibiotic',
        name: ANTIBIOTIC,
        brand: '',
        prescription: { issuedTo: AURORA, pickedUpOn: '2026-10-13' },
      },
    ],
    originalText: tr({
      en: 'Dx: bacterial cystitis. Urine sticks: leuk +++, ery ++, nitrite +. Sediment: bacteria, no crystals. Tx: amoxicillin/clavulanate 50 mg 1x2 p.o. 10 d. Wet urinary diet, increase water intake. Control 22.10. if no improvement.',
      fi: 'Dg: bakteerikystiitti. Virtsan liuskakoe: leuk +++, ery ++, nitriitti +. Sedimentti: bakteereja, ei kiteitä. Hoito: amoksisilliini/klavulaanihappo 50 mg 1x2 p.o. 10 vrk. Märkä virtsatieruokavalio, lisää juomista. Kontrolli 22.10. jos ei paranemista.',
      sv: 'Dg: bakteriell cystit. Urinstickor: leuk +++, ery ++, nitrit +. Sediment: bakterier, inga kristaller. Beh: amoxicillin/klavulansyra 50 mg 1x2 p.o. 10 d. Vått urinvägsfoder, öka vattenintaget. Kontroll 22.10. om ingen förbättring.',
    }),
  },
];

export const mockMedicationCourses: MedicationCourse[] = [
  {
    petId: 'mirri',
    name: ANTIBIOTIC,
    dosesTotal: 20,
    dosesGiven: 6,
    startDate: '2026-10-14',
    totalDays: 10,
  },
];

const ONE_TABLET_WITH_FOOD = tr({ en: '1 tablet · with food', fi: '1 tabletti · ruoan kanssa', sv: '1 tablett · med mat' });

export const mockReminders: Reminder[] = [
  {
    id: 'mirri-antibiotic-am',
    petId: 'mirri',
    kind: 'medication',
    title: ANTIBIOTIC,
    detail: ONE_TABLET_WITH_FOOD,
    dueAt: '2026-10-17T08:00:00',
    done: true,
    doneBy: 'Juha',
  },
  {
    id: 'mirri-antibiotic-pm',
    petId: 'mirri',
    kind: 'medication',
    title: ANTIBIOTIC,
    detail: ONE_TABLET_WITH_FOOD,
    dueAt: '2026-10-17T20:00:00',
    done: false,
  },
  {
    id: 'mirri-follow-up',
    petId: 'mirri',
    kind: 'visit',
    title: tr({ en: 'Follow-up visit', fi: 'Jälkitarkastus', sv: 'Återbesök' }),
    detail: AURORA,
    dueAt: '2026-10-22T14:30:00',
    done: false,
  },
  {
    id: 'rekku-vaccination',
    petId: 'rekku',
    kind: 'vaccination',
    title: tr({ en: 'Yearly vaccination', fi: 'Vuosirokotus', sv: 'Årlig vaccination' }),
    detail: tr({ en: 'Book a time', fi: 'Varaa aika', sv: 'Boka en tid' }),
    dueAt: '2026-11-07T00:00:00',
    done: false,
  },
  {
    id: 'rekku-deworming',
    petId: 'rekku',
    kind: 'deworming',
    title: tr({ en: 'Deworming', fi: 'Madotus', sv: 'Avmaskning' }),
    detail: '',
    dueAt: '2026-12-01T00:00:00',
    done: false,
  },
];
