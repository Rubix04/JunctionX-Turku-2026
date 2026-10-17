import type { ImageSource } from 'expo-image';
import { Platform } from 'react-native';

import { apiUrl, useMockData } from '@/constants/config';
import { apiFetch, getAccessToken } from '@/services/api-client';
import { mockPets } from '@/services/mock/data';
import { mockDelay } from '@/services/mock/delay';
import type { Pet } from '@/types/pet';

// Backend: server/src/modules/pet-photos. The server crops (optionally), resizes to 512×512 and
// strips location data. Pictures are private to the household, so loading one needs the token.

/** Crop area in pixels of the original image, e.g. from an image editor. */
export type PhotoCrop = { x: number; y: number; width: number; height: number };

/**
 * Image source for a pet's photoUrl, for expo-image. The server returns a path that needs the
 * access token; in mock mode photoUrl is a local file. Null means: show the species default.
 */
export const petPhotoSource = (photoUrl: string | null | undefined): ImageSource | null => {
  if (!photoUrl) {
    return null;
  }
  if (photoUrl.startsWith('/') && apiUrl) {
    const token = getAccessToken();
    return { uri: `${apiUrl}${photoUrl}`, headers: token ? { Authorization: `Bearer ${token}` } : undefined };
  }
  return { uri: photoUrl };
};

/**
 * Uploads a picture from the camera or gallery (a local file URI, e.g. from expo-image-picker)
 * and returns the updated pet. Replacing a picture deletes the old one on the server.
 */
export const uploadPetPhoto = async (petId: string, localUri: string, crop?: PhotoCrop): Promise<Pet> => {
  if (useMockData) {
    const pet = mockPets.find((p) => p.id === petId);
    if (!pet) {
      throw new Error(`Pet ${petId} not found`);
    }
    pet.photoUrl = localUri;
    return mockDelay({ ...pet }, 600);
  }

  const form = new FormData();
  if (crop) {
    form.append('cropX', String(Math.round(crop.x)));
    form.append('cropY', String(Math.round(crop.y)));
    form.append('cropWidth', String(Math.round(crop.width)));
    form.append('cropHeight', String(Math.round(crop.height)));
  }
  if (Platform.OS === 'web') {
    const blob = await (await fetch(localUri)).blob();
    form.append('photo', blob, 'photo.jpg');
  } else {
    // React Native's FormData sends a local file from { uri, name, type }.
    form.append('photo', { uri: localUri, name: 'photo.jpg', type: 'image/jpeg' } as unknown as Blob);
  }
  return apiFetch<Pet>(`/pets/${petId}/photo`, { method: 'PUT', body: form });
};

/** Removes the picture (the pet goes back to the species default) and deletes the file. */
export const deletePetPhoto = async (petId: string): Promise<void> => {
  if (useMockData) {
    const pet = mockPets.find((p) => p.id === petId);
    if (pet) {
      pet.photoUrl = null;
    }
    return mockDelay(undefined);
  }
  await apiFetch<void>(`/pets/${petId}/photo`, { method: 'DELETE' });
};
