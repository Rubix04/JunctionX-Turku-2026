// Pet health passport (spec 4). Matches the sections of server/src/modules/passport.

export type Vaccination = {
  id: string;
  name: string;
  givenOn: string;
  /** Null when the vaccine has no end date */
  validUntil: string | null;
  clinicName: string;
};

export type MedicationRecord = {
  id: string;
  name: string;
  dosage: string | null;
  startDate: string;
  endDate: string | null;
  reason: string | null;
};

export type Allergy = { id: string; allergen: string; severity: 'mild' | 'moderate' | 'severe' | 'unknown' };

export type Surgery = { id: string; name: string; year: number };

/** Past or ongoing diagnosis */
export type Condition = { id: string; name: string; diagnosedOn: string; resolved: boolean };

export type LabReportKind = 'blood' | 'urine' | 'ultrasound' | 'xray';

/** Lab result or imaging, turned from the clinic's PDF into structured data */
export type LabReport = { id: string; kind: LabReportKind; date: string; title: string; summary: string; clinicName: string };

export type PassportSection = 'vaccinations' | 'medications' | 'allergies' | 'surgeries' | 'visits' | 'logs';

export type Passport = {
  petId: string;
  /** 15-digit ISO 11784/11785 microchip number */
  microchip: string | null;
  /** Colour and markings, e.g. "Grey tabby, white paws" */
  markings: string | null;
  /** Pedigree registration, e.g. "FI12345/21 · Finnish Kennel Club" */
  registration: string | null;
  ownerName: string | null;
  policyNumber: string | null;
  /** Null when not recorded (the backend doesn't keep it yet) */
  sex: 'female' | 'male' | null;
  neutered: boolean;
  vaccinations: Vaccination[];
  medications: MedicationRecord[];
  allergies: Allergy[];
  allergiesUpdatedOn: string | null;
  surgeries: Surgery[];
  conditions: Condition[];
  labReports: LabReport[];
};

export type PassportShare = {
  id: string;
  petId: string;
  url: string;
  sections: PassportSection[];
  createdAt: string;
  expiresAt: string;
};
