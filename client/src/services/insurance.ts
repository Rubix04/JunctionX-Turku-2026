import { useMockData } from '@/constants/config';
import { mockPets } from '@/services/mock/data';
import { mockDelay } from '@/services/mock/delay';
import { mockClaims, mockPolicies } from '@/services/mock/insurance';
import { getPets } from '@/services/pets';
import type { Claim, NewClaim, Policy } from '@/types/insurance';
import type { Pet } from '@/types/pet';

// Policies and claims. Will come from the insurance company's systems; mock only for now.
//
// The mock policies name the mock pets ("mirri", "rekku"). With the backend, pets have their own
// ids, so each policy is matched to the backend pet with the same name (the demo account has
// Mirri and Rekku). A policy whose pet isn't there is left out instead of showing without a name.

const mockPetName = (petId: string) => mockPets.find((p) => p.id === petId)?.name;

/** The pet a mock record belongs to: the same id, or with the backend the pet with the mock pet's name */
const resolvePetId = (petId: string, pets: Pet[]) =>
  pets.find((p) => p.id === petId)?.id ?? pets.find((p) => p.name === mockPetName(petId))?.id ?? null;

/** Mock records with their pet ids made to match the app's pets; records without a pet dropped */
const forCurrentPets = async <T extends { petId: string }>(records: T[]): Promise<T[]> => {
  if (useMockData) return records;
  const pets = await getPets();
  return records.flatMap((record) => {
    const petId = resolvePetId(record.petId, pets);
    return petId ? [{ ...record, petId }] : [];
  });
};

export const getPolicies = async (): Promise<Policy[]> => mockDelay(await forCurrentPets([...mockPolicies]));

/** Newest first */
export const getClaims = async (): Promise<Claim[]> =>
  mockDelay((await forCurrentPets([...mockClaims])).sort((a, b) => b.date.localeCompare(a.date)));

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

/**
 * A policy the insurer has for this customer that no pet page is linked to yet, e.g. a pet insured
 * before the app was taken into use. Null when every policy has its pet.
 */
export const getUnlinkedPolicy = async (petIds: string[]): Promise<Policy | null> => {
  // With the backend every shown policy already has its pet (see forCurrentPets).
  if (!useMockData) return mockDelay(null);
  return mockDelay(mockPolicies.find((p) => !petIds.includes(p.petId)) ?? null);
};

/** Links a policy to a pet page, so its cover and claims show for that pet. */
export const linkPolicy = async (policyId: string, petId: string): Promise<void> => {
  const policy = mockPolicies.find((p) => p.id === policyId);
  if (!policy) {
    throw new Error(`Policy ${policyId} not found`);
  }
  policy.petId = petId;
  return mockDelay(undefined);
};
