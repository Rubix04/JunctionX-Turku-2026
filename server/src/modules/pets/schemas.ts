import { z } from "zod";

import { species } from "../../db/schema.js";

const isoDate = z.iso.date();

export const petSchema = z.object({
  id: z.string(),
  name: z.string(),
  species: z.enum(species),
  breed: z.string().nullable(),
  birthDate: isoDate.nullable(),
  weightKg: z.number().nullable(),
  /** Path of the profile picture (GET it with the access token), or null for the species default. */
  photoUrl: z.string().nullable(),
});

export const createPetSchema = z.object({
  name: z.string().trim().min(1).max(60),
  species: z.enum(species),
  breed: z.string().trim().max(80).nullish(),
  birthDate: isoDate.nullish(),
  weightKg: z.number().positive().max(150).nullish(),
});

export const updatePetSchema = createPetSchema.partial();

export const petParamsSchema = z.object({ petId: z.string() });

export type PetDto = z.infer<typeof petSchema>;
export type CreatePetInput = z.infer<typeof createPetSchema>;
export type UpdatePetInput = z.infer<typeof updatePetSchema>;
