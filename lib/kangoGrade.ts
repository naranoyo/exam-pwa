// lib/kangoGrade.ts
import type { KangoQuestion } from "@/lib/kango";

export type KangoAnswerValue = number | number[] | null;
export type KangoAnswerState = Record<string, KangoAnswerValue>;

function isSameNumberArray(a: number[], b: number[]) {
  if (a.length !== b.length) return false;

  const aa = [...a].sort((x, y) => x - y);
  const bb = [...b].sort((x, y) => x - y);

  return aa.every((v, i) => v === bb[i]);
}

export function gradeKango(
  questions: KangoQuestion[],
  answers: KangoAnswerState
) {
  let correct = 0;
  let total = 0;

  for (const q of questions) {
    if (!("answer" in q)) continue;

    const score = q.score ?? 1;
    total += score;

    const userAnswer = answers[q.id];

    // single
    if (!Array.isArray(q.answer)) {
      if (typeof q.answer === "number") {
        if (typeof userAnswer === "number" && userAnswer === q.answer) {
          correct += score;
        }
      }
      continue;
    }

    // multi
    if (Array.isArray(q.answer)) {
      if (
        Array.isArray(userAnswer) &&
        isSameNumberArray(userAnswer, q.answer)
      ) {
        correct += score;
      }
      continue;
    }
  }

  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

  return {
    correct,
    total,
    percent,
  };
}
