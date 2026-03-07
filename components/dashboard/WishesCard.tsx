// components/dashboard/WishesCard.tsx
"use client";

import { useMemo, useState } from "react";
import type { Wish, ExamProfile } from "@/lib/state";
import type { ExamDatesMap } from "@/components/dashboard/DaysLeftCard";
import { daysUntilSafe } from "@/lib/date";
import { lookupTarget, formatHours, formatRate } from "@/lib/goaldata";
import { EXAM_TYPES, type ExamTypeId } from "@/lib/exams";

/**
 * 大学/英検 →（学部/回次）→（学科）
 * ※英検なども university として扱う
 */
const SCHOOL_DATA: Record<string, Record<string, string[]>> = {
  立教大学: { 観光学部: [] },
  山形大学: { 人文社会科学部: [], 医学部: ["医学科"] },
  東京大学: { 医学部: ["医学科"] },
  東北大学: { 医学部: ["医学科"] },
  英検2級: { "2025年第3回": [] },
};

const OPTION_PLACEHOLDER = "（選択してください）";

function getUniversities(): string[] {
  return Object.keys(SCHOOL_DATA).sort((a, b) => a.localeCompare(b, "ja"));
}
function getFaculties(university: string): string[] {
  return Object.keys(SCHOOL_DATA[university] ?? {}).sort((a, b) =>
    a.localeCompare(b, "ja")
  );
}
function getDepartments(university: string, faculty: string): string[] {
  return (SCHOOL_DATA[university]?.[faculty] ?? [])
    .slice()
    .sort((a, b) => a.localeCompare(b, "ja"));
}
function isExamCategory(university: string): boolean {
  return university.startsWith("英検");
}

