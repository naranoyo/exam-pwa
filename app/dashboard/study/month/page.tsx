// app/dashboard/study/month/page.tsx
"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useApp } from "@/lib/state";
import { getDateKey, formatJPFullDateTime } from "@/lib/date";
import { StudyTabs } from "@/components/dashboard/StudyTabs";

function clampInt(n: number) {
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

/** 秒 → 「◯分」 or 「◯時間◯分」 */
function formatDurationJP(sec: number) {
  const s = Math.max(0, clampInt(sec));
  const totalMin = Math.floor(s / 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  if (hh > 0) return `${hh}時間${String(mm).padStart(2, "0")}分`;
  return `${mm}分`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  // 翌月0日 = 当月最終日
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function addDays(date: Date, delta: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}

const JP_DOW = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** 2/16(月) */
function fmtMDW(date: Date) {
  const m = date.getMonth() + 1;
  const day = date.getDate();
  const w = JP_DOW[date.getDay()];
  return `${m}/${day}(${w})`;
}

/** バー側（行が多いので短め）: 2/16 月 */
/** 2/16(月) */
function fmtMDWCompact(date: Date) {
  const m = date.getMonth() + 1;
  const day = date.getDate();
  const w = JP_DOW[date.getDay()];
  return `${m}/${day}(${w})`;
}

function MonthBar({
  label,
  seconds,
  maxSeconds,
}: {
  label: string;
  seconds: number;
  maxSeconds: number;
}) {
  const w = maxSeconds <= 0 ? 0 : Math.round((seconds / maxSeconds) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="w-14 text-xs text-black/60 tabular-nums">{label}</div>
      <div className="flex-1">
        <div className="h-3 rounded-full bg-black/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-black/70"
            style={{ width: `${w}%` }}
          />
        </div>
      </div>
      <div className="w-16 text-right text-xs text-black/60 tabular-nums">
        {formatDurationJP(seconds)}
      </div>
    </div>
  );
}

export default function StudyMonthPage() {
  const { state } = useApp();

  const now = useMemo(() => new Date(), []);
  const monthStart = useMemo(() => startOfMonth(now), [now]);
  const monthEnd = useMemo(() => endOfMonth(now), [now]);

  const days = useMemo(() => {
    const totalDays = monthEnd.getDate(); // 1..末日
    return Array.from({ length: totalDays }).map((_, i) =>
      addDays(monthStart, i)
    );
  }, [monthStart, monthEnd]);

  const rows = useMemo(() => {
    return days.map((d) => {
      const key = getDateKey(d);
      const sum = state.studyByDate?.[key];
      return {
        date: d,
        dateKey: key,
        seconds: typeof sum?.totalSeconds === "number" ? sum.totalSeconds : 0,
        sessions: typeof sum?.sessions === "number" ? sum.sessions : 0,
      };
    });
  }, [days, state.studyByDate]);

  const maxSeconds = useMemo(
    () => Math.max(1, ...rows.map((r) => r.seconds)),
    [rows]
  );

  const totalMonth = useMemo(
    () => rows.reduce((a, b) => a + b.seconds, 0),
    [rows]
  );

  return (
    <main className="bg-[#FFFBEEDB] min-h-screen pt-[calc(env(safe-area-inset-top)+12px)] pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <div className="mx-auto max-w-md px-4 pb-6 space-y-4">
        <header className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-xl font-bold">月間学習推移</div>
              <div className="text-sm text-black/60">
                {formatJPFullDateTime(new Date())}
              </div>
            </div>

            <Link
              href="/dashboard"
              className="text-sm rounded-lg border border-black/15 px-3 py-1 bg-white hover:bg-black/5"
            >
              ダッシュボードへ
            </Link>
          </div>

          <StudyTabs active="month" />
        </header>

        <section className="rounded-2xl bg-white/80 shadow-sm p-4 border border-black/5">
          <div className="text-sm font-semibold text-black/70">今月 合計</div>
          <div className="mt-1 text-2xl font-extrabold tabular-nums">
            {formatDurationJP(totalMonth)}
          </div>

          {/* 月は多いのでスクロール枠 */}
          <div className="mt-3 max-h-90 overflow-auto pr-1 space-y-3">
            {rows.map((r) => (
              <MonthBar
                key={r.dateKey}
                label={fmtMDWCompact(r.date)} // ✅ 曜日追加（コンパクト）
                seconds={r.seconds}
                maxSeconds={maxSeconds}
              />
            ))}
          </div>

          <div className="mt-3 text-[11px] text-black/45">
            ※ state.studyByDate を元にしています（追加ボタン/タイマー等も合算）
          </div>
        </section>

        <section className="rounded-2xl bg-white/80 shadow-sm p-4 border border-black/5">
          <div className="font-bold mb-2">日別の内訳</div>
          <div className="space-y-2">
            {rows
              .slice()
              .reverse()
              .map((r) => (
                <div
                  key={r.dateKey}
                  className="rounded-xl border bg-white px-3 py-2 flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <div className="font-semibold">{fmtMDW(r.date)}</div>
                    <div className="text-xs text-black/60">
                      {r.sessions}科目
                    </div>
                  </div>
                  <div className="text-sm font-bold tabular-nums">
                    {formatDurationJP(r.seconds)}
                  </div>
                </div>
              ))}
          </div>
        </section>
      </div>
    </main>
  );
}
