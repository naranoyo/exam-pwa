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
 * q.answer は kokugo.ts 側で normalize 済みなので、
 * 基本はそのまま 0-based として扱う。
 * 念のため異常値だけ丸める。
 */
function normalizeCorrectChoice(raw: number, len: number): number {
  const v = Number(raw);
  if (!Number.isFinite(v)) return 0;
  return clampChoice(v, len);
}

function getQuestionsInAnswerNoOrder(exam: KokugoExam): KokugoQuestion[] {
  const all = exam.dais.flatMap((d) => d.questions);
  const withAnswerNo = all.filter((q) => typeof q.answerNo === "number");

  withAnswerNo.sort((a, b) => {
    const aa = a.answerNo ?? 999999;
    const bb = b.answerNo ?? 999999;
    if (aa !== bb) return aa - bb;
    if (a.dai !== b.dai) return a.dai - b.dai;
    return a.no - b.no;
  });

  return withAnswerNo;
}

export function gradeKokugo(
  exam: KokugoExam,
  answers: AnswerState
): GradeResult {
  const perDai: Record<number, { got: number; max: number }> = {};
  for (const d of exam.dais) {
    perDai[d.dai] = { got: 0, max: 0 };
  }

  let total = 0;
  let maxTotal = 0;
  let correctCount = 0;
  let answeredCount = 0;

  const details: GradeDetailRow[] = [];
  const qs = getQuestionsInAnswerNoOrder(exam);

  for (const q of qs) {
    const pts = q.score ?? 1;
    const len = q.choices?.length ?? 4;

    maxTotal += pts;
    perDai[q.dai].max += pts;

    const chosen = answers[q.id]?.chosen ?? null;
    if (chosen !== null) answeredCount += 1;

    const correctChoice = normalizeCorrectChoice(q.answer, len);
    const isCorrect = chosen !== null && chosen === correctChoice;
    const got = isCorrect ? pts : 0;

    total += got;
    perDai[q.dai].got += got;
    if (isCorrect) correctCount += 1;

    details.push({
      key: `${q.id}-${q.answerNo ?? 0}`,
      qid: q.id,
      answerNo: q.answerNo ?? 0,
      dai: q.dai,
      no: q.no,
      chosen,
      correctChoice,
      got,
      max: pts,
    });
  }

  return {
    total,
    maxTotal,
    perDai,
    details,
    correctCount,
    answeredCount,
  };
}

/** 偏差値 */
export function calcHensachi(score: number, mean: number, sd: number) {
  if (!Number.isFinite(score) || !Number.isFinite(mean) || !Number.isFinite(sd))
    return null;
  if (sd <= 0) return null;
  return 50 + ((score - mean) / sd) * 10;
}

/** 標準正規分布の CDF 近似 */
function normalCdf(z: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);

  let p =
    1 -
    d *
      t *
      (0.31938153 +
        t *
          (-0.356563782 +
            t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));

  if (z < 0) p = 1 - p;
  return p;
}

/**
 * 順位推定（正規分布仮定）
 * percentile:
 *   下から何%か（高得点ほど大きい）
 * upperPercent:
 *   上位何%か（小さいほど上位）
 */
export function estimateRank(
  score: number,
  mean: number,
  sd: number,
  examinees: number
) {
  if (
    !Number.isFinite(score) ||
    !Number.isFinite(mean) ||
    !Number.isFinite(sd) ||
    !Number.isFinite(examinees)
  ) {
    return null;
  }

  if (sd <= 0 || examinees <= 0) return null;

  const z = (score - mean) / sd;
  const percentile = normalCdf(z) * 100; // 下から何%
  const upperPercent = 100 - percentile; // 上位何%

  // 上からの順位（1位が最上位）
  const rank = Math.max(
    1,
    Math.min(examinees, Math.round((upperPercent / 100) * examinees))
  );

  return {
    rank,
    percentile,
    upperPercent,
  };
}
