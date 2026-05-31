// lib/nihonshiHistory.ts

export type NihonshiHistoryDetail = {
  answerNo: number;
  dai: number;
  no: number;
  qid: string;
  chosen: number | string | null;
  correctChoice: number | string | null;
  got: number;
  max: number;
  question: string;
  choices?: string[];
  explanation?: string;
};

export type NihonshiHistoryEntry = {
  id: string;
  createdAt: string;
  dateKey: string;

  examId: string;
  examTitle: string;
  year: number;

  total: number;
  maxTotal: number;
  correctCount: number;
  answeredCount: number;
  percent: number;
  hensachi?: number;

  mean?: number;
  sd?: number;
  examinees?: number;

  details: NihonshiHistoryDetail[];
};

const KEY = "nihonshi_history_v1";

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

export function loadNihonshiHistory(): NihonshiHistoryEntry[] {
  const list = readJson<unknown>(KEY);
  if (!Array.isArray(list)) return [];
  return list as NihonshiHistoryEntry[];
}

export function saveNihonshiHistory(list: NihonshiHistoryEntry[]) {
  writeJson(KEY, list);
}

export function addNihonshiHistory(
  entry: Omit<NihonshiHistoryEntry, "id" | "createdAt">
) {
  const list = loadNihonshiHistory();

  const full: NihonshiHistoryEntry = {
    id: safeUUID(),
    createdAt: new Date().toISOString(),
    ...entry,
  };

  const next = [full, ...list];
  saveNihonshiHistory(next);

  return full;
}

export function getNihonshiHistoryByYear(year: number) {
  return loadNihonshiHistory().filter((x) => x.year === year);
}

export function getNihonshiHistoryById(id: string) {
  return loadNihonshiHistory().find((x) => x.id === id) ?? null;
}

export function deleteNihonshiHistory(id: string) {
  const next = loadNihonshiHistory().filter((x) => x.id !== id);
  saveNihonshiHistory(next);
}

export function deleteAllNihonshiHistory() {
  saveNihonshiHistory([]);
}
