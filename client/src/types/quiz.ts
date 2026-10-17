import type { IconName } from '@/components/ui/icon';
import type { Localized } from '@/types/content';
import type { Species } from '@/types/pet';

// Short lessons with scenario questions in the Explore tab. Content is maintained by a vet.

export type QuizQuestion = {
  id: string;
  /** A situation, e.g. "Your dog just ate dark chocolate. What do you do first?" */
  prompt: Localized;
  options: Localized[];
  /** Index of the correct option */
  answer: number;
  /** Why the answer is right, shown right after answering */
  explanation: Localized;
};

export type Quiz = {
  id: string;
  title: Localized;
  summary: Localized;
  icon: IconName;
  species: Species[];
  /** Key points to read before the questions */
  lesson: Localized[];
  /** Knowledge base entry to read more */
  substanceId: string | null;
  questions: QuizQuestion[];
};
