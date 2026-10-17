import type { Claim, Policy } from '@/types/insurance';

// Placeholder figures until the insurer's systems are connected.
export const mockPolicies: Policy[] = [
  { id: 'policy-mirri', petId: 'mirri', plan: 'Basic Protection', number: '[POLICY NO.]', coverLimit: 3000, usedThisYear: 412 },
  { id: 'policy-rekku', petId: 'rekku', plan: 'Premium Protection', number: '[POLICY NO.]', coverLimit: 5000, usedThisYear: 180 },
];

export const mockClaims: Claim[] = [
  {
    id: 'claim-mirri-uti',
    petId: 'mirri',
    title: 'Urinary tract infection',
    date: '2026-10-13',
    channel: 'directPayment',
    status: 'paid',
  },
  {
    id: 'claim-rekku-paw',
    petId: 'rekku',
    title: 'Paw injury',
    date: '2026-09-28',
    channel: 'receipt',
    status: 'inReview',
  },
];
