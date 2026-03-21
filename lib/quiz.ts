// lib/quiz.ts

export type SubjectId = "english" | "japanese" | "math" | "kango";

export type CategoryId = "vocab" | "kanji" | "grammar" | "kokugo" | "kango";

export type LevelId =
  | "basic"
  | "common-test"
  | "vocab-4"
  | "kanji-yomi-100"
  | "kanji-imi-100"
  | "kanji-yomi-past5"
  | "kokugo-2025"
  | "kokugo-2024"
  | "kokugo-2023"
  | "kango-2025-am";

export type Question = {
  id: string;
  subject: SubjectId;
  category: CategoryId;
  level: LevelId;
  question: string;
  choices: string[];
  answer: number; // 0..choices.length-1
  explanation?: string;

  // 任意の追加情報
  meta?: Record<string, unknown>;
};

export type QuizResult = {
  id: string; // result id
  dateKey: string; // YYYY-MM-DD
  subject: SubjectId;
  category: CategoryId;
  level: LevelId;
  questionId: string;
  isCorrect: boolean;
  chosen: number;
  correct: number;
  msSpent: number;
};

export function createResultId(): string {
  return `qr_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`;
}
