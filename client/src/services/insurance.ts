import { mockDelay } from '@/services/mock/delay';
import { mockClaims, mockPolicies } from '@/services/mock/insurance';
import type { Claim, NewClaim, Policy } from '@/types/insurance';

// Policies and claims. Will come from the insurance company's systems; mock only for now.

export const getPolicies = async (): Promise<Policy[]> => mockDelay([...mockPolicies]);

/** Newest first */
export const getClaims = async (): Promise<Claim[]> =>
  mockDelay([...mockClaims].sort((a, b) => b.date.localeCompare(a.date)));

/** Sends a claim with its receipts. It starts "in review"; the insurer may ask for more information. */
export const createClaim = async (input: NewClaim): Promise<Claim> => {
  const claim: Claim = {
    id: `claim-${Date.now()}`,
    petId: input.petId,
    title: input.title,
    date: input.treatmentDate,
    channel: 'receipt',
    status: 'inReview',
    amount: input.amount,
    clinicName: input.clinicName,
  };
  mockClaims.push(claim);
  return mockDelay(claim, 900);
};
