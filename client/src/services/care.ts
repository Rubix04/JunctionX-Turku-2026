import {
  mockCarePlans,
  mockMedicationCourses,
  mockReminders,
  mockVisits,
} from '@/services/mock/data';
import { mockDelay } from '@/services/mock/delay';
import type { CarePlan, MedicationCourse, Reminder, Visit } from '@/types/care';

// Visits, care plans and reminders. No backend endpoints yet: mock only.

/** Newest first */
export const getVisits = async (petId: string): Promise<Visit[]> =>
  mockDelay(
    mockVisits.filter((v) => v.petId === petId).sort((a, b) => b.date.localeCompare(a.date)),
  );

/** The care plan from the pet's latest visit, or null */
export const getCarePlan = async (petId: string): Promise<CarePlan | null> =>
  mockDelay(mockCarePlans.find((p) => p.petId === petId) ?? null);

export const getMedicationCourse = async (petId: string): Promise<MedicationCourse | null> =>
  mockDelay(mockMedicationCourses.find((c) => c.petId === petId) ?? null);

/** All pets' reminders, soonest first. Pass a pet id to filter. */
export const getReminders = async (petId?: string): Promise<Reminder[]> =>
  mockDelay(
    mockReminders
      .filter((r) => !petId || r.petId === petId)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
  );

/** Adds a vet visit from uploaded notes. It stays a draft until the clinic checks it. */
export const addVisitDraft = async (petId: string, title: string, clinicName: string): Promise<Visit> => {
  const visit: Visit = {
    id: `visit-${Date.now()}`,
    petId,
    date: new Date().toISOString().slice(0, 10),
    title,
    clinicName,
    vetName: null,
    draft: true,
  };
  mockVisits.push(visit);
  return mockDelay(visit);
};

export const addReminder = async (input: Omit<Reminder, 'id' | 'done'>): Promise<Reminder> => {
  const reminder: Reminder = { ...input, id: `reminder-${Date.now()}`, done: false };
  mockReminders.push(reminder);
  return mockDelay(reminder);
};

export const setReminderDone = async (reminderId: string, done: boolean): Promise<Reminder> => {
  const reminder = mockReminders.find((r) => r.id === reminderId);
  if (!reminder) {
    throw new Error(`Reminder ${reminderId} not found`);
  }

  const course = mockMedicationCourses.find((c) => c.petId === reminder.petId);
  if (reminder.kind === 'medication' && course && reminder.done !== done) {
    course.dosesGiven += done ? 1 : -1;
  }
  reminder.done = done;

  return mockDelay({ ...reminder });
};
