// lib/kokugoAnswer.ts
import type { KokugoExam, KokugoQuestion } from "@/lib/kokugo";

export type AnswerIndexItem = {
  dai: number;
  qid: string;
  qNo: number;
  ansNo: number; // 解答番号（1〜）
  slot: number; // 0-based
  slotsTotal: number; // その設問の枠数
  question: KokugoQuestion;
};

const SLOT_PLAN_2025: Record<string, number> = {
  "1-1": 5,
  // ...（必要なら残す）
};

function getSlotsForQuestion(exam: KokugoExam, q: KokugoQuestion): number {
  // ✅ ① questions.json に answerNo がある設問は「すでに解答番号で管理できてる」
  //    → 余計な slot 展開をしない
  if (typeof q.answerNo === "number") {
    return typeof q.slots === "number" && q.slots > 0 ? q.slots : 1;
  }

  // ✅ ② slots 明示があればそれを使う
  if (typeof q.slots === "number" && q.slots > 0) return q.slots;

  // ✅ ③ answerNo が無い 2025（レガシー）だけ plan を使う
  const is2025 =
    exam.year === 2025 ||
    (typeof exam.title === "string" && exam.title.includes("2025"));

  if (!is2025) return 1;

  const key = `${q.dai}-${q.no}`;
  return SLOT_PLAN_2025[key] ?? 1;
}

/**
 * 解答用紙表示のために
 * 「解答番号（1〜）」を設問に割り当てして一覧化
 */
export function buildAnswerIndex(exam: KokugoExam): AnswerIndexItem[] {
  const out: AnswerIndexItem[] = [];

  // ✅ answerNo がある設問は answerNo 順が最優先（本番の解答用紙どおり）
  const qs = exam.dais.flatMap((d) => d.questions);
  const withAnswerNo = qs.filter((q) => typeof q.answerNo === "number");
  //const withoutAnswerNo = qs.filter((q) => typeof q.answerNo !== "number");

  // --- answerNo がある設問 ---
  withAnswerNo.sort((a, b) => a.answerNo! - b.answerNo!);

  for (const q of withAnswerNo) {
    const start = q.answerNo!;
    const slots = getSlotsForQuestion(exam, q);

    for (let s = 0; s < slots; s++) {
      out.push({
        dai: q.dai,
        qid: q.id,
        qNo: q.no,
        ansNo: start + s,
        slot: s,
        slotsTotal: slots,
        question: q,
      });
    }
  }

  // --- answerNo が無い設問（レガシー用） ---
  // こちらは必要なら ansNo を連番で付けたいが、今の2025は不要なはずなので省略でもOK

  return out;
}
