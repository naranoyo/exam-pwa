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
    <section className="rounded-2xl bg-white/80 border p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-lg font-bold">解答用紙（マーク式）</div>

        {showResultColors ? (
          <div className="flex items-center gap-3 text-xs text-black/60">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-emerald-100 border border-emerald-200" />
              正解
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-rose-100 border border-rose-200" />
              不正解
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-gray-100 border border-gray-200" />
              未回答
            </span>
            <span className="ml-2">※解答番号（answerNo）順</span>
          </div>
        ) : (
          <div className="text-xs text-black/50">※解答番号（answerNo）順</div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-180 w-full border-collapse">
          <thead>
            <tr>
              <th className="border px-3 py-2 bg-black/5 text-center w-28">
                大問
              </th>
              <th className="border px-3 py-2 bg-black/5 text-center w-24">
                設問
              </th>
              <th className="border px-3 py-2 bg-black/5 text-center w-28">
                解答番号
              </th>
              <th className="border px-3 py-2 bg-black/5 text-center">①</th>
              <th className="border px-3 py-2 bg-black/5 text-center">②</th>
              <th className="border px-3 py-2 bg-black/5 text-center">③</th>
              <th className="border px-3 py-2 bg-black/5 text-center">④</th>
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
                    className={`border px-3 py-2 font-bold text-center align-middle ${cellBg}`}
                  >
                    第{r.q.dai}問
                  </td>

                  <td
                    className={`border px-3 py-2 font-bold text-center align-middle ${cellBg}`}
                  >
                    問{r.q.no}
                  </td>

                  <td
                    className={`border px-3 py-2 text-center font-semibold ${cellBg}`}
                  >
                    {r.answerNo}
                  </td>

                  {r.q.choices.slice(0, 4).map((_, i) => {
                    const checked = chosen === i;
                    return (
                      <td
                        key={i}
                        className={`border px-3 py-2 text-center ${cellBg}`}
                      >
                        <button
                          type="button"
                          onClick={() => onChange(r.q.id, i)}
                          className={[
                            "inline-flex items-center justify-center",
                            "w-7 h-7 rounded-full border",
                            checked ? "border-blue-600" : "border-black/30",
                            "bg-white/70",
                          ].join(" ")}
                          aria-label={`解答番号${r.answerNo}を${i + 1}にする`}
                        >
                          <span
                            className={[
                              "w-3.5 h-3.5 rounded-full",
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
