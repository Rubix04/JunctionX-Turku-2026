import { Platform } from 'react-native';

import { useMockData } from '@/constants/config';
import { apiFetch } from '@/services/api-client';
import {
  mockCarePlans,
  mockMedicationCourses,
  mockReminders,
  mockScanSample,
  mockVisits,
} from '@/services/mock/data';
import { mockDelay } from '@/services/mock/delay';
import type { CarePlan, MedicationCourse, Reminder, ScannedVisit, Visit, VisitNotesInput } from '@/types/care';
import { currentLanguage, todayIso } from '@/utils/format';

// Visits, care plans and reminders. Visits, care plans and reading vet documents use the backend
// (server/src/modules/care and visit-scan) when an API URL is set; the rest is mock only.

/** The backend's care plan: vetName and productId may be null there. */
type ApiCarePlan = Omit<CarePlan, 'vetName' | 'products'> & {
  vetName: string | null;
  products: (Omit<CarePlan['products'][number], 'productId'> & { productId: string | null })[];
};

const toCarePlan = (plan: ApiCarePlan): CarePlan => ({
  petId: plan.petId,
  visitId: plan.visitId,
  diagnosis: plan.diagnosis,
  clinicName: plan.clinicName,
  vetName: plan.vetName ?? '',
  checkedByClinic: plan.checkedByClinic,
  findings: plan.findings,
  homeCare: plan.homeCare,
  followUp: plan.followUp,
  products: plan.products.map((p) => ({ ...p, productId: p.productId ?? '' })),
  originalText: plan.originalText,
});

/** Newest first */
export const getVisits = async (petId: string): Promise<Visit[]> => {
  if (!useMockData) {
    const { visits } = await apiFetch<{ visits: Visit[] }>(`/pets/${petId}/visits`);
    return visits;
  }
  return mockDelay(
    mockVisits.filter((v) => v.petId === petId).sort((a, b) => b.date.localeCompare(a.date)),
  );
};

/** The care plan from the pet's latest visit, or null */
export const getCarePlan = async (petId: string): Promise<CarePlan | null> => {
  if (!useMockData) {
    const { carePlan } = await apiFetch<{ carePlan: ApiCarePlan | null }>(`/pets/${petId}/care-plan`);
    return carePlan ? toCarePlan(carePlan) : null;
  }
  return mockDelay(mockCarePlans.find((p) => p.petId === petId) ?? null);
};

/**
 * Reads a vet document (photo, PDF or pasted text) into a draft visit and care plan. The backend
 * uses AI (Claude) when it has an API key, otherwise a sample result. The plan stays a draft
 * until the clinic checks it.
 */
export const scanVisitNotes = async (petId: string, input: VisitNotesInput): Promise<ScannedVisit> => {
  if (useMockData) {
    // The same neutral sample for every pet (not another pet's real plan), dated today in local time.
    const sample = mockScanSample;
    const visit: Visit = {
      id: `visit-${Date.now()}`,
      petId,
      date: todayIso(),
      title: sample.diagnosis,
      clinicName: sample.clinicName,
      vetName: sample.vetName,
      draft: true,
    };
    const carePlan: CarePlan = { ...sample, petId, visitId: visit.id, checkedByClinic: false };
    mockVisits.push(visit);
    // First in the list, so getCarePlan finds this one.
    mockCarePlans.unshift(carePlan);
    return mockDelay({ source: 'sample', visit, carePlan, procedures: [], uncertain: [] }, 1500);
  }

  let body: FormData | { text: string };
  if (input.kind === 'text') {
    body = { text: input.text };
  } else {
    const type = input.mimeType ?? (input.kind === 'pdf' ? 'application/pdf' : 'image/jpeg');
    body = new FormData();
    if (Platform.OS === 'web') {
      body.append('file', await (await fetch(input.uri)).blob(), input.name);
    } else {
      // React Native's FormData sends a local file from { uri, name, type }.
      body.append('file', { uri: input.uri, name: input.name, type } as unknown as Blob);
    }
  }
  const scanned = await apiFetch<Omit<ScannedVisit, 'carePlan'> & { carePlan: ApiCarePlan }>(
    `/pets/${petId}/visits/scan?lang=${currentLanguage()}`,
    { method: 'POST', body },
  );
  return { ...scanned, carePlan: toCarePlan(scanned.carePlan) };
};

