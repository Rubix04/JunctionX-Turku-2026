import type { Localized } from '@/types/content';

// First aid guides for emergency mode (spec 6). Content is created or reviewed by a vet.

/** The technique depends on size, so guides are split by these groups. */
export type FirstAidSize = 'cat' | 'smallDog' | 'largeDog';

export type FirstAidStep = {
  text: Localized;
  /** Overrides the text for one size group */
  bySize?: Partial<Record<FirstAidSize, Localized>>;
};

export type FirstAidTopic = {
  id: string;
  icon: 'heartPulse' | 'wind' | 'droplet' | 'thermometer' | 'bolt' | 'flask' | 'snake' | 'car';
  title: Localized;
  /** One line on the topic list */
  when: Localized;
  steps: FirstAidStep[];
  /** CPR: compressions per minute for the guided rhythm */
  rhythmBpm: number | null;
  updatedOn: string;
  reviewed: boolean;
};

/** Signs that always mean: go to a vet now. Shown in emergency stage 1. */
export type EmergencySign = {
  id: string;
  label: Localized;
  /** First aid guide to open, if there is one */
  topicId: string | null;
};
