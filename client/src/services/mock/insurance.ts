import { AURORA } from '@/services/mock/clinics';
import { tr } from '@/services/mock/delay';
import type { Claim, Policy } from '@/types/insurance';

// Placeholder figures until the insurer's systems are connected.
export const mockPolicies: Policy[] = [
  { id: 'policy-mirri', petId: 'mirri', plan: tr({ en: 'Basic Protection', fi: 'Perusturva', sv: 'Grundskydd' }), number: 'TV-2026-048213', coverLimit: 3000, usedThisYear: 412 },
  { id: 'policy-rekku', petId: 'rekku', plan: tr({ en: 'Premium Protection', fi: 'Laajaturva', sv: 'Utökat skydd' }), number: 'TV-2026-051907', coverLimit: 5000, usedThisYear: 180 },
];

export const mockClaims: Claim[] = [
  {
    id: 'claim-mirri-uti',
    petId: 'mirri',
    title: tr({ en: 'Urinary tract infection', fi: 'Virtsatieinfektio', sv: 'Urinvägsinfektion' }),
    date: '2026-10-13',
    channel: 'directPayment',
    status: 'paid',
    amount: 286,
    clinicName: AURORA,
  },
  {
    id: 'claim-rekku-paw',
    petId: 'rekku',
    title: tr({ en: 'Paw injury', fi: 'Tassuvamma', sv: 'Tasskada' }),
    date: '2026-09-28',
    channel: 'receipt',
    status: 'inReview',
    amount: 154.5,
    clinicName: tr({ en: 'Animal Hospital Meri', fi: 'Eläinsairaala Meri', sv: 'Djursjukhuset Meri' }),
  },
];
