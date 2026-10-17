// Matches the backend's pet schema (server/src/modules/pets/schemas.ts).

export type Species = 'cat' | 'dog' | 'smallAnimal';

export type Pet = {
  id: string;
  name: string;
  species: Species;
  breed: string | null;
  /** ISO date, e.g. "2017-04-02" */
  birthDate: string | null;
  weightKg: number | null;
  /** Path of the profile picture (needs the access token), or null for the species default. */
  photoUrl: string | null;
};

export type CreatePetInput = {
  name: string;
  species: Species;
  breed?: string | null;
  birthDate?: string | null;
  weightKg?: number | null;
};

export type UpdatePetInput = Partial<CreatePetInput>;
