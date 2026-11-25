import { mockHousehold } from '@/services/mock/data';
import { mockDelay } from '@/services/mock/delay';

// The family sharing an account: they see the same pet pages and reminders.
// Mock only for now: the backend keeps a household id per user but has no endpoint that lists its members.

export type HouseholdMember = { id: string; name: string; role: 'member' };

/** The other family members, not the signed-in user */
export const getHouseholdMembers = async (): Promise<HouseholdMember[]> => mockDelay([...mockHousehold.members]);
