// components/quiz/nihonshi/NihonshiAnswerSheet.tsx

"use client";

import type { NihonshiAnswerState, NihonshiQuestion } from "@/lib/nihonshi";

type Props = {
  questions: NihonshiQuestion[];
  answers: NihonshiAnswerState;
  currentIndex: number;
  onJump: (index: number) => void;
  onSelect: (questionId: string, choiceIndex: number) => void;
};

function formatAnswer(value: number | number[] | null) {
  if (value === null) return "未回答";

  if (Array.isArray(value)) {
    if (value.length === 0) return "未回答";
    return value
      .slice()
      .sort((a, b) => a - b)
      .map((v) => String(v + 1))
      .join(", ");
  }

  return String(value + 1);
}

export default function NihonshiAnswerSheet({
  questions,
  answers,
  currentIndex,
  onJump,
  onSelect,
}: Props) {
  const maxChoiceCount = Math.max(6, ...questions.map((q) => q.choices.length));

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">解答用紙（マーク式）</h2>
        <div className="text-xs text-black/50">
          ※ single は1つ選択 / multi は複数選択
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-225 border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-black/10 px-3 py-3 text-left">
                問題
              </th>

              {Array.from({ length: maxChoiceCount }).map((_, i) => (
                <th
                  key={i}
                  className="border border-black/10 px-3 py-3 text-center"
                >
                  {i + 1}
                </th>
              ))}

              <th className="border border-black/10 px-3 py-3 text-center">
                種別
              </th>
              <th className="border border-black/10 px-3 py-3 text-center">
                回答
              </th>
            </tr>
          </thead>

          <tbody>
            {questions.map((q, index) => {
              const value = answers[q.id] ?? null;

              return (
                <tr
                  key={q.id}
                  className={index === currentIndex ? "bg-blue-50" : "bg-white"}
                >
                  <td className="border border-black/10 px-3 py-3 font-bold">
                    <button
                      type="button"
                      onClick={() => onJump(index)}
                      className={
                        index === currentIndex
                          ? "rounded-md bg-blue-600 px-2 py-1 text-white"
                          : "px-2 py-1"
                      }
                    >
                      解答 {q.answerNo}
                    </button>
                  </td>

                  {Array.from({ length: maxChoiceCount }).map(
                    (_, choiceIndex) => {
                      const existsChoice = choiceIndex < q.choices.length;
                      const selected = Array.isArray(value)
                        ? value.includes(choiceIndex)
                        : value === choiceIndex;

                      return (
                        <td
                          key={choiceIndex}
                          className="border border-black/10 px-3 py-3 text-center"
                        >
                          {existsChoice ? (
                            <button
                              type="button"
                              onClick={() => onSelect(q.id, choiceIndex)}
                              className={[
                                "mx-auto flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold",
                                selected
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : "border-black/20 bg-white text-black hover:bg-gray-50",
                              ].join(" ")}
                            >
                              {choiceIndex + 1}
                            </button>
                          ) : (
                            <span className="text-black/20">―</span>
                          )}
                        </td>
                      );
                    }
                  )}

                  <td className="border border-black/10 px-3 py-3 text-center">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold">
                      {q.type === "multi" ? "複数" : "1つ"}
                    </span>
                  </td>

                  <td className="border border-black/10 px-3 py-3 text-center">
                    {formatAnswer(value)}
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
