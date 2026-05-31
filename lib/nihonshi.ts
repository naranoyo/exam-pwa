// lib/nihonshi.ts

export type NihonshiQuestion = {
  id: string;
  examYear: number;
  subject: string;
  category: string;
  level: string;

  dai: number;
  no: number;
  answerNo: number;

  pdfPage: number;
  score: number;

  type: "single" | "multi" | "numeric";

  question: string;
  choices: string[];

  answer: number | number[];
  selectCount?: number;

  explanation?: string;
};

export type NihonshiMeta = {
  id: string;
  title: string;
  examYear: number;
  subject: string;
  category: string;
  level: string;

  durationMinutes: number;
  totalScore: number;

  questionPdf: string;
  answerPdf?: string;
};

export type NihonshiAnswerState = Record<string, number | number[] | null>;

export type NihonshiStats = {
  examinees: number;
  mean: number;
  sd: number;
};

export const NIHONSHI_2025_STATS: NihonshiStats = {
  examinees: 114599,
  mean: 56.99,
  sd: 15.76,
};

export function isCorrect(
  q: NihonshiQuestion,
  value: number | number[] | null
) {
  if (value === null) return false;

  if (Array.isArray(q.answer)) {
    if (!Array.isArray(value)) return false;

    const a = [...q.answer].sort((x, y) => x - y);
    const b = [...value].sort((x, y) => x - y);

    return JSON.stringify(a) === JSON.stringify(b);
  }

  return value === q.answer;
}

export function gradeNihonshi(
  questions: NihonshiQuestion[],
  answers: NihonshiAnswerState
) {
  let correctCount = 0;
  let score = 0;
  let maxScore = 0;

  for (const q of questions) {
    maxScore += q.score ?? 0;

    if (isCorrect(q, answers[q.id] ?? null)) {
      correctCount += 1;
      score += q.score ?? 0;
    }
  }

  const percent = maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : 0;

  return {
    correctCount,
    totalCount: questions.length,
    score,
    maxScore,
    percent,
  };
}

export function calcNihonshiHensachi(
  score: number,
  stats = NIHONSHI_2025_STATS
) {
  if (!stats.sd) return 50;
  return Math.round((50 + ((score - stats.mean) / stats.sd) * 10) * 10) / 10;
}

function erf(x: number) {
  const sign = x >= 0 ? 1 : -1;

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const absX = Math.abs(x);
  const t = 1 / (1 + p * absX);

  const y =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return sign * y;
}

function normalCdf(z: number) {
  return 0.5 * (1 + erf(z / Math.sqrt(2)));
}

export function estimateNihonshiRank(
  score: number,
  stats = NIHONSHI_2025_STATS
) {
  if (!stats.sd || !stats.examinees) {
    return {
      rank: 1,
      lowerRate: 0,
    };
  }

  const z = (score - stats.mean) / stats.sd;
  const lowerRateRaw = normalCdf(z);
  const rank = Math.ceil((1 - lowerRateRaw) * stats.examinees);

  return {
    rank: Math.min(Math.max(rank, 1), stats.examinees),
    lowerRate: Math.round(lowerRateRaw * 1000) / 10,
  };
}

export function getNihonshiGrade(hensachi: number) {
  if (hensachi >= 65) {
    return { label: "A", text: "かなり良い" };
  }

  if (hensachi >= 60) {
    return { label: "B", text: "良い" };
  }

  if (hensachi >= 50) {
    return { label: "C", text: "平均付近" };
  }

  if (hensachi >= 40) {
    return { label: "D", text: "基礎確認" };
  }

  return { label: "E", text: "基礎固め" };
}
