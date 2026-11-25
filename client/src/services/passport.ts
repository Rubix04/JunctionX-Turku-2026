import { useMockData } from '@/constants/config';
import { apiFetch } from '@/services/api-client';
import { mockDelay } from '@/services/mock/delay';
import { mockPassports, mockShares } from '@/services/mock/passport';
import type { Allergy, LabReportKind, Passport, PassportSection, PassportShare } from '@/types/passport';
import { currentLanguage, todayIso } from '@/utils/format';

// Health passport (spec 4). Backend: server/src/modules/passport. Besides the records it returns
// the pet's identity (microchip, markings, sex, owner), the diagnoses and the lab results.

type ApiPassport = {
  pet: { id: string };
  vaccinations: { id: string; name: string; givenOn: string; validUntil: string | null; clinic: string | null }[];
  medications: {
    id: string;
    name: string;
    dosage: string | null;
    startDate: string;
    endDate: string | null;
    notes: string | null;
  }[];
  allergies: { id: string; allergen: string; severity: Allergy['severity']; notedOn: string | null }[];
  surgeries: { id: string; name: string; performedOn: string }[];
  profile: {
    microchip: string | null;
    markings: string | null;
    registration: string | null;
    sex: 'female' | 'male' | null;
    neutered: boolean | null;
    ownerName: string | null;
    conditions: { id: string; name: string; diagnosedOn: string; resolved: boolean }[];
  };
  labs: {
    id: string;
    kind: LabReportKind | 'other';
    takenOn: string;
    title: string;
    summary: string | null;
    clinic: string | null;
  }[];
};

const toPassport = (api: ApiPassport): Passport => ({
  petId: api.pet.id,
  microchip: api.profile.microchip,
  markings: api.profile.markings,
  registration: api.profile.registration,
  ownerName: api.profile.ownerName,
  // Insurance is mock only, so the backend has no policy number.
  policyNumber: null,
  sex: api.profile.sex,
  neutered: api.profile.neutered ?? false,
  vaccinations: api.vaccinations.map((v) => ({
    id: v.id,
    name: v.name,
    givenOn: v.givenOn,
    validUntil: v.validUntil,
    clinicName: v.clinic ?? '',
  })),
  medications: api.medications.map((m) => ({
    id: m.id,
    name: m.name,
    dosage: m.dosage,
    startDate: m.startDate,
    endDate: m.endDate,
    reason: m.notes,
  })),
  allergies: api.allergies.map((a) => ({ id: a.id, allergen: a.allergen, severity: a.severity })),
  allergiesUpdatedOn:
    api.allergies
      .map((a) => a.notedOn)
      .filter((date): date is string => Boolean(date))
      .sort()
      .at(-1) ?? null,
  surgeries: api.surgeries.map((s) => ({ id: s.id, name: s.name, year: Number(s.performedOn.slice(0, 4)) })),
  conditions: api.profile.conditions,
  labReports: api.labs.map((l) => ({
    id: l.id,
    // The app has no "other" kind yet; it shows those like a blood test.
    kind: l.kind === 'other' ? 'blood' : l.kind,
    date: l.takenOn,
    title: l.title,
    summary: l.summary ?? '',
    clinicName: l.clinic ?? '',
  })),
});

export const getPassport = async (petId: string): Promise<Passport | null> => {
  if (!useMockData) {
    return toPassport(await apiFetch<ApiPassport>(`/pets/${petId}/passport`));
  }
  return mockDelay(mockPassports.find((p) => p.petId === petId) ?? null);
};

type ApiCreatedShare = { id: string; sections: PassportSection[]; createdAt: number; expiresAt: number; url: string };

/**
 * A time-limited link for a vet. With the backend the link is real: the server makes the token and
 * the page the vet opens. The daily logs can't be shared through the backend yet.
 */
export const createShare = async (
  petId: string,
  sections: PassportSection[],
  expiresInHours: number,
): Promise<PassportShare> => {
  if (!useMockData) {
    const share = await apiFetch<ApiCreatedShare>(`/pets/${petId}/passport/shares`, {
      method: 'POST',
      body: {
        recipientType: 'vet',
        sections: sections.filter((s) => s !== 'logs'),
        language: currentLanguage(),
        expiresInHours,
      },
    });
    return {
      id: share.id,
      petId,
      url: share.url,
      sections: share.sections,
      createdAt: new Date(share.createdAt).toISOString(),
      expiresAt: new Date(share.expiresAt).toISOString(),
    };
  }
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

/** Stops a link at once; the vet sees "expired" after that. */
export const stopShare = async (petId: string, shareId: string): Promise<void> => {
  if (!useMockData) {
    await apiFetch<void>(`/pets/${petId}/passport/shares/${shareId}`, { method: 'DELETE' });
    return;
  }
  const index = mockShares.findIndex((s) => s.id === shareId);
  if (index >= 0) {
    mockShares.splice(index, 1);
  }
  return mockDelay(undefined);
};

/** Valid, due within 30 days, expired, or valid for good (no end date) */
export const vaccinationStatus = (validUntil: string | null, today = todayIso()) => {
  if (!validUntil) return 'noExpiry' as const;
  if (validUntil < today) return 'expired' as const;
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);
  return validUntil <= todayIso(soon) ? ('dueSoon' as const) : ('valid' as const);
};

/** Translation key for the pet's sex, e.g. "pet.sex.femaleNeutered", or null when not known */
export const sexKey = (passport: Pick<Passport, 'sex' | 'neutered'>) =>
  passport.sex ? `pet.sex.${passport.sex}${passport.neutered ? 'Neutered' : ''}` : null;
