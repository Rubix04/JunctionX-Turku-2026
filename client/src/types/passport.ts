// Pet health passport (spec 4). Matches the sections of server/src/modules/passport.

export type Vaccination = {
  id: string;
  name: string;
  givenOn: string;
  validUntil: string;
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

export type Allergy = { id: string; allergen: string; severity: 'mild' | 'moderate' | 'severe' };

export type Surgery = { id: string; name: string; year: number };

export type PassportSection = 'vaccinations' | 'medications' | 'allergies' | 'surgeries' | 'visits' | 'logs';

export type Passport = {
  petId: string;
  microchip: string | null;
  ownerName: string;
  policyNumber: string | null;
  sex: 'female' | 'male';
  neutered: boolean;
  vaccinations: Vaccination[];
  medications: MedicationRecord[];
  allergies: Allergy[];
  allergiesUpdatedOn: string | null;
  surgeries: Surgery[];
};

export type PassportShare = {
  id: string;
  petId: string;
  url: string;
  sections: PassportSection[];
  createdAt: string;
  expiresAt: string;
};
