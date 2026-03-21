// lib/examTypes.ts

export type ExamQuestionType = "single" | "multi" | "combo" | "text" | "case";

export type ExamSubject = "kango" | "kokugo" | "english" | "kanji" | string;

export type ExamSession = "am" | "pm";

export type ChoiceItem = {
  key: string;
  text: string;
};

export type ChoiceGroup = {
  stem?: string;
  items: ChoiceItem[];
};

export type FigureRef = {
  page?: number;
  label?: string;
  src?: string;
};

export type ExamCaseBlockKind = "heading" | "paragraph" | "quote" | "note";

export type ExamCaseBlock = {
  kind: ExamCaseBlockKind;
  text: string;
};

export type ExamCase = {
  id: string;
  title?: string;
  lead?: string;
  blocks: ExamCaseBlock[];
  pdfPageStart?: number;
  pdfPageEnd?: number;
};

export type BaseExamQuestion = {
  id: string;
  examYear: number;
  session?: ExamSession;
  no: number;

  subject?: ExamSubject;
  category?: string;

  type: ExamQuestionType;

  question: string;
  explanation?: string;
  score?: number;

  pdfPage?: number;
  figurePage?: number;
  figure?: FigureRef;

  tags?: string[];
};

export type SingleChoiceQuestion = BaseExamQuestion & {
  type: "single";
  choices: string[];
  answer: number | null;
};

export type MultiChoiceQuestion = BaseExamQuestion & {
  type: "multi";
  choices: string[];
  answer: number[] | null;
  selectCount?: number;
};

export type ComboChoiceQuestion = BaseExamQuestion & {
  type: "combo";
  choiceGroups: ChoiceGroup[];
  choices: string[];
  answer: number | null;
};

export type TextQuestion = BaseExamQuestion & {
  type: "text";
  answerText: string | null;
};

export type CaseQuestion = BaseExamQuestion & {
  type: "case";
  caseId: string;
  choices: string[];
  answer: number | number[] | null;
  selectCount?: number;
};

export type ExamQuestion =
  | SingleChoiceQuestion
  | MultiChoiceQuestion
  | ComboChoiceQuestion
  | TextQuestion
  | CaseQuestion;

export type ExamMeta = {
  id: string;
  title: string;
  subject: ExamSubject;
  examYear: number;
  session?: ExamSession;

  questionPdf: string;
  answerPdf?: string;

  durationMinutes?: number;
};

export type ExamDataset = {
  meta: ExamMeta;
  cases?: ExamCase[];
  questions: ExamQuestion[];
};

export type UserAnswer = number | number[] | string | null;
export type UserAnswerMap = Record<string, UserAnswer>;
