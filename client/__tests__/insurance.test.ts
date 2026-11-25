// With the backend, pets have the backend's ids, but the policies are still mock data that names
// the mock pets ("mirri", "rekku"). They must be matched to the backend pets, not shown nameless.

jest.mock('@/constants/config', () => ({ apiUrl: 'https://api.test', useMockData: false }));
jest.mock('@/services/pets', () => ({
  getPets: jest.fn(async () => [
    { id: 'uuid-mirri', name: 'Mirri', species: 'cat', breed: null, birthDate: null, weightKg: null, photoUrl: null },
    { id: 'uuid-rekku', name: 'Rekku', species: 'dog', breed: null, birthDate: null, weightKg: null, photoUrl: null },
  ]),
}));

import { getClaims, getPolicies, getUnlinkedPolicy } from '@/services/insurance';

describe('insurance with the backend', () => {
  it('links each policy to the backend pet with the same name', async () => {
    const policies = await getPolicies();
    expect(policies.map((p) => p.petId).sort()).toEqual(['uuid-mirri', 'uuid-rekku']);
  });

  it('links claims the same way', async () => {
    const claims = await getClaims();
    expect(claims.length).toBeGreaterThan(0);
    expect(claims.every((c) => c.petId.startsWith('uuid-'))).toBe(true);
  });

  it('never offers to link a policy to a new pet', async () => {
    expect(await getUnlinkedPolicy(['uuid-mirri'])).toBeNull();
  });
});
