// components/quiz/kokugo/AnswerSheet.tsx
"use client";

import { useMemo } from "react";
import type { KokugoExam, KokugoQuestion } from "@/lib/kokugo";
import type { AnswerState, GradeDetailRow } from "@/lib/kokugoGrade";

type Props = {
  exam: KokugoExam;
  answers: AnswerState;
  onChange: (qid: string, choice: number) => void;
  showResultColors?: boolean;
  details?: GradeDetailRow[];
};

type Row = {
  key: string;
  q: KokugoQuestion;
  answerNo: number;
  showDaiLabel: boolean;
  daiRowSpan: number;
  showNoLabel: boolean;
  noRowSpan: number;
};

export function AnswerSheet({
  exam,
  answers,
  onChange,
  showResultColors = false,
  details,
}: Props) {
  const rows: Row[] = useMemo(() => {
    const all = exam.dais.flatMap((d) => d.questions);
    const qs = all.filter((q) => typeof q.answerNo === "number");
    qs.sort((a, b) => (a.answerNo ?? 0) - (b.answerNo ?? 0));

    const out: Row[] = [];
    let i = 0;

    while (i < qs.length) {
      const cur = qs[i];
      const curDai = cur.dai;

      let daiEnd = i;
      while (daiEnd < qs.length && qs[daiEnd].dai === curDai) daiEnd++;
      const daiSpan = daiEnd - i;

      let j = i;
      while (j < daiEnd) {
        const curNo = qs[j].no;

        let noEnd = j;
        while (noEnd < daiEnd && qs[noEnd].no === curNo) noEnd++;
        const noSpan = noEnd - j;

        for (let k = j; k < noEnd; k++) {
          out.push({
            key: `${qs[k].id}-${qs[k].answerNo}`,
            q: qs[k],
            answerNo: qs[k].answerNo!,
            showDaiLabel: k === i,
            daiRowSpan: daiSpan,
            showNoLabel: k === j,
            noRowSpan: noSpan,
          });
        }

        j = noEnd;
      }

      i = daiEnd;
    }

    return out;
  }, [exam]);

  const judgeByQid = useMemo(() => {
    if (!details) return null;
    const map = new Map<string, { answered: boolean; correct: boolean }>();
    for (const r of details) {
      const answered = r.chosen !== null;
      const correct = answered && r.chosen === r.correctChoice;
      map.set(r.qid, { answered, correct });
    }
    return map;
  }, [details]);

  return (
    <section className="rounded-2xl border bg-white/80 p-3 sm:p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:justify-between">
        <div className="text-base font-bold sm:text-lg">
          解答用紙（マーク式）
        </div>

        <div className="text-[11px] text-black/50 sm:text-xs">
          ※解答番号（answerNo）順
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-120 border-collapse table-fixed sm:min-w-180">
          <thead>
            <tr>
              {/* 大問 */}
              <th className="w-7 border bg-black/5 px-0 py-1 text-center text-[9px] sm:w-10 sm:px-2 sm:py-2 sm:text-xs">
                大問
              </th>

              {/* 設問 */}
              <th className="w-5 border bg-black/5 px-0 py-1 text-center text-[9px] sm:w-9 sm:px-2 sm:py-2 sm:text-xs">
                設問
              </th>

              {/* 解答 */}
              <th className="w-4 border bg-black/5 px-0 py-1 text-center text-[9px] sm:w-8 sm:px-2 sm:py-2 sm:text-xs">
                解答
              </th>

              {/* 🔥 ①②さらに細く */}
              <th className="w-9 border bg-black/5 px-0 py-1.5 text-center text-[10px] sm:px-3 sm:py-2 sm:text-sm">
                ①
              </th>
              <th className="w-9 border bg-black/5 px-0 py-1.5 text-center text-[10px] sm:px-3 sm:py-2 sm:text-sm">
                ②
              </th>
              <th className="w-9 border bg-black/5 px-0 py-1.5 text-center text-[10px] sm:px-3 sm:py-2 sm:text-sm">
                ③
              </th>
              <th className="w-9 border bg-black/5 px-0 py-1.5 text-center text-[10px] sm:px-3 sm:py-2 sm:text-sm">
                ④
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => {
              const chosen = answers[r.q.id]?.chosen ?? null;

              let cellBg = "";
              if (showResultColors && judgeByQid) {
                const j = judgeByQid.get(r.q.id);
                if (!j || !j.answered) cellBg = "bg-gray-50";
                else cellBg = j.correct ? "bg-emerald-50" : "bg-rose-50";
              }

              return (
                <tr key={r.key}>
                  <td
                    className={`w-7 border px-0 py-1 text-center text-[9px] font-bold sm:w-10 sm:px-2 sm:py-2 sm:text-sm ${cellBg}`}
                  >
                    第{r.q.dai}問
                  </td>

                  <td
                    className={`w-5 border px-0 py-1 text-center text-[9px] font-bold sm:w-9 sm:px-2 sm:py-2 sm:text-sm ${cellBg}`}
                  >
                    問{r.q.no}
                  </td>

                  <td
                    className={`w-4 border px-0 py-1 text-center text-[9px] font-semibold sm:w-8 sm:px-2 sm:py-2 sm:text-xs ${cellBg}`}
                  >
                    {r.answerNo}
                  </td>

                  {/* 🔥 選択肢もさらに圧縮 */}
                  {r.q.choices.slice(0, 4).map((_, i) => {
                    const checked = chosen === i;

                    return (
                      <td
                        key={i}
                        className={`w-9 border px-0 py-1.5 text-center sm:px-2 sm:py-2 ${cellBg}`}
                      >
                        <button
                          type="button"
                          onClick={() => onChange(r.q.id, i)}
                          className={[
                            "inline-flex items-center justify-center rounded-full border bg-white/70",
                            "h-5 w-5 sm:h-9 sm:w-9", // 🔥 小さく
                            checked ? "border-blue-600" : "border-black/30",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "rounded-full",
                              "h-2 w-2 sm:h-4 sm:w-4", // 🔥 小さく
                              checked ? "bg-blue-600" : "bg-transparent",
                            ].join(" ")}
                          />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
