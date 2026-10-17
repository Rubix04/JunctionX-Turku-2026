import type { CarePlan, MedicationCourse, Reminder, Visit } from '@/types/care';
import type { DailyLog, LogQuestion, WatchList } from '@/types/health';
import type { Pet } from '@/types/pet';

// Demo data from the design mockups: Mirri is recovering from a urinary tract
// infection (yellow), Rekku has no watch list (green). Texts are placeholders
// until vet-reviewed content comes from the backend.

export const mockPets: Pet[] = [
  {
    id: 'mirri',
    name: 'Mirri',
    species: 'cat',
    breed: 'Domestic shorthair',
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

export const mockWatchLists: WatchList[] = [
  {
    petId: 'mirri',
    condition: 'Urinary tract infection',
    vetName: 'Dr. Laine',
    startDate: '2026-10-14',
    totalDays: 10,
    questions: [
      {
        id: 'water',
        label: 'Water intake',
        options: ['Less', 'Usual', 'More'],
        yellowIf: [0, 2],
        redIf: [],
      },
      {
        id: 'litter',
        label: 'Litter box trips',
        options: ['Fewer', 'Usual', 'More'],
        yellowIf: [0, 2],
        redIf: [],
      },
      {
        id: 'straining',
        label: 'Straining to urinate',
        options: ['No', 'A little', 'No urine'],
        yellowIf: [1],
        redIf: [2],
      },
    ],
    yellowAdvice: [
      'Fill the water bowl to a mark in the morning and check it in the evening.',
      'Log litter box trips again tonight, in more detail.',
    ],
    redWhen: 'she strains without passing urine. Then contact a vet straight away.',
    redReason:
      'Straining without passing urine can mean a blocked urinary tract. Your vet listed this as a reason to call right away.',
  },
];

// Asked on every daily log, with or without a watch list.
export const mockGeneralQuestions: LogQuestion[] = [
  { id: 'appetite', label: 'Appetite', options: ['Low', 'Usual', 'High'], yellowIf: [0], redIf: [] },
  { id: 'energy', label: 'Energy', options: ['Low', 'Usual', 'High'], yellowIf: [0], redIf: [] },
  { id: 'pain', label: 'Pain', options: ['None', 'Some', 'Clear'], yellowIf: [1, 2], redIf: [] },
  {
    id: 'vomiting',
    label: 'Vomiting',
    options: ['No', 'Once', 'Repeated'],
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
    title: 'Urinary tract infection',
    clinicName: 'Pet Clinic Aurora',
    vetName: 'Dr. Laine',
  },
  {
    id: 'visit-mirri-annual',
    petId: 'mirri',
    date: '2026-03-02',
    title: 'Annual check-up & vaccines',
    clinicName: 'Pet Clinic Aurora',
    vetName: null,
  },
];

export const mockCarePlans: CarePlan[] = [
  {
    petId: 'mirri',
    visitId: 'visit-mirri-uti',
    diagnosis: 'Urinary tract infection',
    clinicName: 'Pet Clinic Aurora',
    vetName: 'Dr. Laine',
    checkedByClinic: true,
    findings:
      "Bacteria in Mirri's urine are irritating her bladder. That is why she visits the litter box often and passes only small amounts.",
    homeCare: [
      'Give the antibiotic morning and evening for 10 days, even if she seems better.',
      'Help her drink: fresh water in several places, and wet food.',
      'Log water, litter box trips and straining every day.',
    ],
    followUp: {
      title: 'Check-up and urine test',
      dateTime: '2026-10-22T14:30:00',
      clinicName: 'Pet Clinic Aurora',
    },
    products: [
      {
        productId: 'urinary-wet',
        name: 'Urinary care wet food',
        brand: 'Vet Diet · Urinary S/O',
        prescription: null,
      },
      {
        productId: 'antibiotic',
        name: 'Antibiotic',
        brand: '',
        prescription: { issuedTo: 'Pet Clinic Aurora', pickedUpOn: '2026-10-13' },
      },
    ],
    originalText:
      'Dg: cystitis bacterialis. U-sticks: leuk +++, ery ++, nitrite +. Sediment: bacteria, no crystals. Tx: amoxicillin/clavulanate 50 mg 1x2 p.o. 10 d. Wet urinary diet, increase water intake. Control 22.10. if no improvement.',
  },
];

export const mockMedicationCourses: MedicationCourse[] = [
  {
    petId: 'mirri',
    name: 'Antibiotic',
    dosesTotal: 20,
    dosesGiven: 6,
    startDate: '2026-10-14',
    totalDays: 10,
  },
];

export const mockReminders: Reminder[] = [
  {
    id: 'mirri-antibiotic-am',
    petId: 'mirri',
    kind: 'medication',
    title: 'Antibiotic',
    detail: '1 tablet · with food',
    dueAt: '2026-10-17T08:00:00',
    done: true,
  },
  {
    id: 'mirri-antibiotic-pm',
    petId: 'mirri',
    kind: 'medication',
    title: 'Antibiotic',
    detail: '1 tablet · with food',
    dueAt: '2026-10-17T20:00:00',
    done: false,
  },
  {
    id: 'mirri-follow-up',
    petId: 'mirri',
    kind: 'visit',
    title: 'Follow-up visit',
    detail: 'Pet Clinic Aurora',
    dueAt: '2026-10-22T14:30:00',
    done: false,
  },
  {
    id: 'rekku-vaccination',
    petId: 'rekku',
    kind: 'vaccination',
    title: 'Yearly vaccination',
    detail: 'Book a time',
    dueAt: '2026-11-07T00:00:00',
    done: false,
  },
  {
    id: 'rekku-deworming',
    petId: 'rekku',
    kind: 'deworming',
    title: 'Deworming',
    detail: '',
    dueAt: '2026-12-01T00:00:00',
    done: false,
  },
];
