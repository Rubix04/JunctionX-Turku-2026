import type { Passport, PassportShare } from '@/types/passport';

export const mockPassports: Passport[] = [
  {
    petId: 'mirri',
    microchip: '[CHIP NUMBER]',
    ownerName: 'Aino Virtanen',
    policyNumber: '[POLICY NO.]',
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
  },
  {
    petId: 'rekku',
    microchip: '[CHIP NUMBER]',
    ownerName: 'Aino Virtanen',
    policyNumber: '[POLICY NO.]',
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
  },
];

export const mockShares: PassportShare[] = [];
