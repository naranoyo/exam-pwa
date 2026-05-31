// lib/quiz.ts

export type SubjectId = "english" | "japanese" | "math" | "kango" | "nihonshi";

export type CategoryId =
  | "vocab"
  | "kanji"
  | "grammar"
  | "kokugo"
  | "kango"
  | "nihonshi"
  | "kyotsu-nihonshi";

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
  | "kango-2025"
  | "kango-2025-am"
  | "kango-2025-pm"
  | "kango-2024"
  | "kango-2024-am"
  | "kango-2024-pm"
  | "kango-2023"
  | "kango-2023-am"
  | "kango-2023-pm"
  | "nihonshi-2025";

export type Question = {
  id: string;
  subject: SubjectId;
  category: CategoryId;
  level: LevelId;
  question: string;
  choices: string[];
  answer: number;
  explanation?: string;
  meta?: Record<string, unknown>;
};

export type QuizResult = {
  id: string;
  dateKey: string;
  subject: SubjectId;
  category: CategoryId;
  level: LevelId;
  questionId: string;
  isCorrect: boolean;
  chosen: number;
  correct: number;
  msSpent: number;

  // 日本史・本番形式の履歴用
  attemptId?: string;
  examTitle?: string;
  score?: number;
  maxScore?: number;
  percent?: number;
  hensachi?: number;
  createdAt?: string;
};

export function createResultId(): string {
  return `qr_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`;
}