/** The backend's medication schedule. Long-term medicines have no total. */
type ApiSchedule = Omit<MedicationCourse, 'dosesTotal' | 'totalDays'> & {
  dosesTotal: number | null;
  totalDays: number | null;
};

/** The medicine being given now, when it is a course with a known length. Backend: GET /pets/:petId/medication-course */
export const getMedicationCourse = async (petId: string): Promise<MedicationCourse | null> => {
  if (!useMockData) {
    const { course } = await apiFetch<{ course: ApiSchedule | null }>(`/pets/${petId}/medication-course`);
    return course && course.dosesTotal !== null && course.totalDays !== null
      ? {
          petId: course.petId,
          name: course.name,
          dosesTotal: course.dosesTotal,
          dosesGiven: course.dosesGiven,
          startDate: course.startDate,
          totalDays: course.totalDays,
        }
      : null;
  }
  return mockDelay(mockMedicationCourses.find((c) => c.petId === petId) ?? null);
};

/** Keeps the fields the app uses from the backend's reminder */
const toReminder = (r: Reminder): Reminder => ({
  id: r.id,
  petId: r.petId,
  kind: r.kind,
  title: r.title,
  detail: r.detail,
  dueAt: r.dueAt,
  done: r.done,
  doneBy: r.doneBy ?? null,
});

/**
 * All pets' reminders, soonest first. Pass a pet id to filter.
 * Backend: GET /reminders (a week back, so missed doses show, to 30 days ahead).
 */
export const getReminders = async (petId?: string): Promise<Reminder[]> => {
  if (!useMockData) {
    const query = new URLSearchParams({ lang: currentLanguage(), ...(petId ? { petId } : {}) });
    const { reminders } = await apiFetch<{ reminders: Reminder[] }>(`/reminders?${query}`);
    return reminders.map(toReminder);
  }
  return mockDelay(
    mockReminders
      .filter((r) => !petId || r.petId === petId)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
  );
};

export const addReminder = async (input: Omit<Reminder, 'id' | 'done' | 'doneBy'>): Promise<Reminder> => {
  if (!useMockData) {
    const created = await apiFetch<Reminder>(`/reminders?lang=${currentLanguage()}`, {
      method: 'POST',
      body: { ...input, detail: input.detail || undefined },
    });
    return toReminder(created);
  }
  const reminder: Reminder = { ...input, id: `reminder-${Date.now()}`, done: false, doneBy: null };
  mockReminders.push(reminder);
  return mockDelay(reminder);
};

/**
 * Ticks a reminder done (or undoes it). `doneBy` is the signed-in family member's name; the
 * backend records who it was from the session instead.
 */
export const setReminderDone = async (
  reminderId: string,
  done: boolean,
  doneBy: string | null,
): Promise<Reminder> => {
  if (!useMockData) {
    const updated = await apiFetch<Reminder>(`/reminders/${reminderId}?lang=${currentLanguage()}`, {
      method: 'PATCH',
      body: { done },
    });
    return toReminder(updated);
  }
  const reminder = mockReminders.find((r) => r.id === reminderId);
  if (!reminder) {
    throw new Error(`Reminder ${reminderId} not found`);
  }

  const course = mockMedicationCourses.find((c) => c.petId === reminder.petId);
  if (reminder.kind === 'medication' && course && reminder.done !== done) {
    course.dosesGiven += done ? 1 : -1;
  }
  reminder.done = done;
  reminder.doneBy = done ? doneBy : null;

  return mockDelay({ ...reminder });
};
