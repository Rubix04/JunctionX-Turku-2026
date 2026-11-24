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

/** A vet document to read: a photo or PDF picked on the phone, or pasted text. */
export type VisitNotesInput =
  | { kind: 'image' | 'pdf'; uri: string; name: string; mimeType?: string | null }
  | { kind: 'text'; text: string };

/** What reading a vet document produced: a draft visit and care plan (server/src/modules/visit-scan). */
export type ScannedVisit = {
  /** "claude" when the AI read the document; "sample" in demo mode */
  source: 'claude' | 'sample';
  visit: Visit;
  carePlan: CarePlan;
  /** Procedures done at the visit, as read from the document */
  procedures: string[];
  /** Things the AI could not read for sure; the owner should check them with the clinic */
  uncertain: string[];
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
