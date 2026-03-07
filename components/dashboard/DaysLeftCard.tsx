// components/dashboard/DaysLeftCard.tsx
"use client";

import { useMemo } from "react";
import { daysUntilSafe } from "@/lib/date";
import { EXAM_TYPES, type ExamTypeId } from "@/lib/exams";

/** =========================
 * ✅ このファイル内で型を定義（state.ts 依存を断つ）
 * ========================= */
export type GoalValue = string | string[] | undefined;
export type Goals = Record<string, GoalValue>;

/** examDates: dateKey -> YYYY-MM-DD */
export type ExamDatesMap = Record<string, string | undefined>;

function formatLeftText(left: number): string {
  return left >= 0 ? `あと${left}日` : `${Math.abs(left)}日経過`;
}

function renderGoal(goal: GoalValue) {
  if (!goal) return null;

  if (Array.isArray(goal)) {
    return (
      <div className="mt-2 space-y-0.5 text-xs text-black/60">
        {goal.map((line, idx) => (
          <div key={idx}>{line}</div>
        ))}
      </div>
    );
  }

  return <div className="mt-2 text-xs text-black/60">{goal}</div>;
}

function safeExamMeta(id: ExamTypeId) {
  const meta = EXAM_TYPES[id];
  // 念のため（id が壊れてても落ちない）
  if (!meta) {
    return { label: String(id), dateKey: String(id), goalKey: String(id) };
  }
  return meta;
}

export function DaysLeftCard({
  examDates,
  goals,
  selected,
  onChangeSelected,
}: {
  examDates: ExamDatesMap;
  goals: Goals;
  selected?: { left: ExamTypeId; right: ExamTypeId };
  onChangeSelected?: (next: { left: ExamTypeId; right: ExamTypeId }) => void;
}) {
  const allOptions = useMemo(
    () =>
      (Object.keys(EXAM_TYPES) as ExamTypeId[]).map((id) => ({
        id,
        label: safeExamMeta(id).label,
      })),
    []
  );

  // ✅ デフォルト（selected が無い時でも落ちない）
  const defaultLeft = (Object.keys(EXAM_TYPES)[0] ??
    "kyotsu2026") as ExamTypeId;
  const defaultRight = (Object.keys(EXAM_TYPES)[1] ??
    "kyotsu2027") as ExamTypeId;

  const leftId = selected?.left ?? defaultLeft;
  const rightId = selected?.right ?? defaultRight;

  const leftMeta = safeExamMeta(leftId);
  const rightMeta = safeExamMeta(rightId);

  const leftDate = examDates?.[leftMeta.dateKey];
  const rightDate = examDates?.[rightMeta.dateKey];

  const leftDays = daysUntilSafe(leftDate);
  const rightDays = daysUntilSafe(rightDate);

  const leftGoal = goals?.[leftMeta.goalKey];
  const rightGoal = goals?.[rightMeta.goalKey];

  return (
    <section className="rounded-2xl bg-white/80 shadow-sm p-4 border border-black/5">
      <div className="text-sm font-semibold tracking-wide text-black/70">
        残日数
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {/* 左 */}
        <div className="rounded-xl border border-black/10 bg-white p-3">
          <div className="text-xs text-black/60 mb-1">左</div>

          <select
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/25"
            value={leftId}
            onChange={(e) => {
              const nextLeft = e.target.value as ExamTypeId;
              onChangeSelected?.({ left: nextLeft, right: rightId });
            }}
          >
            {allOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>

          <div className="mt-3 text-2xl font-extrabold">
            {Number.isFinite(leftDays) ? formatLeftText(leftDays) : "未設定"}
          </div>

          <div className="mt-1 text-xs text-black/60">
            日付：{leftDate ?? "—"}
          </div>

          {renderGoal(leftGoal)}
        </div>

        {/* 右 */}
        <div className="rounded-xl border border-black/10 bg-white p-3">
          <div className="text-xs text-black/60 mb-1">右</div>

          <select
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/25"
            value={rightId}
            onChange={(e) => {
              const nextRight = e.target.value as ExamTypeId;
              onChangeSelected?.({ left: leftId, right: nextRight });
            }}
          >
            {allOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>

          <div className="mt-3 text-2xl font-extrabold">
            {Number.isFinite(rightDays) ? formatLeftText(rightDays) : "未設定"}
          </div>

          <div className="mt-1 text-xs text-black/60">
            日付：{rightDate ?? "—"}
          </div>

          {renderGoal(rightGoal)}
        </div>
      </div>
    </section>
  );
}
