import { mockDelay } from '@/services/mock/delay';
import { mockPassports, mockShares } from '@/services/mock/passport';
import type { Passport, PassportSection, PassportShare } from '@/types/passport';
import { todayIso } from '@/utils/format';

// Health passport (spec 4). Backend: server/src/modules/passport. Mock only until
// the client signs in to the backend.

export const getPassport = async (petId: string): Promise<Passport | null> =>
  mockDelay(mockPassports.find((p) => p.petId === petId) ?? null);

export const getShares = async (petId?: string): Promise<PassportShare[]> =>
  mockDelay(mockShares.filter((s) => (!petId || s.petId === petId) && s.expiresAt > new Date().toISOString()));

export const createShare = async (
  petId: string,
  sections: PassportSection[],
  expiresInHours: number,
): Promise<PassportShare> => {
  const id = Math.random().toString(36).slice(2, 10);
  const share: PassportShare = {
    id,
    petId,
    url: `https://tassuvahti.example/p/${id}`,
    sections,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + expiresInHours * 3_600_000).toISOString(),
  };
  mockShares.push(share);
  return mockDelay(share);
};

export const stopShare = async (shareId: string): Promise<void> => {
  const index = mockShares.findIndex((s) => s.id === shareId);
  if (index >= 0) {
    mockShares.splice(index, 1);
  }
  return mockDelay(undefined);
};

/** Valid, due within 30 days, or expired */
export const vaccinationStatus = (validUntil: string, today = todayIso()) => {
  if (validUntil < today) return 'expired' as const;
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);
  return validUntil <= todayIso(soon) ? ('dueSoon' as const) : ('valid' as const);
};
