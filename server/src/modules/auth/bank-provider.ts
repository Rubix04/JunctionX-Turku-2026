import { badRequest, unauthorized } from "../../errors.js";

export type BankIdentity = {
  /** Stable person identifier from the identity provider (in Finland the national ID). */
  personId: string;
  displayName: string;
};

/**
 * Strong identification with online banking credentials (Finnish Trust Network).
 * A real provider (an FTN broker such as Signicat or Criipto) is an OIDC redirect flow:
 * the client opens the broker's page, and the server exchanges the returned code for
 * the identity. Implement this interface for it and pass it to `buildApp`.
 */
export type BankIdentityProvider = {
  banks: ReadonlyArray<{ id: string; name: string }>;
  identify: (input: { bankId: string; testPersonId?: string }) => Promise<BankIdentity>;
};

const BANKS = [
  { id: "op", name: "OP" },
  { id: "nordea", name: "Nordea" },
  { id: "danske", name: "Danske Bank" },
  { id: "spankki", name: "S-Pankki" },
  { id: "aktia", name: "Aktia" },
  { id: "saastopankki", name: "Säästöpankki" },
  { id: "pop", name: "POP Pankki" },
  { id: "handelsbanken", name: "Handelsbanken" },
  { id: "alandsbanken", name: "Ålandsbanken" },
  { id: "omasp", name: "Oma Säästöpankki" },
] as const;

// Test persons for the demo. Pick one with `testPersonId`; the default is the first.
const TEST_PERSONS: Record<string, BankIdentity> = {
  "demo-1": { personId: "010170-999R", displayName: "Maija Meikäläinen" },
  "demo-2": { personId: "020280-998S", displayName: "Matti Meikäläinen" },
};

/** Simulated identification. Every bank succeeds instantly with a test person. */
export const mockBankProvider: BankIdentityProvider = {
  banks: BANKS,
  identify: async ({ bankId, testPersonId = "demo-1" }) => {
    if (!BANKS.some((bank) => bank.id === bankId)) {
      throw badRequest("UNKNOWN_BANK", `Unknown bank: ${bankId}`);
    }
    const person = TEST_PERSONS[testPersonId];
    if (!person) {
      throw unauthorized("BANK_AUTH_FAILED", "Identification failed");
    }
    return person;
  },
};