function formatHoursPerDay(hoursPerDay: number): string {
  if (!Number.isFinite(hoursPerDay) || hoursPerDay <= 0) return "—";
  const totalMinutes = Math.round(hoursPerDay * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return `${m}分/日`;
  if (m <= 0) return `${h}時間/日`;
  return `${h}時間${m}分/日`;
}

function clampNumber(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function formatLeftText(left: number): string {
  return left >= 0 ? `あと${left}日` : `${Math.abs(left)}日経過`;
}

/** ✅ ExamTypeId から label/dateKey を取る */
function getExamMeta(id: ExamTypeId): { label: string; dateKey: string } {
  const meta = EXAM_TYPES[id];
  return { label: meta.label, dateKey: meta.dateKey };
}

function WishRow({
  label,
  profile,
  onChange,
  currentHensachi,
  examDates,
  paceLeftId,
  paceRightId,
}: {
  label: string;
  profile: ExamProfile;
  onChange: (patch: Partial<ExamProfile>) => void;
  currentHensachi: number | null;
  examDates: ExamDatesMap;
  /** ✅ 残日数カードで選択された左 */
  paceLeftId: ExamTypeId;
  /** ✅ 残日数カードで選択された右 */
  paceRightId: ExamTypeId;
}) {
  const [open, setOpen] = useState(false);

  const universities = useMemo(() => getUniversities(), []);
  const faculties = getFaculties(profile.university);
  const departments = getDepartments(profile.university, profile.faculty);

  const isExam = isExamCategory(profile.university);

  const target = lookupTarget(
    profile.university,
    profile.faculty,
    profile.department
  );

  const targetH = target?.targetHensachi ?? null;
  const remainHours = target?.studyHours ?? null;
  const avgRate = target?.avgScoreRate ?? undefined;
  const passRate = target?.passRate ?? undefined;

  const diff =
    typeof currentHensachi === "number" && typeof targetH === "number"
      ? targetH - currentHensachi
      : null;

  // ✅ 残日数カードで選んだ試験を使う
  const leftMeta = getExamMeta(paceLeftId);
  const rightMeta = getExamMeta(paceRightId);

  const leftDate = examDates?.[leftMeta.dateKey];
  const rightDate = examDates?.[rightMeta.dateKey];

  const leftDays = daysUntilSafe(leftDate);
  const rightDays = daysUntilSafe(rightDate);

  const paceLeft =
    typeof remainHours === "number" && Number.isFinite(leftDays) && leftDays > 0
      ? formatHoursPerDay(remainHours / leftDays)
      : "—";

  const paceRight =
    typeof remainHours === "number" &&
    Number.isFinite(rightDays) &&
    rightDays > 0
      ? formatHoursPerDay(remainHours / rightDays)
      : "—";

  return (
    <div className="rounded-xl border border-black/5 bg-white p-3 space-y-2">
      <div className="text-sm font-semibold text-black/70">{label}</div>

      {/* 大学 / 試験 */}
      <div>
        <div className="text-xs text-black/60 mb-1">
          {isExam ? "試験" : "大学"}
        </div>
        <select
          className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/25"
          value={profile.university || OPTION_PLACEHOLDER}
          onChange={(e) => {
            const v = e.target.value;
            if (v === OPTION_PLACEHOLDER) {
              onChange({ university: "", faculty: "", department: "" });
              return;
            }
            onChange({ university: v, faculty: "", department: "" });
          }}
        >
          <option value={OPTION_PLACEHOLDER}>{OPTION_PLACEHOLDER}</option>
          {universities.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>

      {/* 学部 / 回次 */}
      {!!profile.university && (
        <div>
          <div className="text-xs text-black/60 mb-1">
            {isExam ? "回次" : "学部"}
          </div>
          <select
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/25"
            value={profile.faculty || OPTION_PLACEHOLDER}
            onChange={(e) => {
              const v = e.target.value;
              if (v === OPTION_PLACEHOLDER) {
                onChange({ faculty: "", department: "" });
                return;
              }
              onChange({ faculty: v, department: "" });
            }}
            disabled={!profile.university}
          >
            <option value={OPTION_PLACEHOLDER}>{OPTION_PLACEHOLDER}</option>
            {faculties.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 学科（英検は出さない） */}
      {!isExam && departments.length > 0 && (
        <div>
          <div className="text-xs text-black/60 mb-1">学科</div>
          <select
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/25"
            value={profile.department || OPTION_PLACEHOLDER}
            onChange={(e) => {
              const v = e.target.value;
              if (v === OPTION_PLACEHOLDER) {
                onChange({ department: "" });
                return;
              }
              onChange({ department: v });
            }}
          >
            <option value={OPTION_PLACEHOLDER}>{OPTION_PLACEHOLDER}</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 目標表示 */}
      <div className="pt-1 text-xs text-black/60 space-y-1">
        <div>
          目標偏差値：{" "}
          <span className="font-semibold text-black/80">{targetH ?? "—"}</span>
          {typeof diff === "number" ? (
            <span className="ml-2 text-black/50">
              （差：{diff >= 0 ? `+${diff}` : diff}）
            </span>
          ) : null}
        </div>

        <div>
          目標まで：{" "}
          <span className="font-semibold text-black/80">
            {formatHours(remainHours ?? undefined)}
          </span>
        </div>

        <div>
          平均得点率：{" "}
          <span className="font-semibold text-black/80">
            {formatRate(avgRate)}
          </span>
          {avgRate == null ? (
            <span className="ml-2 text-black/45 text-[11px]">
              （データ未設定）
            </span>
          ) : null}
        </div>

        <div>
          合格率：{" "}
          <span className="font-semibold text-black/80">
            {formatRate(passRate)}
          </span>
          {passRate == null ? (
            <span className="ml-2 text-black/45 text-[11px]">
              （データ未設定）
            </span>
          ) : null}
        </div>

        {/* 折りたたみ：詳しく見る */}
        <button
          type="button"
          className="mt-2 inline-flex items-center justify-center rounded-lg border border-black/15 px-3 py-1 text-xs hover:bg-black/5"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "閉じる" : "詳しく見る"}
        </button>

        {open ? (
          <div className="mt-2 rounded-lg bg-black/3 p-2">
            <div className="text-[11px] text-black/55">
              {leftMeta.label}：{" "}
              <span className="font-semibold text-black/75">
                {Number.isFinite(leftDays)
                  ? formatLeftText(leftDays)
                  : "未設定"}
              </span>{" "}
              → <span className="font-semibold text-black/75">{paceLeft}</span>
            </div>

            <div className="mt-1 text-[11px] text-black/55">
              {rightMeta.label}：{" "}
              <span className="font-semibold text-black/75">
                {Number.isFinite(rightDays)
                  ? formatLeftText(rightDays)
                  : "未設定"}
              </span>{" "}
              → <span className="font-semibold text-black/75">{paceRight}</span>
            </div>

            <div className="mt-1 text-[10px] text-black/45">
              ※「目標までの時間」は goaldata の studyHours を使用
            </div>
          </div>
        ) : null}
      </div>

      {/* 現在値 */}
      <div className="text-xs text-black/55 pt-1">
        現在：
        <span className="font-semibold text-black/75 ml-1">
          {profile.university || "—"}
        </span>
        {profile.faculty ? ` / ${profile.faculty}` : ""}
        {profile.department ? ` / ${profile.department}` : ""}
      </div>
    </div>
  );
}

export function WishesCard({
  wishes,
  currentHensachi,
  examDates,
  onChangeWish,
  onChangeCurrentHensachi,
  daysLeftSelection,
}: {
  wishes: Wish[];
  currentHensachi: number | null;
  examDates: ExamDatesMap;
  onChangeWish: (wishId: 1 | 2 | 3, patch: Partial<ExamProfile>) => void;
  onChangeCurrentHensachi: (value: number | null) => void;
  /** ✅ 残日数カードの選択（DashboardPage から渡す） */
  daysLeftSelection: { left: ExamTypeId; right: ExamTypeId };
}) {
  const w1 = wishes.find((w) => w.id === 1);
  const w2 = wishes.find((w) => w.id === 2);
  const w3 = wishes.find((w) => w.id === 3);

  const hensachiOptions = useMemo(
    () => Array.from({ length: 51 }, (_, i) => i + 30),
    []
  );

  // ✅ 残日数カードで選択されている2つを、そのまま使う
  const paceLeftId = daysLeftSelection.left;
  const paceRightId = daysLeftSelection.right;

  return (
    <section className="rounded-2xl bg-white/80 shadow-sm p-4 border border-black/5">
      <div className="text-sm font-semibold tracking-wide text-black/70">
        第1〜第3志望（大学/英検）と目標
      </div>

      <div className="mt-3">
        <div className="text-xs text-black/60 mb-1">現在の偏差値</div>
        <select
          className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/25"
          value={
            typeof currentHensachi === "number" ? String(currentHensachi) : ""
          }
          onChange={(e) => {
            const v = e.target.value;
            if (!v) {
              onChangeCurrentHensachi(null);
              return;
            }
            const n = Number(v);
            onChangeCurrentHensachi(
              Number.isFinite(n) ? clampNumber(n, 0, 100) : null
            );
          }}
        >
          <option value="">（選択してください）</option>
          {hensachiOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 space-y-3">
        <WishRow
          label="第1志望"
          profile={
            w1?.profile ?? { university: "", faculty: "", department: "" }
          }
          onChange={(patch) => onChangeWish(1, patch)}
          currentHensachi={currentHensachi}
          examDates={examDates}
          paceLeftId={paceLeftId}
          paceRightId={paceRightId}
        />
        <WishRow
          label="第2志望"
          profile={
            w2?.profile ?? { university: "", faculty: "", department: "" }
          }
          onChange={(patch) => onChangeWish(2, patch)}
          currentHensachi={currentHensachi}
          examDates={examDates}
          paceLeftId={paceLeftId}
          paceRightId={paceRightId}
        />
        <WishRow
          label="第3志望"
          profile={
            w3?.profile ?? { university: "", faculty: "", department: "" }
          }
          onChange={(patch) => onChangeWish(3, patch)}
          currentHensachi={currentHensachi}
          examDates={examDates}
          paceLeftId={paceLeftId}
          paceRightId={paceRightId}
        />
      </div>
    </section>
  );
}
