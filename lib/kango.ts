// lib/kango.ts

import type {
  ExamDataset,
  ExamMeta,
  ExamQuestion,
  ExamQuestionType,
  UserAnswer,
  UserAnswerMap,
} from "@/lib/examTypes";
import {
  calcExamResult,
  clearAnswerValue,
  createInitialAnswerMap,
  isQuestionAnswered,
  toggleMultiAnswer,
} from "@/lib/grading";

export type KangoQuestion = ExamQuestion;

export type KangoExamMeta = ExamMeta & {
  subject: "kango" | string;
};

export type KangoExam = ExamDataset & {
  meta: KangoExamMeta;
  questions: KangoQuestion[];
};

export type KangoAnswerMap = UserAnswerMap;

export function isKangoMultiQuestion(question: KangoQuestion) {
  return question.type === "multi";
}

export function isKangoSingleLikeQuestion(question: KangoQuestion) {
  return (
    question.type === "single" ||
    question.type === "combo" ||
    question.type === "case"
  );
}

export function getKangoStorageKey(exam: KangoExam) {
  return `kango-exam-progress:${exam.meta.id}`;
}

export function createInitialKangoAnswers(
  questions: KangoQuestion[]
): KangoAnswerMap {
  return createInitialAnswerMap(questions);
}

export function calcKangoResult(
  questions: KangoQuestion[],
  answers: KangoAnswerMap
) {
  return calcExamResult(questions, answers);
}

export function isKangoQuestionAnswered(
  question: KangoQuestion,
  value: UserAnswer
) {
  return isQuestionAnswered(question, value);
}

export function clearKangoAnswer(question: KangoQuestion): UserAnswer {
  return clearAnswerValue(question);
}

export function chooseKangoAnswer(
  question: KangoQuestion,
  currentValue: UserAnswer,
  choiceIndex: number
): UserAnswer {
  switch (question.type) {
    case "single":
    case "combo":
      return choiceIndex;

    case "multi":
      return toggleMultiAnswer(currentValue, choiceIndex, question.selectCount);

    case "case":
      if (Array.isArray(question.answer)) {
        return toggleMultiAnswer(
          currentValue,
          choiceIndex,
          question.selectCount
        );
      }
      return choiceIndex;

    case "text":
      return currentValue;

    default:
      return currentValue;
  }
}

export function setKangoTextAnswer(
  question: KangoQuestion,
  value: string
): UserAnswer {
  if (question.type !== "text") return null;
  return value;
}

export function getKangoQuestionPdfPage(question: KangoQuestion) {
  return question.pdfPage ?? 1;
}

export function getKangoQuestionFigurePage(question: KangoQuestion) {
  return question.figurePage ?? null;
}

export function findKangoQuestionByNo(
  questions: KangoQuestion[],
  no: number
): KangoQuestion | null {
  return questions.find((q) => q.no === no) ?? null;
}

export function findKangoQuestionByPdfPage(
  questions: KangoQuestion[],
  page: number
): KangoQuestion | null {
  return (
    questions.find((q) => {
      if (typeof q.pdfPage !== "number") return false;
      return q.pdfPage === page;
    }) ?? null
  );
}

export function getKangoQuestionTypeLabel(type: ExamQuestionType) {
  switch (type) {
    case "single":
      return "1つ選択";
    case "multi":
      return "複数選択";
    case "combo":
      return "組み合わせ";
    case "text":
      return "記述";
    case "case":
      return "事例";
    default:
      return "問題";
  }
}

export function loadInitialKangoState(exam: KangoExam) {
  const questions = exam.questions;
  const initialAnswers = createInitialKangoAnswers(questions);
  const initialIndex = 0;

  if (typeof window === "undefined") {
    return {
      answers: initialAnswers,
      currentIndex: initialIndex,
    };
  }

  try {
    const key = getKangoStorageKey(exam);
    const raw = localStorage.getItem(key);

    if (!raw) {
      return {
        answers: initialAnswers,
        currentIndex: initialIndex,
      };
    }

    const parsed = JSON.parse(raw) as {
      answers?: KangoAnswerMap;
      currentIndex?: number;
    };

    const mergedAnswers: KangoAnswerMap = {
      ...initialAnswers,
      ...(parsed.answers ?? {}),
    };

    const safeIndex =
      typeof parsed.currentIndex === "number" &&
      parsed.currentIndex >= 0 &&
      parsed.currentIndex < questions.length
        ? parsed.currentIndex
        : 0;

    return {
      answers: mergedAnswers,
      currentIndex: safeIndex,
    };
  } catch {
    return {
      answers: initialAnswers,
      currentIndex: initialIndex,
    };
  }
}

export function saveKangoState(
  exam: KangoExam,
  answers: KangoAnswerMap,
  currentIndex: number
) {
  if (typeof window === "undefined") return;

  const key = getKangoStorageKey(exam);

  localStorage.setItem(
    key,
    JSON.stringify({
      answers,
      currentIndex,
    })
  );
}
