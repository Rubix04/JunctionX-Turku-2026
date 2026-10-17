// Vet visits, care plans and reminders.
// No backend endpoints yet; served from services/mock for now.

export type Visit = {
  id: string;
  petId: string;
  /** ISO date */
  date: string;
  title: string;
  clinicName: string;
  vetName: string | null;
};

export type CarePlan = {
  petId: string;
  visitId: string;
  diagnosis: string;
  clinicName: string;
  vetName: string;
  checkedByClinic: boolean;
  /** Plain-language summary of what was found */
  findings: string;
  homeCare: string[];
  followUp: { title: string; dateTime: string; clinicName: string } | null;
  /** The vet's notes, unchanged */
  originalText: string;
};

export type ReminderKind = 'medication' | 'visit' | 'vaccination' | 'deworming';

export type Reminder = {
  id: string;
  petId: string;
  kind: ReminderKind;
  title: string;
  detail: string;
  /** ISO date-time */
  dueAt: string;
  done: boolean;
};

export type MedicationCourse = {
  petId: string;
  name: string;
  dosesTotal: number;
  dosesGiven: number;
  startDate: string;
  totalDays: number;
};
