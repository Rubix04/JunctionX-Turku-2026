import { AURORA, KAARINA } from '@/services/mock/clinics';
import { tr } from '@/services/mock/delay';
import { demoDate } from '@/services/mock/demo-date';
import type { Passport, PassportShare } from '@/types/passport';

const UTI = tr({ en: 'Urinary tract infection', fi: 'Virtsatieinfektio', sv: 'Urinvägsinfektion' });

export const mockPassports: Passport[] = [
  {
    petId: 'mirri',
    microchip: '246098100234517',
    markings: tr({
      en: 'Grey tabby, white chest and paws',
      fi: 'Harmaa tiikerikuvioinen, valkoinen rinta ja tassut',
      sv: 'Grå tigrerad, vitt bröst och vita tassar',
    }),
    registration: null,
    ownerName: 'Aino Virtanen',
    policyNumber: 'TV-2026-048213',
    sex: 'female',
    neutered: true,
    vaccinations: [
      {
        id: 'mirri-flu',
        name: tr({ en: 'Cat flu & panleukopenia', fi: 'Kissanflunssa ja kissarutto', sv: 'Kattsnuva och kattpest' }),
        givenOn: demoDate('2026-03-02'),
        validUntil: demoDate('2027-03-02'),
        clinicName: AURORA,
      },
    ],
    medications: [
      {
        id: 'mirri-antibiotic',
        name: tr({ en: 'Antibiotic', fi: 'Antibiootti', sv: 'Antibiotika' }),
        dosage: tr({ en: '1 tablet twice a day', fi: '1 tabletti 2 kertaa päivässä', sv: '1 tablett 2 gånger om dagen' }),
        startDate: demoDate('2026-10-13'),
        endDate: demoDate('2026-10-23'),
        reason: UTI,
      },
    ],
    allergies: [],
    allergiesUpdatedOn: demoDate('2026-10-13'),
    surgeries: [{ id: 'mirri-spay', name: tr({ en: 'Spaying', fi: 'Sterilointi', sv: 'Kastrering' }), year: 2019 }],
    conditions: [
      { id: 'mirri-uti', name: UTI, diagnosedOn: demoDate('2026-10-13'), resolved: false },
      {
        id: 'mirri-dental',
        name: tr({ en: 'Mild gingivitis', fi: 'Lievä ientulehdus', sv: 'Lindrig tandköttsinflammation' }),
        diagnosedOn: demoDate('2025-03-10'),
        resolved: true,
      },
    ],
    labReports: [
      {
        id: 'mirri-urine',
        kind: 'urine',
        date: demoDate('2026-10-13'),
        title: tr({ en: 'Urine test', fi: 'Virtsakoe', sv: 'Urinprov' }),
        summary: tr({
          en: 'Bacteria and white blood cells found. No crystals.',
          fi: 'Löydettiin bakteereja ja valkosoluja. Ei kiteitä.',
          sv: 'Bakterier och vita blodkroppar hittades. Inga kristaller.',
        }),
        clinicName: AURORA,
      },
      {
        id: 'mirri-blood',
        kind: 'blood',
        date: demoDate('2026-03-02'),
        title: tr({ en: 'Blood count and kidney values', fi: 'Verenkuva ja munuaisarvot', sv: 'Blodstatus och njurvärden' }),
        summary: tr({
          en: 'All values within normal range.',
          fi: 'Kaikki arvot viitealueella.',
          sv: 'Alla värden inom normalområdet.',
        }),
        clinicName: AURORA,
      },
    ],
  },
  {
    petId: 'rekku',
    microchip: '246098100771203',
    markings: tr({ en: 'Yellow, short coat', fi: 'Keltainen, lyhytkarvainen', sv: 'Gul, korthårig' }),
    registration: tr({
      en: 'FI28417/21 · Finnish Kennel Club',
      fi: 'FI28417/21 · Suomen Kennelliitto',
      sv: 'FI28417/21 · Finska Kennelklubben',
    }),
    ownerName: 'Aino Virtanen',
    policyNumber: 'TV-2026-051907',
    sex: 'male',
    neutered: false,
    vaccinations: [
      {
        id: 'rekku-dhpp',
        name: tr({
          en: 'Distemper, parvo & hepatitis',
          fi: 'Penikkatauti, parvo ja hepatiitti',
          sv: 'Valpsjuka, parvo och hepatit',
        }),
        givenOn: demoDate('2025-11-07'),
        validUntil: demoDate('2026-11-07'),
        clinicName: KAARINA,
      },
      {
        id: 'rekku-rabies',
        name: tr({ en: 'Rabies', fi: 'Raivotauti', sv: 'Rabies' }),
        givenOn: demoDate('2024-11-07'),
        validUntil: demoDate('2027-11-07'),
        clinicName: KAARINA,
      },
    ],
    medications: [],
    allergies: [
      {
        id: 'rekku-chicken',
        allergen: tr({ en: 'Chicken protein', fi: 'Kanaproteiini', sv: 'Kycklingprotein' }),
        severity: 'mild',
      },
    ],
    allergiesUpdatedOn: demoDate('2025-11-07'),
    surgeries: [],
    conditions: [
      {
        id: 'rekku-paw',
        name: tr({ en: 'Paw pad injury', fi: 'Anturavamma', sv: 'Trampdynsskada' }),
        diagnosedOn: demoDate('2026-09-28'),
        resolved: true,
      },
    ],
    labReports: [
      {
        id: 'rekku-xray',
        kind: 'xray',
        date: demoDate('2026-09-28'),
        title: tr({ en: 'X-ray, front left paw', fi: 'Röntgen, vasen etutassu', sv: 'Röntgen, vänster framtass' }),
        summary: tr({
          en: 'No fracture. Soft tissue injury only.',
          fi: 'Ei murtumaa. Vain pehmytkudosvamma.',
          sv: 'Ingen fraktur. Endast mjukdelsskada.',
        }),
        clinicName: KAARINA,
      },
      {
        id: 'rekku-ultrasound',
        kind: 'ultrasound',
        date: demoDate('2025-11-07'),
        title: tr({ en: 'Abdominal ultrasound', fi: 'Vatsan ultraääni', sv: 'Ultraljud av buken' }),
        summary: tr({
          en: 'Normal findings. Checked because of an upset stomach.',
          fi: 'Normaalit löydökset. Tutkittiin vatsavaivojen vuoksi.',
          sv: 'Normala fynd. Undersöktes på grund av magbesvär.',
        }),
        clinicName: KAARINA,
      },
    ],
  },
];

export const mockShares: PassportShare[] = [];
