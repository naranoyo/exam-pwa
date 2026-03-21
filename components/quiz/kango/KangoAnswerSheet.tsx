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
    <section className="rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-black">解答用紙（マーク式）</h2>
        <div className="text-xs text-black/50">
          ※ single は1つ選択 / multi は複数選択
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-black/10 bg-gray-50 px-3 py-2 text-left">
                問題
              </th>

              {Array.from({ length: maxChoiceCount }).map((_, idx) => (
                <th
                  key={idx}
                  className="border border-black/10 bg-gray-50 px-3 py-2 text-center"
                >
                  {idx + 1}
                </th>
              ))}

              <th className="border border-black/10 bg-gray-50 px-3 py-2 text-center">
                種別
              </th>
              <th className="border border-black/10 bg-gray-50 px-3 py-2 text-center">
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
                  <td className="border border-black/10 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onJump(idx)}
                      className={`rounded-md px-2 py-1 font-semibold ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : "bg-transparent text-black hover:bg-gray-100"
                      }`}
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
                          className="border border-black/10 px-3 py-2 text-center"
                        >
                          {q.type === "text" ? (
                            <span className="text-xs text-black/30">—</span>
                          ) : outOfRange ? (
                            <span className="text-xs text-black/30">—</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onSelect(q.id, choiceIndex)}
                              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold transition ${
                                selected
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : "border-black/20 bg-white hover:bg-gray-100"
                              }`}
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

                  <td className="border border-black/10 px-3 py-2 text-center">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-black/70">
                      {getQuestionBadge(q)}
                    </span>
                  </td>

                  <td className="border border-black/10 px-3 py-2 text-center">
                    <span className="text-xs text-black/70">
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
