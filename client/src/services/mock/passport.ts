import type { Passport, PassportShare } from '@/types/passport';

export const mockPassports: Passport[] = [
  {
    petId: 'mirri',
    microchip: '246098100234517',
    markings: 'Grey tabby, white chest and paws',
    registration: null,
    ownerName: 'Aino Virtanen',
    policyNumber: 'TV-2026-048213',
    sex: 'female',
    neutered: true,
    vaccinations: [
      {
        id: 'mirri-flu',
        name: 'Cat flu & panleukopenia',
        givenOn: '2026-03-02',
        validUntil: '2027-03-02',
        clinicName: 'Pet Clinic Aurora',
      },
    ],
    medications: [
      {
        id: 'mirri-antibiotic',
        name: 'Antibiotic',
        dosage: '1 tablet twice a day',
        startDate: '2026-10-13',
        endDate: '2026-10-23',
        reason: 'Urinary tract infection',
      },
    ],
    allergies: [],
    allergiesUpdatedOn: '2026-10-13',
    surgeries: [{ id: 'mirri-spay', name: 'Spaying', year: 2019 }],
    conditions: [
      { id: 'mirri-uti', name: 'Urinary tract infection', diagnosedOn: '2026-10-13', resolved: false },
      { id: 'mirri-dental', name: 'Mild gingivitis', diagnosedOn: '2025-03-10', resolved: true },
    ],
    labReports: [
      {
        id: 'mirri-urine',
        kind: 'urine',
        date: '2026-10-13',
        title: 'Urine test',
        summary: 'Bacteria and white blood cells found. No crystals.',
        clinicName: 'Pet Clinic Aurora',
      },
      {
        id: 'mirri-blood',
        kind: 'blood',
        date: '2026-03-02',
        title: 'Blood count and kidney values',
        summary: 'All values within normal range.',
        clinicName: 'Pet Clinic Aurora',
      },
    ],
  },
  {
    petId: 'rekku',
    microchip: '246098100771203',
    markings: 'Yellow, short coat',
    registration: 'FI28417/21 · Finnish Kennel Club',
    ownerName: 'Aino Virtanen',
    policyNumber: 'TV-2026-051907',
    sex: 'male',
    neutered: false,
    vaccinations: [
      {
        id: 'rekku-dhpp',
        name: 'Distemper, parvo & hepatitis',
        givenOn: '2025-11-07',
        validUntil: '2026-11-07',
        clinicName: 'Kaarina Dog Clinic',
      },
      {
        id: 'rekku-rabies',
        name: 'Rabies',
        givenOn: '2024-11-07',
        validUntil: '2027-11-07',
        clinicName: 'Kaarina Dog Clinic',
      },
    ],
    medications: [],
    allergies: [{ id: 'rekku-chicken', allergen: 'Chicken protein', severity: 'mild' }],
    allergiesUpdatedOn: '2025-11-07',
    surgeries: [],
    conditions: [{ id: 'rekku-paw', name: 'Paw pad injury', diagnosedOn: '2026-09-28', resolved: true }],
    labReports: [
      {
        id: 'rekku-xray',
        kind: 'xray',
        date: '2026-09-28',
        title: 'X-ray, front left paw',
        summary: 'No fracture. Soft tissue injury only.',
        clinicName: 'Kaarina Dog Clinic',
      },
      {
        id: 'rekku-ultrasound',
        kind: 'ultrasound',
        date: '2025-11-07',
        title: 'Abdominal ultrasound',
        summary: 'Normal findings. Checked because of an upset stomach.',
        clinicName: 'Kaarina Dog Clinic',
      },
    ],
  },
];

export const mockShares: PassportShare[] = [];
