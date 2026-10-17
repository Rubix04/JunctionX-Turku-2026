import { mockClinics, mockProducts, mockStores } from '@/services/mock/clinics';
import { mockDelay } from '@/services/mock/delay';
import type { Clinic, Product, Store } from '@/types/clinic';
import { isOpenNow } from '@/utils/opening-hours';

// Contracted vets, emergency clinics and pet stores (spec 7 and 8). Mock only for now:
// the clinic registry and store chain APIs are not connected yet.

/** Open clinics first, then by distance */
const byOpenAndDistance = <T extends { distanceKm: number; hours: Clinic['hours']; emergency24h?: boolean }>(
  a: T,
  b: T,
) => Number(isOpenNow(b)) - Number(isOpenNow(a)) || a.distanceKm - b.distanceKm;

export const getClinics = async (): Promise<Clinic[]> => mockDelay([...mockClinics].sort(byOpenAndDistance));

export const getClinic = async (clinicId: string): Promise<Clinic> => {
  const clinic = mockClinics.find((c) => c.id === clinicId);
  if (!clinic) {
    throw new Error(`Clinic ${clinicId} not found`);
  }
  return mockDelay(clinic);
};

/** 24-hour emergency clinics, open and nearest first. Used without signing in. */
export const getEmergencyClinics = async (): Promise<Clinic[]> =>
  mockDelay(mockClinics.filter((c) => c.emergency24h).sort(byOpenAndDistance), 100);

export const getProduct = async (productId: string): Promise<Product | null> =>
  mockDelay(mockProducts.find((p) => p.id === productId) ?? null);

/** Stores that sell the product or the brand, nearest first */
export const getStoresForProduct = async (productId: string): Promise<Store[]> =>
  mockDelay(
    mockStores
      .map((store) => (store.stock[productId] ? store : { ...store, stock: { ...store.stock, [productId]: 'sellsBrand' as const } }))
      .sort((a, b) => a.distanceKm - b.distanceKm),
  );
