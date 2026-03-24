// components/quiz/kango/KangoAnswerSheet.tsx
"use client";

import type { UserAnswer } from "@/lib/examTypes";
import type { KangoQuestion } from "@/lib/kango";

type AnswerMap = Record<string, UserAnswer>;

type Props = {
  questions: KangoQuestion[];
  answers: AnswerMap;
  currentIndex: number;
  onJump: (index: number) => void;
  onSelect: (questionId: string, choiceIndex: number) => void;
};

function isMultiLikeQuestion(q: KangoQuestion) {
  if (q.type === "multi") return true;
  if (q.type === "case" && Array.isArray(q.answer)) return true;
  return false;
}

function isSelected(value: UserAnswer, choiceIndex: number) {
  if (typeof value === "number") {
    return value === choiceIndex;
  }

  if (Array.isArray(value)) {
    return value.includes(choiceIndex);
  }

  return false;
}

function getChoiceCount(q: KangoQuestion) {
  if ("choices" in q && Array.isArray(q.choices)) {
    return q.choices.length;
  }
  return 0;
}

function getAnswerSummary(value: UserAnswer) {
  if (value === null) return "未回答";

  if (typeof value === "number") {
    return `${value + 1}`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "未回答";
    return value
      .slice()
      .sort((a, b) => a - b)
      .map((v) => String(v + 1))
      .join(", ");
  }

  if (typeof value === "string") {
    return value.trim().length > 0 ? "入力済み" : "未回答";
  }

  return "未回答";
}

function getQuestionBadge(q: KangoQuestion) {
  switch (q.type) {
    case "single":
      return "1つ";
    case "multi":
      return q.selectCount ? `${q.selectCount}つ` : "複数";
    case "combo":
      return "組合せ";
    case "text":
      return "記述";
    case "case":
      return Array.isArray(q.answer)
        ? q.selectCount
          ? `${q.selectCount}つ`
          : "複数"
        : "事例";
    default:
      return "";
  }
}

export function KangoAnswerSheet({
  questions,
  answers,
  currentIndex,
  onJump,
  onSelect,
}: Props) {
  const maxChoiceCount = Math.max(
    4,
    ...questions.map((q) => getChoiceCount(q))
  );

  return (
    <section className="rounded-2xl border border-black/10 bg-white/80 p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-bold text-black sm:text-lg">
          解答用紙（マーク式）
        </h2>
        <div className="text-[11px] text-black/50 sm:text-xs">
          ※ single は1つ選択 / multi は複数選択
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed border-collapse text-xs sm:text-sm">
          <thead>
            <tr>
              <th className="w-20 border border-black/10 bg-gray-50 px-2 py-2 text-left sm:w-28 sm:px-3 sm:py-2">
                問題
              </th>

              {Array.from({ length: maxChoiceCount }).map((_, idx) => (
                <th
                  key={idx}
                  className="w-14 border border-black/10 bg-gray-50 px-1 py-2 text-center sm:w-20 sm:px-3 sm:py-2"
                >
                  {idx + 1}
                </th>
              ))}

              <th className="w-16 border border-black/10 bg-gray-50 px-1 py-2 text-center sm:w-20 sm:px-3 sm:py-2">
                種別
              </th>
              <th className="w-16 border border-black/10 bg-gray-50 px-1 py-2 text-center sm:w-24 sm:px-3 sm:py-2">
                回答
              </th>
            </tr>
          </thead>

          <tbody>
            {questions.map((q, idx) => {
              const value = answers[q.id] ?? null;
              const isActive = idx === currentIndex;
              const choiceCount = getChoiceCount(q);
              const multiLike = isMultiLikeQuestion(q);

              return (
                <tr key={q.id} className={isActive ? "bg-blue-50" : ""}>
                  <td className="border border-black/10 px-2 py-2 sm:px-3 sm:py-2">
                    <button
                      type="button"
                      onClick={() => onJump(idx)}
                      className={[
                        "rounded-md px-2 py-1 font-semibold",
                        "text-sm sm:text-lg",
                        isActive
                          ? "bg-blue-600 text-white"
                          : "bg-transparent text-black hover:bg-gray-100",
                      ].join(" ")}
                    >
                      AM {q.no}
                    </button>
                  </td>

                  {Array.from({ length: maxChoiceCount }).map(
                    (_, choiceIndex) => {
                      const outOfRange = choiceIndex >= choiceCount;
                      const selected = isSelected(value, choiceIndex);

                      return (
                        <td
                          key={choiceIndex}
                          className="border border-black/10 px-1 py-2 text-center sm:px-3 sm:py-2"
                        >
                          {q.type === "text" ? (
                            <span className="text-[10px] text-black/30 sm:text-xs">
                              —
                            </span>
                          ) : outOfRange ? (
                            <span className="text-[10px] text-black/30 sm:text-xs">
                              —
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onSelect(q.id, choiceIndex)}
                              className={[
                                "inline-flex items-center justify-center rounded-full border font-bold transition",
                                "h-8 w-8 text-sm sm:h-10 sm:w-10 sm:text-sm",
                                selected
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : "border-black/20 bg-white hover:bg-gray-100",
                              ].join(" ")}
                              aria-label={`AM ${q.no} の選択肢 ${choiceIndex + 1}`}
                            >
                              {multiLike
                                ? selected
                                  ? "✓"
                                  : choiceIndex + 1
                                : choiceIndex + 1}
                            </button>
                          )}
                        </td>
                      );
                    }
                  )}

                  <td className="border border-black/10 px-1 py-2 text-center sm:px-3 sm:py-2">
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-black/70 sm:px-2 sm:py-1 sm:text-xs">
                      {getQuestionBadge(q)}
                    </span>
                  </td>

                  <td className="border border-black/10 px-1 py-2 text-center sm:px-3 sm:py-2">
                    <span className="text-[10px] text-black/70 sm:text-xs">
                      {getAnswerSummary(value)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
