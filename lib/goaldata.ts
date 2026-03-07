// lib/goaldata.ts

export type ComboKey = string;

export type TargetInfo = {
  targetHensachi?: number; // 目標偏差値（例：62）
  studyHours?: number; // 合格までの目安学習時間（例：1800）
  avgScoreRate?: number; // 平均得点率（例：72）＝ 72%
  passRate?: number; // ✅ 合格率（例：35）＝ 35%
};

export function makeKey(univ: string, faculty: string, dept: string): ComboKey {
  return `${univ}__${faculty}__${dept || ""}`;
}

/**
 * 大学+学部+学科 → 目標偏差値・勉強時間目安・平均得点率・合格率
 * ※学科が未入力の場合は dept="" でもヒットできるようにキーを用意
 */
export const TARGET_TABLE: Record<ComboKey, TargetInfo> = {
  // =========================
  // 立教大学 観光学部
  // =========================
  [makeKey("立教大学", "観光学部", "")]: {
    targetHensachi: 58,
    studyHours: 3500,
    // avgScoreRate: 72,
    passRate: 12,
  },

  // =========================
  // 英検2級(2025第3回)（大学の代わりにカテゴリ扱い）
  // =========================
  [makeKey("英検2級", "2025年第3回", "")]: {
    targetHensachi: 53,
    studyHours: 250,
    avgScoreRate: 65,
    passRate: 25,
  },

  // =========================
  // 山形大学
  // =========================
  [makeKey("山形大学", "人文社会科学部", "")]: {
    targetHensachi: 53,
    studyHours: 3000,
    avgScoreRate: 68,
    passRate: 35,
  },
  [makeKey("山形大学", "医学部", "医学科")]: {
    targetHensachi: 66,
    studyHours: 5500,
    avgScoreRate: 84,
    passRate: 10,
  },
  [makeKey("山形大学", "医学部", "")]: {
    targetHensachi: 66,
    studyHours: 5500,
    avgScoreRate: 84,
    passRate: 10,
  },

  // =========================
  // 東京大学 医学部
  // =========================
  [makeKey("東京大学", "医学部", "医学科")]: {
    targetHensachi: 76,
    studyHours: 9000,
    avgScoreRate: 91,
    passRate: 3,
  },
  [makeKey("東京大学", "医学部", "")]: {
    targetHensachi: 76,
    studyHours: 9000,
    avgScoreRate: 91,
    passRate: 3,
  },

  // =========================
  // 東北大学 医学部
  // =========================
  [makeKey("東北大学", "医学部", "医学科")]: {
    targetHensachi: 71,
    studyHours: 7000,
    avgScoreRate: 87,
    passRate: 8,
  },
  [makeKey("東北大学", "医学部", "")]: {
    targetHensachi: 71,
    studyHours: 7000,
    avgScoreRate: 87,
    passRate: 8,
  },
};

export function lookupTarget(
  univ: string,
  faculty: string,
  dept: string
): TargetInfo | null {
  if (!univ || !faculty) return null;

  // 学科ありを優先
  const key1 = makeKey(univ, faculty, dept);
  const hit1 = TARGET_TABLE[key1];
  if (hit1) return hit1;

  // 学科なしにフォールバック
  const key2 = makeKey(univ, faculty, "");
  const hit2 = TARGET_TABLE[key2];
  if (hit2) return hit2;

  return null;
}

export function formatHours(hours?: number): string {
  if (typeof hours !== "number" || !Number.isFinite(hours) || hours <= 0) {
    return "—";
  }
  return `${hours.toLocaleString()}時間`;
}

/** ✅ WishesCard 側で使っているので export 必須 */
export function formatRate(rate?: number): string {
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    return "—";
  }
  return `${Math.round(rate)}%`;
}
