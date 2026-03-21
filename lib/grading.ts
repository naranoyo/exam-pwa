// lib/grading.ts

import type {
  ExamQuestion,
  MultiChoiceQuestion,
  UserAnswer,
  UserAnswerMap,
} from "@/lib/examTypes";

export type ExamResultSummary = {
  answered: number;
  total: number;
  correct: number;
  gradable: number;
  percent: number | null;
};

function normalizeNumberArray(values: number[]) {
  return [...values].sort((a, b) => a - b);
}

function isSameNumberArray(a: number[], b: number[]) {
  if (a.length !== b.length) return false;

  const aa = normalizeNumberArray(a);
  const bb = normalizeNumberArray(b);

  return aa.every((value, index) => value === bb[index]);
}

function isAnsweredValue(value: UserAnswer) {
  if (value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === "number";
}

function isGradable(question: ExamQuestion) {
  switch (question.type) {
    case "single":
    case "combo":
      return typeof question.answer === "number";

    case "multi":
      return Array.isArray(question.answer);

    case "text":
      return (
        typeof question.answerText === "string" &&
        question.answerText.trim().length > 0
      );

    case "case":
      if (Array.isArray(question.answer)) return true;
      return typeof question.answer === "number";

    default:
      return false;
  }
}

export function isCorrectAnswer(
  question: ExamQuestion,
  userAnswer: UserAnswer
): boolean {
  if (!isAnsweredValue(userAnswer)) return false;

  switch (question.type) {
    case "single":
    case "combo":
      return typeof userAnswer === "number" && userAnswer === question.answer;

    case "multi":
      if (!Array.isArray(userAnswer)) return false;
      if (!Array.isArray(question.answer)) return false;
      return isSameNumberArray(userAnswer, question.answer);

    case "text":
      return (
        typeof userAnswer === "string" &&
        typeof question.answerText === "string" &&
        userAnswer.trim() === question.answerText.trim()
      );

    case "case":
      if (Array.isArray(question.answer)) {
        if (!Array.isArray(userAnswer)) return false;
        return isSameNumberArray(userAnswer, question.answer);
      }

      return typeof userAnswer === "number" && userAnswer === question.answer;

    default:
      return false;
  }
}

export function calcExamResult(
  questions: ExamQuestion[],
  answers: UserAnswerMap
): ExamResultSummary {
  let answered = 0;
  let correct = 0;
  let gradable = 0;

  for (const q of questions) {
    const picked = answers[q.id] ?? null;

    if (isAnsweredValue(picked)) {
      answered++;
    }

    if (!isGradable(q)) {
      continue;
    }

    gradable++;

    if (isCorrectAnswer(q, picked)) {
      correct++;
    }
  }

  return {
    answered,
    total: questions.length,
    correct,
    gradable,
    percent: gradable > 0 ? Math.round((correct / gradable) * 100) : null,
  };
}

export function toggleMultiAnswer(
  current: UserAnswer,
  choiceIndex: number,
  selectCount?: number
): number[] {
  const base = Array.isArray(current) ? [...current] : [];
  const exists = base.includes(choiceIndex);

  if (exists) {
    return base.filter((v) => v !== choiceIndex);
  }

  const next = [...base, choiceIndex];

  if (
    typeof selectCount === "number" &&
    selectCount > 0 &&
    next.length > selectCount
  ) {
    return [...next].slice(next.length - selectCount);
  }

  return next;
}

export function isQuestionAnswered(
  question: ExamQuestion,
  value: UserAnswer
): boolean {
  if (value === null) return false;

  switch (question.type) {
    case "multi":
      return Array.isArray(value) && value.length > 0;

    case "text":
      return typeof value === "string" && value.trim().length > 0;

    case "single":
    case "combo":
      return typeof value === "number";

    case "case":
      if (Array.isArray(question.answer)) {
        return Array.isArray(value) && value.length > 0;
      }
      return typeof value === "number";

    default:
      return false;
  }
}

export function createInitialAnswerValue(question: ExamQuestion): UserAnswer {
  switch (question.type) {
    case "multi":
      return [];

    case "text":
      return "";

    case "single":
    case "combo":
    case "case":
      return null;

    default:
      return null;
  }
}

export function createInitialAnswerMap(
  questions: ExamQuestion[]
): UserAnswerMap {
  const map: UserAnswerMap = {};

  for (const q of questions) {
    map[q.id] = createInitialAnswerValue(q);
  }

  return map;
}

export function clearAnswerValue(question: ExamQuestion): UserAnswer {
  return createInitialAnswerValue(question);
}

export function getMultiSelectCount(question: MultiChoiceQuestion): number {
  if (typeof question.selectCount === "number" && question.selectCount > 0) {
    return question.selectCount;
  }
  return 2;
}
