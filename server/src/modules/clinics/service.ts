import type { Species } from "../../db/schema.js";
import { helsinkiLocal } from "../care/time.js";
import { type ClinicRegistry, clinicRegistry, type DayHours, type RegistryClinic } from "./content.js";

export type Language = "fi" | "sv" | "en";
export type Location = { latitude: number; longitude: number };

const EARTH_RADIUS_KM = 6371;

/** Straight-line distance in km. */
export const distanceKm = (a: Location, b: Location) => {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
};

/**
 * Rough driving time: roads are about 1.3× the straight line, at an average 40 km/h in town,
 * plus a couple of minutes to get going. A real routing service can replace this.
 */
export const driveMinutes = (km: number) => Math.round(2 + ((km * 1.3) / 40) * 60);

const minutesOf = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

/** Monday = 0 and the minute of the day, in Finnish time. */
const finnishClock = (now: number) => {
  const local = helsinkiLocal(now);
  const weekday = (new Date(`${local.slice(0, 10)}T12:00:00Z`).getUTCDay() + 6) % 7;
  return { weekday, minute: minutesOf(local.slice(11, 16)) };
};

const isOpenAt = (hours: DayHours, minute: number) =>
  hours !== null && minute >= minutesOf(hours.open) && minute < minutesOf(hours.close);

/** Open now, today's hours, and when it next opens or closes. */
export const openingStatus = (clinic: RegistryClinic, now = Date.now()) => {
  const { weekday, minute } = finnishClock(now);
  const today = clinic.hours[weekday];
  if (clinic.emergency24h) {
    return { openNow: true, hoursToday: today, closesAt: null, opensAt: null };
  }
  if (isOpenAt(today, minute)) {
    return { openNow: true, hoursToday: today, closesAt: today!.close, opensAt: null };
  }
  // The next opening: later today, or the first open day after it.
  for (let offset = 0; offset < 7; offset++) {
    const hours = clinic.hours[(weekday + offset) % 7];
    if (hours && (offset > 0 || minute < minutesOf(hours.open))) {
      return { openNow: false, hoursToday: today, closesAt: null, opensAt: { daysFromToday: offset, time: hours.open } };
    }
  }
  return { openNow: false, hoursToday: today, closesAt: null, opensAt: null };
};

export type ClinicFilters = {
  openNow?: boolean;
  emergency?: boolean;
  contracted?: boolean;
  species?: Species;
  expertise?: string;
  maxKm?: number;
};

/**
 * Positions on the app's schematic map (0–1, north up): the user and the clinics are fitted
 * into the square with a margin, keeping east–west and north–south distances in proportion.
 */
const mapPositions = (points: Location[]) => {
  const MARGIN = 0.08;
  // Longitude degrees are shorter than latitude degrees this far north.
  const xScale = Math.cos((points[0].latitude * Math.PI) / 180);
  const xs = points.map((p) => p.longitude * xScale);
  const ys = points.map((p) => p.latitude);
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) || 1;
  const midX = (Math.max(...xs) + Math.min(...xs)) / 2;
  const midY = (Math.max(...ys) + Math.min(...ys)) / 2;
  const scale = (1 - 2 * MARGIN) / span;
  const round = (v: number) => Math.round(v * 1000) / 1000;
  return points.map((_, i) => ({
    mapX: round(0.5 + (xs[i] - midX) * scale),
    mapY: round(0.5 - (ys[i] - midY) * scale),
  }));
};

const toClinicDto = (
  clinic: RegistryClinic,
  km: number,
  position: { mapX: number; mapY: number },
  lang: Language,
  now: number,
  registry: ClinicRegistry,
) => ({
  id: clinic.id,
  name: clinic.name,
  address: clinic.address,
  phone: clinic.phone,
  latitude: clinic.latitude,
  longitude: clinic.longitude,
  distanceKm: Math.round(km * 10) / 10,
  /** Estimated */
  driveMinutes: driveMinutes(km),
  ...position,
  contracted: clinic.contracted,
  directPayment: clinic.directPayment,
  emergency24h: clinic.emergency24h,
  species: clinic.species,
  expertise: clinic.expertise.map((id) => registry.expertise[id][lang]),
  expertiseIds: clinic.expertise,
  hours: clinic.hours,
  bookingUrl: clinic.bookingUrl,
  ...openingStatus(clinic, now),
});

export type ClinicDto = ReturnType<typeof toClinicDto>;

/**
 * Clinics matching the filters, open ones first, then by distance. Contracted clinics are
 * marked; others are included unless `contracted` is set (spec 7: shown separately).
 */
export const findClinics = (
  where: Location | null,
  filters: ClinicFilters,
  lang: Language,
  now = Date.now(),
  registry: ClinicRegistry = clinicRegistry,
) => {
  const location = where ?? registry.defaultLocation;
  const matching = registry.clinics
    .map((clinic) => ({ clinic, km: distanceKm(location, clinic), open: openingStatus(clinic, now).openNow }))
    .filter(
      ({ clinic, km, open }) =>
        (!filters.openNow || open) &&
        (!filters.emergency || clinic.emergency24h) &&
        (!filters.contracted || clinic.contracted) &&
        (!filters.species || clinic.species.includes(filters.species)) &&
        (!filters.expertise || clinic.expertise.includes(filters.expertise)) &&
        (filters.maxKm === undefined || km <= filters.maxKm),
    )
    .sort((a, b) => Number(b.open) - Number(a.open) || a.km - b.km);

  // The map always fits the user and every clinic, so pins don't jump when filters change.
  const positions = mapPositions([location, ...registry.clinics]);
  const positionOf = new Map(registry.clinics.map((clinic, i) => [clinic.id, positions[i + 1]]));

  return {
    location: {
      latitude: location.latitude,
      longitude: location.longitude,
      /** "default" when the phone didn't share its location: distances are from the city centre */
      source: where ? ("device" as const) : ("default" as const),
      mapX: positions[0].mapX,
      mapY: positions[0].mapY,
    },
    registry: { status: registry.meta.status, updatedOn: registry.meta.updatedOn },
    clinics: matching.map(({ clinic, km }) => toClinicDto(clinic, km, positionOf.get(clinic.id)!, lang, now, registry)),
  };
};

export const expertiseList = (lang: Language, registry: ClinicRegistry = clinicRegistry) =>
  Object.entries(registry.expertise).map(([id, label]) => ({
    id,
    label: label[lang],
    count: registry.clinics.filter((c) => c.expertise.includes(id)).length,
  }));
