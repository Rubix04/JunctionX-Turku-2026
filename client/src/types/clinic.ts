import type { Species } from '@/types/pet';

// Contracted vets, emergency clinics and pet stores (spec 7 and 8).
// The contracted clinic data will come from the insurance company's registry.

/** Opening hours for one weekday, "HH:MM". Null when closed. */
export type DayHours = { open: string; close: string } | null;

export type Clinic = {
  id: string;
  name: string;
  address: string;
  phone: string;
  /** Distance from the user, km. Comes from positioning later. */
  distanceKm: number;
  driveMinutes: number;
  /** Position on the schematic map, 0–1 */
  mapX: number;
  mapY: number;
  contracted: boolean;
  /** Settles the insurance claim directly with the insurer */
  directPayment: boolean;
  emergency24h: boolean;
  species: Species[];
  expertise: string[];
  /** Index 0 = Monday. Ignored when emergency24h. */
  hours: DayHours[];
  bookingUrl: string | null;
};

export type StockStatus = 'inStock' | 'lowStock' | 'outOfStock' | 'sellsBrand';

export type Store = {
  id: string;
  name: string;
  chain: string;
  kind: 'petStore' | 'pharmacy' | 'clinic';
  address: string;
  phone: string;
  distanceKm: number;
  mapX: number;
  mapY: number;
  hours: DayHours[];
  /** Product id -> stock, when the chain's API shares it */
  stock: Record<string, StockStatus>;
  onlineOrder: boolean;
  /** Commercial partnership with the insurer, always marked in the UI */
  partner: boolean;
};

export type Product = {
  id: string;
  name: string;
  brand: string;
};
