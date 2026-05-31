// app/dashboard/kango/history/[id]/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getKangoHistoryById } from "@/lib/kangoHistory";

type KangoHistoryDetail = ReturnType<typeof getKangoHistoryById>;

function choiceLabel(value: number | number[] | string | null) {
  if (value === null) return "—";

  if (typeof value === "number") {
    return "①②③④⑤⑥⑦⑧⑨"[value] ?? String(value + 1);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value
      .slice()
      .sort((a, b) => a - b)
      .map((v) => "①②③④⑤⑥⑦⑧⑨"[v] ?? String(v + 1))
      .join("、");
  }

  return value.trim() || "—";
}

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [item, setItem] = useState<KangoHistoryDetail>(null);

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      setItem(getKangoHistoryById(id));
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [id]);

  if (!item) {
    return (
      <div className="mx-auto max-w-4xl space-y-3 p-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border bg-white px-3 py-2 hover:bg-black/5"
          >
            ← 前に戻る
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-xl border bg-white px-3 py-2 hover:bg-black/5"
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
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{item.title}</h1>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border bg-white px-3 py-2 hover:bg-black/5"
          >
            ← 前に戻る
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-xl border bg-white px-3 py-2 hover:bg-black/5"
          >
            ダッシュボードに戻る
          </button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <div className="text-sm text-black/60">
          {new Date(item.createdAt).toLocaleString()}
        </div>

        <div className="mt-2 text-2xl font-extrabold">
          {item.score} / {item.total}
        </div>

        <div className="mt-1 text-sm text-black/60">正答率 {item.percent}%</div>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-2 font-bold">採点詳細</div>

        <div className="space-y-2">
          {item.answers.map((answer) => {
            const unanswered =
              answer.userAnswer === null ||
              (Array.isArray(answer.userAnswer) &&
                answer.userAnswer.length === 0) ||
              answer.userAnswer === "";

            const rowBg = unanswered
              ? "bg-black/5"
              : answer.isCorrect
                ? "bg-emerald-50"
                : "bg-rose-50";

            const mark = unanswered ? (
              <span className="text-black/40">—</span>
            ) : answer.isCorrect ? (
              <span className="inline-flex items-center rounded-md border border-green-500 px-2 py-0.5 text-sm font-semibold text-green-600">
                正解 <span className="ml-1">〇</span>
              </span>
            ) : (
              <span className="inline-flex items-center rounded-md border border-red-500 px-2 py-0.5 text-sm font-semibold text-red-600">
                不正解 <span className="ml-1">✖</span>
              </span>
            );

            return (
              <div
                key={answer.questionId}
                className={`rounded-xl border p-3 ${rowBg}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">AM {answer.no}</div>
                  <div>{mark}</div>
                </div>

                {answer.question ? (
                  <div className="mt-2 whitespace-pre-wrap text-sm">
                    {answer.question}
                  </div>
                ) : null}

                <div className="mt-2 text-sm">
                  あなた：
                  <span className="font-semibold">
                    {choiceLabel(answer.userAnswer)}
                  </span>
                  <span className="mx-2 text-black/40">/</span>
                  正解：
                  <span className="font-semibold">
                    {choiceLabel(answer.correctAnswer)}
                  </span>
                </div>

                {answer.explanation ? (
                  <div className="mt-2 whitespace-pre-wrap text-xs text-black/60">
                    解説：{answer.explanation}
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
