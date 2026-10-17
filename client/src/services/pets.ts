import { useMockData } from '@/constants/config';
import { apiFetch } from '@/services/api-client';
import { mockPets } from '@/services/mock/data';
import { mockDelay } from '@/services/mock/delay';
import type { CreatePetInput, Pet, UpdatePetInput } from '@/types/pet';

// Backend: server/src/modules/pets. Uses mock data when no API URL is set.

const findMockPet = (petId: string) => {
  const pet = mockPets.find((p) => p.id === petId);
  if (!pet) {
    throw new Error(`Pet ${petId} not found`);
  }
  return pet;
};

export const getPets = async (): Promise<Pet[]> => {
  if (useMockData) {
    return mockDelay([...mockPets]);
  }
  const { pets } = await apiFetch<{ pets: Pet[] }>('/pets');
  return pets;
};

export const getPet = async (petId: string): Promise<Pet> => {
  if (useMockData) {
    return mockDelay(findMockPet(petId));
  }
  return apiFetch<Pet>(`/pets/${petId}`);
};

export const createPet = async (input: CreatePetInput): Promise<Pet> => {
  if (useMockData) {
    const pet: Pet = {
      id: `pet-${Date.now()}`,
      breed: null,
      birthDate: null,
      weightKg: null,
      ...input,
      photoUrl: null,
    };
    mockPets.push(pet);
    return mockDelay(pet);
  }
  return apiFetch<Pet>('/pets', { method: 'POST', body: input });
};

export const updatePet = async (petId: string, input: UpdatePetInput): Promise<Pet> => {
  if (useMockData) {
    return mockDelay(Object.assign(findMockPet(petId), input));
  }
  return apiFetch<Pet>(`/pets/${petId}`, { method: 'PATCH', body: input });
};

export const deletePet = async (petId: string): Promise<void> => {
  if (useMockData) {
    mockPets.splice(mockPets.indexOf(findMockPet(petId)), 1);
    return mockDelay(undefined);
  }
  return apiFetch<void>(`/pets/${petId}`, { method: 'DELETE' });
};
