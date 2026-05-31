// app/dashboard/nihonshi/history/[id]/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getNihonshiHistoryById,
  type NihonshiHistoryEntry,
} from "@/lib/nihonshiHistory";

const choiceLabel = (v: number | string | null) => {
  if (v === null) return "未回答";
  if (typeof v === "number") return String(v + 1);
  return String(v);
};

export default function NihonshiHistoryDetailPage() {
  const params = useParams();
  const router = useRouter();

  const id = params?.id as string;

  const [attempt, setAttempt] = useState<NihonshiHistoryEntry | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAttempt(getNihonshiHistoryById(id));
      setIsLoaded(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [id]);

  if (!isLoaded) {
    return (
      <main className="mx-auto max-w-4xl space-y-3 p-4">
        <div className="text-sm text-black/60">読み込み中...</div>
      </main>
    );
  }

  if (!attempt) {
    return (
      <main className="mx-auto max-w-4xl space-y-3 p-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border bg-white px-4 py-3 text-sm font-semibold"
          >
            ← 前に戻る
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-xl border bg-white px-4 py-3 text-sm font-semibold"
          >
            ダッシュボードに戻る
          </button>
        </div>

        <section className="rounded-2xl border bg-white p-4">
          履歴が見つかりません
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">{attempt.examTitle}</h1>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border bg-white px-4 py-3 text-sm font-semibold"
          >
            ← 前に戻る
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-xl border bg-white px-4 py-3 text-sm font-semibold"
          >
            ダッシュボードに戻る
          </button>
        </div>
      </div>

      <section className="rounded-2xl border bg-white p-4">
        <div className="text-sm text-black/60">
          {new Date(attempt.createdAt).toLocaleString("ja-JP")}
        </div>

        <div className="mt-4 text-sm text-black/60">得点</div>

        <div className="mt-1 text-3xl font-extrabold">
          {attempt.total} / {attempt.maxTotal} 点
        </div>

        <div className="mt-2 text-sm text-black/60">
          正解数 {attempt.correctCount}/{attempt.answeredCount} / 正答率{" "}
          {attempt.percent}%{" "}
          {typeof attempt.hensachi === "number"
            ? `/ 偏差値 ${attempt.hensachi}`
            : ""}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4">
        <div className="mb-3 font-bold">採点詳細</div>

        <div className="space-y-2">
          {attempt.details.map((d) => {
            const answered = d.chosen !== null;
            const ok = answered && d.chosen === d.correctChoice;

            const rowBg = !answered
              ? "bg-gray-50 text-black/60"
              : ok
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700";

            return (
              <div
                key={d.qid}
                className={`rounded-xl border px-4 py-3 text-sm ${rowBg}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold">
                    第{d.dai}問 / 問{d.no}（解答番号 {d.answerNo}）
                  </div>

                  <div className="font-bold">
                    {!answered ? "未回答" : ok ? "正解〇" : "不正解✖"}
                  </div>
                </div>

                {d.question ? (
                  <div className="mt-2 whitespace-pre-wrap text-black/80">
                    {d.question}
                  </div>
                ) : null}

                <div className="mt-2 text-black/70">
                  あなた：{choiceLabel(d.chosen)}
                  <span className="mx-2 text-black/40">/</span>
                  正解：{choiceLabel(d.correctChoice)}
                  <span className="mx-2 text-black/40">/</span>
                  得点：{d.got}/{d.max}
                </div>

                {d.explanation ? (
                  <div className="mt-2 whitespace-pre-wrap text-xs text-black/60">
                    解説：{d.explanation}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
