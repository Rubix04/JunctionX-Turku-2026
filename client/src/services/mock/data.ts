import { AURORA, DR_LAINE } from '@/services/mock/clinics';
import { tr } from '@/services/mock/delay';
import { demoDate } from '@/services/mock/demo-date';
import type { CarePlan, MedicationCourse, Reminder, Visit } from '@/types/care';
import type { DailyLog, LogAnswer, LogQuestion, WatchList } from '@/types/health';
import type { Pet } from '@/types/pet';

/** The follow-up date as the vet writes it in the notes, e.g. "22.10." */
const followUpDay = (() => {
  const [, month, day] = demoDate('2026-10-22').split('-');
  return `${Number(day)}.${Number(month)}.`;
})();

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
    startDate: demoDate('2026-10-14'),
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

// Two weeks of daily logs, dated like the rest of the story (demoDate moves them to today).
// Mirri was fine, had some pain and a poor appetite two days before the visit on the 13th,
// strained that day and has been drinking more since. Rekku was tired after a long walk one day
// and extra hungry another.
const usual = { appetite: 1, energy: 1, pain: 0, vomiting: 0 } as const;
const uti = (water: LogAnswer, litter: LogAnswer, straining: LogAnswer) => ({ water, litter, straining });

const mirriDays: [string, Record<string, LogAnswer>][] = [
  ['2026-10-03', usual],
  ['2026-10-04', usual],
  ['2026-10-05', { ...usual, appetite: 2 }],
  ['2026-10-06', usual],
  ['2026-10-07', usual],
  ['2026-10-08', usual],
  ['2026-10-09', { ...usual, energy: 2 }],
  ['2026-10-10', usual],
  ['2026-10-11', { ...usual, pain: 1 }],
  ['2026-10-12', { ...usual, pain: 1, appetite: 0 }],
  ['2026-10-13', { ...usual, pain: 1, ...uti(1, 2, 1) }],
  ['2026-10-14', { ...usual, ...uti(1, 1, 0) }],
  ['2026-10-15', { ...usual, ...uti(2, 1, 0) }],
  ['2026-10-16', { ...usual, ...uti(2, 1, 0) }],
];

const rekkuDays: [string, Record<string, LogAnswer>][] = [
  '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09',
  '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16',
].map((date) => [
  date,
  date === '2026-10-08' ? { ...usual, energy: 0 } : date === '2026-10-14' ? { ...usual, appetite: 2 } : usual,
]);

export const mockDailyLogs: DailyLog[] = [
  ...mirriDays.map(([date, answers]) => ({ petId: 'mirri', date: demoDate(date), answers })),
  ...rekkuDays.map(([date, answers]) => ({ petId: 'rekku', date: demoDate(date), answers })),
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
    date: demoDate('2026-10-13'),
    title: UTI,
    clinicName: AURORA,
    vetName: DR_LAINE,
  },
  {
    id: 'visit-mirri-annual',
    petId: 'mirri',
    date: demoDate('2026-03-02'),
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
      dateTime: demoDate('2026-10-22T14:30:00'),
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
        prescription: { issuedTo: AURORA, pickedUpOn: demoDate('2026-10-13') },
      },
    ],
    originalText: tr({
      en: `Dx: bacterial cystitis. Urine sticks: leuk +++, ery ++, nitrite +. Sediment: bacteria, no crystals. Tx: amoxicillin/clavulanate 50 mg 1x2 p.o. 10 d. Wet urinary diet, increase water intake. Control ${followUpDay} if no improvement.`,
      fi: `Dg: bakteerikystiitti. Virtsan liuskakoe: leuk +++, ery ++, nitriitti +. Sedimentti: bakteereja, ei kiteitä. Hoito: amoksisilliini/klavulaanihappo 50 mg 1x2 p.o. 10 vrk. Märkä virtsatieruokavalio, lisää juomista. Kontrolli ${followUpDay} jos ei paranemista.`,
      sv: `Dg: bakteriell cystit. Urinstickor: leuk +++, ery ++, nitrit +. Sediment: bakterier, inga kristaller. Beh: amoxicillin/klavulansyra 50 mg 1x2 p.o. 10 d. Vått urinvägsfoder, öka vattenintaget. Kontroll ${followUpDay} om ingen förbättring.`,
    }),
  },
];

