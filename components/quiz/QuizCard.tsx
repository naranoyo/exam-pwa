"use client";

import { useMemo } from "react";
import type { Question } from "@/lib/quiz";
import type { KokugoQuestion } from "@/lib/kokugo";
import { ChoiceButton } from "@/components/quiz/ChoiceButton";

type Props = {
  q: Question | KokugoQuestion;
  index: number;
  total: number;
  chosen: number | null;
  onChoose: (chosen: number, msSpent: number) => void;
  onNext: () => void;

  /** ✅ 一時停止などで操作不可にする */
  disabled?: boolean;

  /** ✅ 共テ国語：ヘッダー表示用（任意） */
  kokugoMeta?: {
    daiTitle: string; // 例: 第1問
    daiLabel?: string; // 例: 評論
    no: number; // 問番号
  };

  /** ✅ 解答表示（解答一覧/復習で使う） */
  showAnswer?: boolean;
};

function isKokugoQuestion(x: Question | KokugoQuestion): x is KokugoQuestion {
  return (
    (x as KokugoQuestion).prompt !== undefined &&
    (x as KokugoQuestion).no !== undefined
  );
}

const circled = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"];

export function QuizCard({
  q,
  index,
  total,
  chosen,
  onChoose,
  onNext,
  disabled = false,
  kokugoMeta,
  showAnswer = false,
}: Props) {
  const isKokugo = isKokugoQuestion(q);

  const questionText = isKokugo ? q.prompt : q.question;

  const isCorrect = useMemo(() => {
    if (chosen === null) return null;
    return chosen === q.answer;
  }, [chosen, q.answer]);

  // 指示文（共テ国語は固定）
  const instruction = useMemo(() => {
    if (isKokugo) return "本文を踏まえて、最も適切なものを選びなさい。";
    return "正しい答えを選びなさい。";
  }, [isKokugo]);

  // 選択肢ラベル（共テ国語は①②③④）
  const choiceLabel = (i: number, text: string) => {
    if (isKokugo) return `${circled[i] ?? `${i + 1}`}　${text}`;
    return `${"ABCD"[i] ?? i + 1}. ${text}`;
  };

  // 解答表示用
  const correctLabel = isKokugo
    ? (circled[q.answer] ?? `${q.answer + 1}`)
    : `${"ABCD"[q.answer] ?? q.answer + 1}`;

  const chosenLabel =
    chosen === null
      ? "未回答"
      : isKokugo
        ? (circled[chosen] ?? `${chosen + 1}`)
        : `${"ABCD"[chosen] ?? chosen + 1}`;

  return (
    <section
      className={[
        "rounded-2xl bg-white/80 shadow-sm p-4 border border-black/5 space-y-4",
        disabled ? "opacity-75" : "",
      ].join(" ")}
    >
      {/* 上部（共テ国語は過去問風に） */}
      <div className="flex items-center justify-between text-xs text-black/60">
        <div>
          {index + 1} / {total}
        </div>

        {isKokugo ? (
          <div className="text-black/60">
            {kokugoMeta?.daiTitle ?? `第${q.dai}問`}
            {kokugoMeta?.daiLabel ? `（${kokugoMeta.daiLabel}）` : ""}
            {" / "}問{kokugoMeta?.no ?? q.no}
          </div>
        ) : (
          <div className="text-black/60">
            {"subject" in q ? `${q.subject} / ${q.category}` : ""}
          </div>
        )}
      </div>

      {/* ✅ 指示文 */}
      <div className="text-sm font-semibold text-black/70">{instruction}</div>

      {/* ✅ 問題文（共テ国語は「問1 …」の行を太めに） */}
      <div
        className={
          isKokugo
            ? "text-lg font-bold leading-snug"
            : "text-lg font-bold leading-snug"
        }
      >
        {questionText}
      </div>

      {/* ✅ 選択肢（過去問風：縦並び・余白・番号） */}
      <div className="grid gap-2">
        {q.choices.map((c, i) => {
          const selected = chosen === i;
          const alreadyAnswered = chosen !== null;

          // 解答表示時：正解・誤答を強調（押せない）
          const correct = i === q.answer;
          const wrongPicked =
            showAnswer && chosen !== null && selected && !correct;

          return (
            <ChoiceButton
              key={i}
              label={choiceLabel(i, c)}
              disabled={disabled || alreadyAnswered || showAnswer}
              selected={selected}
              onClick={() => onChoose(i, 0)}
              // ChoiceButton 側に className 受け口がない場合は無視されます（あれば活用）
              className={[
                isKokugo ? "text-left py-4" : "",
                showAnswer && correct ? "ring-2 ring-emerald-500" : "",
                showAnswer && wrongPicked ? "ring-2 ring-red-500" : "",
              ].join(" ")}
            />
          );
        })}
      </div>

      {/* ✅ 解答表示（answers/review用） */}
      {showAnswer && (
        <div className="rounded-xl bg-black/5 p-3 space-y-1">
          <div className="text-sm">
            正解：<b>{correctLabel}</b>
            {"　／　"}
            あなた：<b>{chosenLabel}</b>
            {chosen !== null ? (
              isCorrect ? (
                <span className="ml-2 font-bold text-emerald-700">✅ 正解</span>
              ) : (
                <span className="ml-2 font-bold text-red-700">❌ 不正解</span>
              )
            ) : null}
          </div>

          {isKokugo && (q as KokugoQuestion).tags?.length ? (
            <div className="text-xs text-black/60">
              タグ：{(q as KokugoQuestion).tags!.join(" / ")}
            </div>
          ) : null}
        </div>
      )}

      {/* ✅ 解くモード：回答後に次へ */}
      {!showAnswer && chosen !== null && (
        <button
          type="button"
          onClick={onNext}
          disabled={disabled}
          className={[
            "w-full rounded-xl bg-black px-3 py-3 text-sm font-semibold text-white",
            disabled ? "opacity-50 pointer-events-none" : "",
          ].join(" ")}
        >
          次へ
        </button>
      )}
    </section>
  );
}
