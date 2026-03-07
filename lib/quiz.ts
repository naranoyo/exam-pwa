// lib/quiz.ts
export type SubjectId = "english" | "japanese" | "math"; // math 追加（将来用）

// ✅ ここに kokugo を追加
export type CategoryId = "vocab" | "kanji" | "grammar" | "kokugo";

// ✅ ここに今回使っている level を追加
// ※ 既存 "basic" | "common-test" を残したまま拡張
export type LevelId =
  | "basic"
  | "common-test"
  | "vocab-4"
  | "kanji-yomi-100"
  | "kanji-imi-100"
  | "kanji-yomi-past5"
  | "kokugo-2025";

export type Question = {
  id: string;
  subject: SubjectId;
  category: CategoryId;
  level: LevelId;
  question: string;
  choices: string[];
  answer: number; // 0..choices.length-1
  explanation?: string;

  // ✅（任意）共テ系で「年度」や「大問/ページ」など拡張したくなった時用
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
  // 例: "qr_1700000000000_ab12"
  return `qr_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`;
}
