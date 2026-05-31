// lib/kangoHistory.ts

export type KangoHistoryAnswer = {
  questionId: string;
  no: number;
  question?: string;
  userAnswer: number | number[] | string | null;
  correctAnswer: number | number[] | string;
  isCorrect: boolean;
  explanation?: string;
};

export type KangoHistoryItem = {
  id: string;
  examId: string;
  title: string;
  year: number;
  session: "am" | "pm";
  score: number;
  total: number;
  percent: number;
  createdAt: string;
  answers: KangoHistoryAnswer[];
};

const STORAGE_KEY = "exam-pwa-kango-history";

export function getKangoHistory(): KangoHistoryItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as KangoHistoryItem[];
  } catch {
    return [];
  }
}

export function saveKangoHistory(item: KangoHistoryItem) {
  if (typeof window === "undefined") return;

  const current = getKangoHistory();
  const next = [item, ...current];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function getKangoHistoryById(id: string) {
  return getKangoHistory().find((item) => item.id === id) ?? null;
}

export function deleteKangoHistory(id: string) {
  if (typeof window === "undefined") return;
  const next = getKangoHistory().filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/** 全履歴削除 */
export function deleteAllKangoHistory() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
