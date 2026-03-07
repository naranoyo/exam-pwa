// lib/exams.ts

export type ExamType = {
  /** 画面表示名 */
  label: string;

  /** AppState.examDates / goals のキー（基本は同じ文字列でOK） */
  dateKey: string;
  goalKey: string;

  /** 初期値（ここを書くだけで state 初期値に入る） */
  initialDate?: string; // "YYYY-MM-DD"
  initialGoal?: string | string[]; // ✅ 1行 or 複数行
};

export const EXAM_TYPES = {
  // 2025共通テスト
  kyotsu2025: {
    label: "2025共通テストまで",
    dateKey: "kyotsu2025",
    goalKey: "kyotsu2025",
    initialDate: "2025-01-18",
    initialGoal: ["目標偏差値：60", "目標得点率：75%"],
  },

  // 2026共通テスト
  kyotsu2026: {
    label: "2026共通テストまで",
    dateKey: "kyotsu2026",
    goalKey: "kyotsu2026",
    initialDate: "2026-01-17",
    initialGoal: ["目標偏差値：60", "目標得点率：75%"],
  },

  // 2027共通テスト
  kyotsu2027: {
    label: "2027共通テストまで",
    dateKey: "kyotsu2027",
    goalKey: "kyotsu2027",
    initialDate: "2027-01-16", // 仮でOK
    initialGoal: ["目標偏差値：60", "目標得点率：75%"],
  },

  // 立教大学/観光学部 一次試験(2027)
  icijiRikkyo: {
    label: "立教(1次)まで",
    dateKey: "icijiRikkyo",
    goalKey: "icijiRikkyo",
    initialDate: "2027-02-01",
    initialGoal: ["目標偏差値：—", "目標得点率：—"],
  },

  // 立教大学/観光学部 二次試験(2027)
  nijiRikkyo: {
    label: "立教/観光(2次)まで",
    dateKey: "nijiRikkyo",
    goalKey: "nijiRikkyo",
    initialDate: "2027-02-06",
    initialGoal: ["目標偏差値：58", "目標得点率：—"],
  },

  // 山形大学/人文社会科学部 二次試験
  nijiYamadai: {
    label: "山大/人文(2次)まで",
    dateKey: "nijiYamadai",
    goalKey: "nijiYamadai",
    initialDate: "2027-02-25",
    initialGoal: ["目標偏差値：53", "目標得点率：68"],
  },

  // 英検2級(2025第3回)
  eiken2_2025_3: {
    label: "英検2級(2025第3回)まで",
    dateKey: "eiken2_2025_3",
    goalKey: "eiken2_2025_3",
    initialDate: "2026-01-25",
    initialGoal: ["目標偏差値：53", "目標得点率：65"],
  },

  // 英検2級(2026第1回)
  eiken2_2026_1: {
    label: "英検2級(2026第1回)まで",
    dateKey: "eiken2_2026_1",
    goalKey: "eiken2_2026_1",
    initialDate: "2026-05-22",
    initialGoal: ["目標偏差値：53", "目標得点率：65"],
  },

  // その他
  toeic: {
    label: "TOEICまで",
    dateKey: "toeic",
    goalKey: "toeic",
    initialDate: "2026-03-15",
    initialGoal: "目標：700",
  },
  mock: {
    label: "模試まで",
    dateKey: "mock",
    goalKey: "mock",
    initialDate: "2026-01-10",
    initialGoal: "目標：—",
  },

  // 汎用
  custom1: {
    label: "試験①まで",
    dateKey: "custom1",
    goalKey: "custom1",
    initialDate: "2026-04-01",
    initialGoal: "目標：—",
  },
  custom2: {
    label: "試験②まで",
    dateKey: "custom2",
    goalKey: "custom2",
    initialDate: "2026-05-01",
    initialGoal: "目標：—",
  },
} as const satisfies Record<string, ExamType>;

export type ExamTypeId = keyof typeof EXAM_TYPES;

/** EXAM_TYPES から examDates の初期値を生成 */
export function buildInitialExamDates(): Record<string, string> {
  const out: Record<string, string> = {};
  (Object.keys(EXAM_TYPES) as ExamTypeId[]).forEach((id) => {
    const meta = EXAM_TYPES[id];
    if (meta.initialDate) out[meta.dateKey] = meta.initialDate;
  });
  return out;
}

/** EXAM_TYPES から goals の初期値を生成 */
export function buildInitialGoals(): Record<
  string,
  string | string[] | undefined
> {
  const out: Record<string, string | string[] | undefined> = {};
  (Object.keys(EXAM_TYPES) as ExamTypeId[]).forEach((id) => {
    const meta = EXAM_TYPES[id];
    out[meta.goalKey] = meta.initialGoal;
  });
  return out;
}
