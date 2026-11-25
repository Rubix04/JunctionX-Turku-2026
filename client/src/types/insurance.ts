// Insurance policies and claims. Will come from the insurance company's own systems.

export type Policy = {
  id: string;
  petId: string;
  number: string;
  /** Product name, e.g. "Basic Protection" */
  plan: string;
  /** Yearly vet care cover, euros */
  coverLimit: number;
  usedThisYear: number;
};

export type ClaimStatus = 'paid' | 'inReview' | 'needsInfo';

export type Claim = {
  id: string;
  petId: string;
  title: string;
  date: string;
  /** How the claim was made */
  channel: 'directPayment' | 'receipt';
  status: ClaimStatus;
  /** Euros on the receipt */
  amount?: number;
  clinicName?: string;
};

/** A receipt, invoice or vet record attached to a claim */
export type ClaimAttachment = { uri: string; name: string; kind: 'image' | 'pdf' };

export type NewClaim = {
  petId: string;
  /** What the treatment was for, e.g. "Paw injury" */
  title: string;
  /** Day of the treatment, ISO date */
  treatmentDate: string;
  clinicName: string;
  amount: number;
  description: string | null;
  attachments: ClaimAttachment[];
};
