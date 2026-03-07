// app/dashboard/kokugo/history/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useApp, type KokugoAttempt } from "@/lib/state";
import { useRouter } from "next/navigation";

export default function Page() {
  const { state } = useApp();
  const router = useRouter();

  const [yearFilter, setYearFilter] = useState<number | "all">("all");

  const attempts = state.kokugoAttempts;

  const filtered = useMemo((): KokugoAttempt[] => {
    if (yearFilter === "all") return attempts;
    return attempts.filter((a) => a.examId.includes(String(yearFilter)));
  }, [attempts, yearFilter]);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      {/* 上部ボタン */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">国語 採点履歴</h1>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-3 py-2 rounded-xl border bg-white hover:bg-black/5"
          >
            ← 前に戻る
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="px-3 py-2 rounded-xl border bg-white hover:bg-black/5"
          >
            ダッシュボードに戻る
          </button>
        </div>
      </div>

      {/* 年度フィルタ */}
      <div className="flex gap-2">
        <button
          onClick={() => setYearFilter("all")}
          className={`px-3 py-2 rounded-xl border ${
            yearFilter === "all" ? "bg-black text-white" : "bg-white"
          }`}
        >
          すべて
        </button>

        <button
          onClick={() => setYearFilter(2025)}
          className={`px-3 py-2 rounded-xl border ${
            yearFilter === 2025 ? "bg-black text-white" : "bg-white"
          }`}
        >
          2025
        </button>

        <button
          onClick={() => setYearFilter(2024)}
          className={`px-3 py-2 rounded-xl border ${
            yearFilter === 2024 ? "bg-black text-white" : "bg-white"
          }`}
        >
          2024
        </button>

        <button
          onClick={() => setYearFilter(2023)}
          className={`px-3 py-2 rounded-xl border ${
            yearFilter === 2023 ? "bg-black text-white" : "bg-white"
          }`}
        >
          2023
        </button>
      </div>

      {/* 一覧 */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-sm text-black/60">履歴がありません</div>
        ) : (
          filtered.map((a) => (
            <div
              key={a.id}
              className="border rounded-2xl p-4 bg-white cursor-pointer hover:bg-black/5"
              onClick={() => router.push(`/dashboard/kokugo/history/${a.id}`)}
            >
              <div className="font-semibold">{a.examTitle}</div>
              <div className="text-sm text-black/60">
                {new Date(a.createdAt).toLocaleString()}
              </div>
              <div className="text-lg font-bold mt-1">
                {a.total} / {a.maxTotal}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
