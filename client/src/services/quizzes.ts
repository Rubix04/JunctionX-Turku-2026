import { mockDelay } from '@/services/mock/delay';
import { mockQuizzes } from '@/services/mock/quizzes';
import type { Quiz } from '@/types/quiz';

// Quizzes are static content; best scores are kept in memory until the backend stores them.

const bestScores: Record<string, number> = {};

export const getQuizzes = async (): Promise<Quiz[]> => mockDelay([...mockQuizzes]);

export const getQuiz = async (id: string): Promise<Quiz> => {
  const quiz = mockQuizzes.find((q) => q.id === id);
  if (!quiz) throw new Error(`Quiz ${id} not found`);
  return mockDelay(quiz);
};

export const getBestScore = (id: string): number | null => bestScores[id] ?? null;

export const saveQuizResult = (id: string, score: number) => {
  bestScores[id] = Math.max(score, bestScores[id] ?? 0);
};
