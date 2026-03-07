// app/dashboard/kokugo/history/[id]/page.tsx
"use client";

import { useApp } from "@/lib/state";
import { useParams, useRouter } from "next/navigation";

const choiceLabel = (v: number | null) =>
  v === null ? "—" : ("①②③④"[v] ?? "—");

export default function Page() {
  const { state } = useApp();
  const params = useParams();
  const router = useRouter();

  const id = params?.id as string;

  const attempt = state.kokugoAttempts.find((a) => a.id === id) ?? null;

  if (!attempt) {
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-3">
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

        <div className="rounded-2xl border bg-white p-4">
          履歴が見つかりません
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      {/* ✅ 上部ボタン */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{attempt.examTitle}</h1>

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

      <div className="rounded-2xl border bg-white p-4">
        <div className="text-sm text-black/60">
          {new Date(attempt.createdAt).toLocaleString()}
        </div>
        <div className="text-2xl font-extrabold mt-2">
          {attempt.total} / {attempt.maxTotal}
        </div>
        <div className="text-sm text-black/60 mt-1">
          正答数 {attempt.correctCount}/{attempt.answeredCount}
        </div>
      </div>

      {/* ✅ 正解/不正解が見えない件：ここで表示します */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="font-bold mb-2">採点詳細</div>

        <div className="space-y-2">
          {attempt.details.map((d) => {
            const isCorrect = d.chosen !== null && d.chosen === d.correctChoice;

            const rowBg =
              d.chosen === null
                ? "bg-black/5"
                : isCorrect
                  ? "bg-emerald-50"
                  : "bg-rose-50";

            //const mark = d.chosen === null ? "—" : isCorrect ? "正解〇" : "✖";

            const mark =
              d.chosen === null ? (
                "—"
              ) : isCorrect ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-green-500 text-green-600 text-sm font-semibold">
                  正解 <span className="ml-1">〇</span>
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-red-500 text-red-600 text-sm font-semibold">
                  不正解 <span className="ml-1">✖</span>
                </span>
              );

            return (
              <div key={d.qid} className={`rounded-xl border p-3 ${rowBg}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">
                    第{d.dai}問 / 問{d.no}（解答番号 {d.answerNo}）
                  </div>
                  <div
                    className={`font-extrabold ${
                      d.chosen === null
                        ? "text-black/50"
                        : isCorrect
                          ? "text-emerald-700"
                          : "text-rose-700"
                    }`}
                  >
                    {mark}
                  </div>
                </div>

                {d.prompt ? (
                  <div className="text-sm mt-2 whitespace-pre-wrap">
                    {d.prompt}
                  </div>
                ) : null}

                <div className="text-sm mt-2">
                  あなた：
                  <span className="font-semibold">{choiceLabel(d.chosen)}</span>
                  <span className="mx-2 text-black/40">/</span>
                  正解：
                  <span className="font-semibold">
                    {choiceLabel(d.correctChoice)}
                  </span>
                  <span className="mx-2 text-black/40">/</span>
                  得点：
                  <span className="font-semibold">
                    {d.got}/{d.max}
                  </span>
                </div>

                {d.explanation ? (
                  <div className="text-xs text-black/60 mt-2 whitespace-pre-wrap">
                    解説：{d.explanation}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
