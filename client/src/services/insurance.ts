import { mockDelay } from '@/services/mock/delay';
import { mockClaims, mockPolicies } from '@/services/mock/insurance';
import type { Claim, Policy } from '@/types/insurance';

// Policies and claims. Will come from the insurance company's systems; mock only for now.

export const getPolicies = async (): Promise<Policy[]> => mockDelay([...mockPolicies]);

/** Newest first */
export const getClaims = async (): Promise<Claim[]> =>
  mockDelay([...mockClaims].sort((a, b) => b.date.localeCompare(a.date)));

export const createClaim = async (petId: string, title: string): Promise<Claim> => {
  const claim: Claim = {
    id: `claim-${Date.now()}`,
    petId,
    title,
    date: new Date().toISOString().slice(0, 10),
    channel: 'receipt',
    status: 'inReview',
  };
  mockClaims.push(claim);
  return mockDelay(claim);
};
