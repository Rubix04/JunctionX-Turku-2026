// Insurance policies and claims. Will come from the insurance company's own systems.

export type Policy = {
  id: string;
  petId: string;
  number: string;
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
};
