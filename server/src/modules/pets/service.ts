import { randomUUID } from "node:crypto";

import { and, asc, eq } from "drizzle-orm";

import type { Db } from "../../db/client.js";
import { type PetRow, pets } from "../../db/schema.js";
import { notFound } from "../../errors.js";
import type { CreatePetInput, PetDto, UpdatePetInput } from "./schemas.js";

export const toPetDto = (row: PetRow): PetDto => ({
  id: row.id,
  name: row.name,
  species: row.species,
  breed: row.breed,
  birthDate: row.birthDate,
  weightKg: row.weightKg,
  // The version parameter changes with every new picture, so clients can cache by URL.
  photoUrl: row.photoKey ? `/pets/${row.id}/photo?v=${row.photoKey.slice(0, 8)}` : null,
});

export const listPets = (db: Db, householdId: string) =>
  db.select().from(pets).where(eq(pets.householdId, householdId)).orderBy(asc(pets.createdAt)).all();

/** Returns the pet if it belongs to the household, otherwise throws 404. */
export const getPet = (db: Db, householdId: string, petId: string): PetRow => {
  const row = db
    .select()
    .from(pets)
    .where(and(eq(pets.id, petId), eq(pets.householdId, householdId)))
    .get();
  if (!row) {
    throw notFound("PET_NOT_FOUND", "No such pet in this household");
  }
  return row;
};

export const createPet = (db: Db, householdId: string, input: CreatePetInput): PetRow =>
  db
    .insert(pets)
    .values({
      id: randomUUID(),
      householdId,
      name: input.name,
      species: input.species,
      breed: input.breed ?? null,
      birthDate: input.birthDate ?? null,
      weightKg: input.weightKg ?? null,
    })
    .returning()
    .get();

export const updatePet = (db: Db, householdId: string, petId: string, input: UpdatePetInput): PetRow => {
  getPet(db, householdId, petId);
  return db.update(pets).set(input).where(eq(pets.id, petId)).returning().get();
};

/** Deletes the pet and returns the deleted row, so the caller can clean up its files. */
export const deletePet = (db: Db, householdId: string, petId: string): PetRow => {
  const pet = getPet(db, householdId, petId);
  db.delete(pets).where(eq(pets.id, petId)).run();
  return pet;
};
