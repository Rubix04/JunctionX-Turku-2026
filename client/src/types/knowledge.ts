import type { Species } from '@/types/pet';

// Knowledge base of dangerous substances (spec 10). Matches server/src/modules/knowledge/schemas.ts.

export type RiskLevel = 'harmless' | 'caution' | 'dangerous' | 'emergency';
export type RiskOrUnknown = RiskLevel | 'unknown';

export type KnowledgeCategory = 'foods' | 'plants' | 'mushrooms' | 'household' | 'medicines' | 'garden';

export type ContentStatus = { status: 'sample' | 'reviewed'; updatedOn: string };

export type RiskBySpecies = Record<Species, RiskOrUnknown>;

export type SubstanceSummary = {
  id: string;
  name: string;
  matchedName: string | null;
  category: KnowledgeCategory;
  categoryLabel: string;
  risk: RiskBySpecies;
};

export type DoseOption = { variantId: string; label: string; unit: 'g' | 'piece' };

export type SubstanceDetail = SubstanceSummary & {
  content: ContentStatus;
  otherNames: string[];
  summary: string;
  symptoms: string[];
  onset: string;
  firstAid: string;
  doNotInduceVomiting: true;
  doseOptions: DoseOption[] | null;
  sources: string[];
};

export type ExposureAction = 'goToEmergencyNow' | 'callVetNow' | 'monitor' | 'noAction';

export type Assessment = {
  substanceId: string;
  species: Species;
  riskLevel: RiskLevel;
  basis: 'dose' | 'substance' | 'noSpeciesData';
  dose: { compound: string; variantId: string; amount: number; unit: 'g' | 'piece'; compoundMg: number; mgPerKg: number } | null;
  action: ExposureAction;
  next: { quickAssessment: boolean; emergencyClinics: boolean; callVet: boolean };
  notes: ('noSpeciesData' | 'amountUnknown' | 'weightUnknown' | 'noDoseData')[];
  doNotInduceVomiting: true;
};

export type AssessInput = {
  substanceId: string;
  species: Species;
  weightKg?: number | null;
  variantId?: string | null;
  amount?: number | null;
};
