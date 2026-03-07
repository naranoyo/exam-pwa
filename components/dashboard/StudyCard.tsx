// components/dashboard/StudyCard.tsx
"use client";

import Link from "next/link";
import type { StudySummary } from "@/lib/state";

function clampInt(n: number) {
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

function formatDurationShortJP(sec: number) {
  const s = Math.max(0, clampInt(sec));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);

  if (hh > 0) return `${hh}時間${String(mm).padStart(2, "0")}分`;
  return `${mm}分`;
}

export function StudyCard({
  summary,
  onStartTimer,
}: {
  summary: StudySummary;
  onStartTimer: () => void;
}) {
  return (
    <section className="rounded-2xl bg-white/80 shadow-sm p-4 border border-black/5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold tracking-wide text-black/70">
          今日の学習
        </div>

        <Link
          href="/dashboard/study"
          className="text-xs rounded-lg border border-black/15 px-2 py-1 bg-white hover:bg-black/5"
        >
          詳細を見る
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Link
          href="/dashboard/study"
          className="rounded-xl bg-black/5 p-3 hover:bg-black/10 transition active:scale-[0.99]"
        >
          <div className="text-xs text-black/60">合計</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">
            {formatDurationShortJP(summary.totalSeconds)}
          </div>
          <div className="mt-1 text-[11px] text-black/45">タップで履歴</div>
        </Link>

        <Link
          href="/dashboard/study"
          className="rounded-xl bg-black/5 p-3 hover:bg-black/10 transition active:scale-[0.99]"
        >
          <div className="text-xs text-black/60">今日やった科目数</div>
          <div className="mt-1 text-2xl font-bold">{summary.sessions}科目</div>
          <div className="mt-1 text-[11px] text-black/45">タップで内訳</div>
        </Link>
      </div>

      <Link
        href="/quiz"
        className="mt-3 block w-full rounded-xl px-3 py-3 text-sm font-semibold text-center text-white active:scale-[0.99]"
        style={{
          background: "linear-gradient(to right, #ed2c00 0%, #ff8000 100%)",
        }}
      >
        学習を始める
      </Link>

      <button
        type="button"
        onClick={onStartTimer}
        className="mt-2 w-full rounded-xl px-3 py-3 text-sm font-semibold bg-black text-white active:scale-[0.99]"
      >
        タイマーを開始（次で実装）
      </button>

      <div className="mt-2 text-[11px] text-black/45">
        ※ 次にポモドーロ実装でここに連携します
      </div>
    </section>
  );
}
