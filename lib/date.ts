// src/lib/date.ts
export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** ローカル端末基準で YYYY-MM-DD を作る（iPhoneでズレにくい） */
export function getDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

/** YYYY-MM-DD をローカル日付の Date に変換（00:00ローカル） */
export function dateKeyToLocalDate(dateKey: string): Date {
  // ここは string 前提で使う（下の safe 関数経由がおすすめ）
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

/** ✅ undefined/不正フォーマットでも落ちない版 */
export function tryDateKeyToLocalDate(dateKey?: string | null): Date | null {
  if (!dateKey) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;

  const [y, m, d] = dateKey.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
    return null;

  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/** 目標日(YYYY-MM-DD) までの残日数（今日=0、明日=1） */
export function daysUntil(
  targetDateKey: string,
  from: Date = new Date()
): number {
  const from0 = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate(),
    0,
    0,
    0,
    0
  );
  const to0 = dateKeyToLocalDate(targetDateKey);

  const diffMs = to0.getTime() - from0.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/** ✅ undefinedでもOKな残日数（未設定なら NaN を返す） */
export function daysUntilSafe(
  targetDateKey?: string | null,
  from: Date = new Date()
): number {
  const to0 = tryDateKeyToLocalDate(targetDateKey);
  if (!to0) return NaN;

  const from0 = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate(),
    0,
    0,
    0,
    0
  );
  const diffMs = to0.getTime() - from0.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/** 日本語の曜日つき表示（例: 12/30(火)） */
export function formatJPMonthDayWeek(d: Date = new Date()): string {
  const weeks = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getMonth() + 1}/${d.getDate()}(${weeks[d.getDay()]})`;
}

/** ✅ 2026年1月2日(金) 18:05 形式 */
export function formatJPFullDateTime(d: Date = new Date()): string {
  const weeks = ["日", "月", "火", "水", "木", "金", "土"];
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const w = weeks[d.getDay()];
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  return `${y}年${m}月${day}日(${w}) ${hh}:${mm}`;
}

/** 秒 → "1h 30m" */
export function formatDurationShort(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);

  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}
