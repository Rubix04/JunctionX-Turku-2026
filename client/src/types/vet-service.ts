import type { IconName } from '@/components/ui/icon';
import type { Localized } from '@/types/content';

// Remote vet services bookable from the home screen. Will come from the insurer's booking system.

export type VetService = {
  id: string;
  title: Localized;
  description: Localized;
  /** Euros; 0 means included in the insurance */
  price: number;
  icon: IconName;
  /** Either a live queue or the next free slot */
  availability: { kind: 'queue'; minutes: number } | { kind: 'slot'; at: string };
};
