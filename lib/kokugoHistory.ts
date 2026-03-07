// lib/kokugoHistory.ts
import type { AnswerState } from "@/lib/kokugoGrade";

export type KokugoHistoryEntry = {
  id: string;
  year: number;
  title: string;
  createdAt: string; // ISO

  score: number;
  maxScore: number;
  hensachi?: number;
  rankText?: string;

  // ✅ any禁止対応：AnswerState を使う
  answers: AnswerState;
};

const KEY = "kokugo_history_v1";

function safeUUID() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

/** 履歴取得 */
export function loadKokugoHistory(): KokugoHistoryEntry[] {
  const list = readJson<unknown>(KEY);
  if (!Array.isArray(list)) return [];
  return list as KokugoHistoryEntry[];
}

/** 履歴保存 */
export function saveKokugoHistory(list: KokugoHistoryEntry[]) {
  writeJson(KEY, list);
}

/** 追加保存（先頭に追加） */
export function addKokugoHistory(
  entry: Omit<KokugoHistoryEntry, "id" | "createdAt">
) {
  const list = loadKokugoHistory();

  const full: KokugoHistoryEntry = {
    id: safeUUID(),
    createdAt: new Date().toISOString(),
    ...entry,
  };

  const next = [full, ...list];
  saveKokugoHistory(next);
  return full;
}

/** 年度別取得 */
export function getKokugoHistoryByYear(year: number) {
  return loadKokugoHistory().filter((x) => x.year === year);
}

/** idで1件取得 */
export function getKokugoHistoryById(id: string) {
  return loadKokugoHistory().find((x) => x.id === id) ?? null;
}