export const mockMedicationCourses: MedicationCourse[] = [
  {
    petId: 'mirri',
    name: ANTIBIOTIC,
    dosesTotal: 20,
    dosesGiven: 6,
    startDate: demoDate('2026-10-14'),
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
    dueAt: demoDate('2026-10-17T08:00:00'),
    done: true,
    doneBy: 'Juha',
  },
  {
    id: 'mirri-antibiotic-pm',
    petId: 'mirri',
    kind: 'medication',
    title: ANTIBIOTIC,
    detail: ONE_TABLET_WITH_FOOD,
    dueAt: demoDate('2026-10-17T20:00:00'),
    done: false,
  },
  {
    id: 'mirri-follow-up',
    petId: 'mirri',
    kind: 'visit',
    title: tr({ en: 'Follow-up visit', fi: 'Jälkitarkastus', sv: 'Återbesök' }),
    detail: AURORA,
    dueAt: demoDate('2026-10-22T14:30:00'),
    done: false,
  },
  {
    id: 'rekku-vaccination',
    petId: 'rekku',
    kind: 'vaccination',
    title: tr({ en: 'Yearly vaccination', fi: 'Vuosirokotus', sv: 'Årlig vaccination' }),
    detail: tr({ en: 'Book a time', fi: 'Varaa aika', sv: 'Boka en tid' }),
    dueAt: demoDate('2026-11-07T00:00:00'),
    done: false,
  },
  {
    id: 'rekku-deworming',
    petId: 'rekku',
    kind: 'deworming',
    title: tr({ en: 'Deworming', fi: 'Madotus', sv: 'Avmaskning' }),
    detail: '',
    dueAt: demoDate('2026-12-01T00:00:00'),
    done: false,
  },
];

/**
 * What a scanned visit note becomes in mock mode, for any pet. Kept free of names and pronouns so
 * it reads right for a cat or a dog; the real result comes from the backend's AI.
 */
export const mockScanSample: Omit<CarePlan, 'petId' | 'visitId' | 'checkedByClinic'> = {
  diagnosis: tr({ en: 'Mild stomach upset', fi: 'Lievä vatsatauti', sv: 'Lindriga magbesvär' }),
  clinicName: AURORA,
  vetName: DR_LAINE,
  findings: tr({
    en: 'The stomach and bowel are irritated, which causes the loose stools and poor appetite. The vet found no signs of anything serious.',
    fi: 'Maha ja suolisto ovat ärtyneet, mistä löysät ulosteet ja huono ruokahalu johtuvat. Eläinlääkäri ei löytänyt merkkejä vakavasta.',
    sv: 'Magen och tarmen är irriterade, vilket ger lös avföring och dålig aptit. Veterinären hittade inga tecken på något allvarligt.',
  }),
  homeCare: [
    tr({
      en: 'Give small portions of light food 3–4 times a day for 3 days.',
      fi: 'Anna pieniä annoksia kevyttä ruokaa 3–4 kertaa päivässä 3 päivän ajan.',
      sv: 'Ge små portioner lätt mat 3–4 gånger om dagen i 3 dagar.',
    }),
    tr({
      en: 'Keep fresh water available at all times.',
      fi: 'Pidä raikasta vettä aina saatavilla.',
      sv: 'Se till att färskt vatten alltid finns.',
    }),
    tr({
      en: 'Log appetite, stools and vomiting every day.',
      fi: 'Kirjaa ruokahalu, ulosteet ja oksentelu päivittäin.',
      sv: 'Logga aptit, avföring och kräkningar varje dag.',
    }),
  ],
  followUp: null,
  products: [],
  originalText: tr({
    en: 'Dx: mild gastroenteritis. Gen. condition good, no fever, abdomen soft. Tx: light diet 3 d, small portions. Control if vomiting or no improvement in 3 d.',
    fi: 'Dg: lievä gastroenteriitti. Yleistila hyvä, ei kuumetta, vatsa pehmeä. Hoito: kevyt ruokavalio 3 vrk, pienet annokset. Kontrolli jos oksentelee tai ei parane 3 vrk:ssa.',
    sv: 'Dg: lindrig gastroenterit. Gott allmäntillstånd, ingen feber, buken mjuk. Beh: lätt kost 3 d, små portioner. Kontroll vid kräkningar eller ingen förbättring på 3 d.',
  }),
};
