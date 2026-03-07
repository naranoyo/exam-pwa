// lib/kokugoGrade.ts
import type { KokugoExam, KokugoQuestion } from "@/lib/kokugo";

export type AnswerState = Record<
  string,
  { chosen: number | null; msSpent?: number }
>;

export type GradeDetailRow = {
  key: string;
  qid: string;
  answerNo: number;
  dai: number;
  no: number;

  chosen: number | null; // 0-based
  correctChoice: number; // 0-based
  got: number;
  max: number;
};

export type GradeResult = {
  total: number;
  maxTotal: number;
  perDai: Record<number, { got: number; max: number }>;
  details: GradeDetailRow[];
  correctCount: number;
  answeredCount: number;
};

function clampChoice(v: number, len: number) {
  if (!Number.isFinite(v)) return 0;
  const max = Math.max(0, len - 1);
  return Math.min(Math.max(0, v), max);
}

/**
 * answer が 0-based か 1-based かを「全体」から推定
 * - 4択なら 4 が混ざっていたらほぼ 1-based
 * - 0 が混ざっていたらほぼ 0-based
 */
function detectAnswerBase(qs: KokugoQuestion[]): 0 | 1 {
  const lens = qs.map((q) => q.choices?.length ?? 4);
  const maxLen = Math.max(...lens, 4);

  const answers = qs.map((q) => q.answer);
  if (answers.some((a) => a === 0)) return 0;
  if (answers.some((a) => a === maxLen)) return 1;

  // どちらとも断定できない場合は「0-based」を既定に（あなたのデータがこれ）
  return 0;
}

function normalizeCorrectChoice(raw: number, len: number, base: 0 | 1): number {
  const v = Number(raw);
  if (!Number.isFinite(v)) return 0;

  // 1-based の場合のみ -1
  const zeroBased = base === 1 ? v - 1 : v;
  return clampChoice(zeroBased, len);
}

function getQuestionsInAnswerNoOrder(exam: KokugoExam): KokugoQuestion[] {
  const all = exam.dais.flatMap((d) => d.questions);
  const withAnswerNo = all.filter((q) => typeof q.answerNo === "number");
  withAnswerNo.sort((a, b) => (a.answerNo ?? 0) - (b.answerNo ?? 0));
  return withAnswerNo;
}

export function gradeKokugo(
  exam: KokugoExam,
  answers: AnswerState
): GradeResult {
  const perDai: Record<number, { got: number; max: number }> = {};
  for (const d of exam.dais) perDai[d.dai] = { got: 0, max: 0 };

  let total = 0;
  let maxTotal = 0;
  let correctCount = 0;
  let answeredCount = 0;

  const details: GradeDetailRow[] = [];

  const qs = getQuestionsInAnswerNoOrder(exam);
  const base = detectAnswerBase(qs); // ★ここがズレ防止の核心

  for (const q of qs) {
    const pts = q.score ?? 1;
    const len = q.choices?.length ?? 4;

    maxTotal += pts;
    perDai[q.dai].max += pts;

    const chosen = answers[q.id]?.chosen ?? null;
    if (chosen !== null) answeredCount += 1;

    // ★ answer の 0/1-based を正規化してから比較
    const correctChoice = normalizeCorrectChoice(q.answer, len, base);
    const correct = chosen !== null && chosen === correctChoice;

    const got = correct ? pts : 0;

    total += got;
    perDai[q.dai].got += got;
    if (correct) correctCount += 1;

    details.push({
      key: `${q.id}-${q.answerNo}`,
      qid: q.id,
      answerNo: q.answerNo!,
      dai: q.dai,
      no: q.no,
      chosen,
      correctChoice,
      got,
      max: pts,
    });
  }

  return { total, maxTotal, perDai, details, correctCount, answeredCount };
}

/** 偏差値 */
export function calcHensachi(score: number, mean: number, sd: number) {
  if (!Number.isFinite(score) || !Number.isFinite(mean) || !Number.isFinite(sd))
    return null;
  if (sd <= 0) return null;
  return 50 + ((score - mean) / sd) * 10;
}

/** 順位推定（正規分布仮定） */
export function estimateRank(
  score: number,
  mean: number,
  sd: number,
  examinees: number
) {
  if (sd <= 0 || examinees <= 0) return null;

  const z = (score - mean) / sd;
  // 標準正規分布 CDF 近似（Abramowitz & Stegun）
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  let p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) p = 1 - p;

  const percentile = p * 100; // 下位%（小さいほど上位）
  const rank = Math.max(1, Math.min(examinees, Math.round(p * examinees)));

  return { rank, percentile };
}
