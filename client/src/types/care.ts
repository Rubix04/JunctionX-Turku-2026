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
  /** Uploaded notes not yet checked by the clinic */
  draft?: boolean;
};

export type CarePlanProduct = {
  productId: string;
  name: string;
  brand: string;
  /** Prescription medicines go through the prescription, not the store map */
  prescription: { issuedTo: string; pickedUpOn: string | null } | null;
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
  products: CarePlanProduct[];
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
