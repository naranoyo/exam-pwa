// lib/kokugo.ts

export type KokugoPassageBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "quote"; text: string }
  | { kind: "note"; text: string };

export type KokugoPassage = {
  id: string;
  dai: number;
  title: string;
  label?: string;
  pdf?: {
    q?: { start: number; end: number };
    a?: { start: number; end: number };
  };

  // 新形式
  blocks?: KokugoPassageBlock[];

  // 旧形式互換
  text?: string;
};

export type KokugoQuestion = {
  id: string;
  dai: number;
  no: number; // 問1,問2...
  passageId: string;

  // UI表示文
  prompt: string;

  choices: string[];
  answer: number; // 0-based

  score?: number;

  // 解答用紙の解答番号
  answerNo?: number;

  // 1設問が使う枠数（通常1）
  slots?: number;

  pdfPageQ?: number;
  pdfPageA?: number;
  tags?: string[];

  // 将来対応用
  correct?: number[];

  explanation?: string;
};

export type KokugoDai = {
  dai: number;
  title: string;
  label?: string;
  passage: KokugoPassage | null;
  questions: KokugoQuestion[];
  pageHint?: {
    qStart?: number;
    qEnd?: number;
    aStart?: number;
    aEnd?: number;
  };
};

export type ExamStats = {
  examinees: number;
  mean: number;
  sd?: number;
};

export type KokugoExam = {
  year: number;
  title: string;
  pdfQUrl: string;
  pdfAUrl: string;
  dais: KokugoDai[];
  questionIndex: Record<string, KokugoQuestion>;
  stats?: ExamStats;
};

export function passageToText(
  p: KokugoPassage,
  opts?: { includeHeading?: boolean; includeNote?: boolean }
): string {
  const includeHeading = opts?.includeHeading ?? true;
  const includeNote = opts?.includeNote ?? true;

  if (!p?.blocks || !Array.isArray(p.blocks)) {
    return (p?.text ?? "").trim();
  }

  return p.blocks
    .filter((b) => {
      if (b.kind === "heading") return includeHeading;
      if (b.kind === "note") return includeNote;
      return true;
    })
    .map((b) => b.text)
    .join("\n\n")
    .trim();
}

/** -----------------------------
 * questions.json の生データ型
 * ----------------------------- */
export type RawKokugoQuestion = {
  id: string;
  passageId: string;
  dai: number;
  no: number;

  question: string;
  choices: string[];

  // 1-based / 0-based 混在許容
  answer: number;

  score?: number;
  answerNo?: number;
  slots?: number;

  // 旧 pdfPage にも対応
  pdfPage?: number;
  pdfPageQ?: number;
  pdfPageA?: number;

  tags?: string[];
  correct?: number[];
  explanation?: string;
};

function normalizeAnswerIndex(answer: number, choicesLen: number): number {
  if (choicesLen <= 0) return 0;

  // 0-based を優先
  if (answer >= 0 && answer < choicesLen) return answer;

  // 1-based
  if (answer >= 1 && answer <= choicesLen) return answer - 1;

  return 0;
}

function normalizeQuestion(raw: RawKokugoQuestion): KokugoQuestion {
  const choices = Array.isArray(raw.choices) ? raw.choices : [];
  const answer = normalizeAnswerIndex(raw.answer, choices.length);

  return {
    id: raw.id,
    dai: raw.dai,
    no: raw.no,
    passageId: raw.passageId,
    prompt: raw.question ?? "",
    choices,
    answer,
    correct: Array.isArray(raw.correct) ? raw.correct : undefined,
    score: raw.score,
    answerNo: typeof raw.answerNo === "number" ? raw.answerNo : undefined,
    slots: typeof raw.slots === "number" ? raw.slots : 1,
    pdfPageQ: typeof raw.pdfPageQ === "number" ? raw.pdfPageQ : raw.pdfPage,
    pdfPageA: raw.pdfPageA,
    tags: raw.tags,
    explanation:
      typeof raw.explanation === "string" ? raw.explanation : undefined,
  };
}

function byAnswerNo(a: KokugoQuestion, b: KokugoQuestion) {
  const aa = a.answerNo ?? 999999;
  const bb = b.answerNo ?? 999999;
  if (aa !== bb) return aa - bb;
  if (a.dai !== b.dai) return a.dai - b.dai;
  return a.no - b.no;
}

function getDefaultStats(year: number): ExamStats | undefined {
  switch (year) {
    case 2025:
      return {
        examinees: 437209,
        mean: 126.67,
        sd: 34.9,
      };
    case 2024:
      return {
        examinees: 433173,
        mean: 116.5,
        sd: 35.33,
      };
    case 2023:
      return {
        examinees: 445358,
        mean: 105.74,
        sd: 34.1,
      };
    default:
      return undefined;
  }
}

/** -----------------------------
 * 共通ビルダー
 * ----------------------------- */
function buildKokugoExamBase(args: {
  year: number;
  title: string;
  pdfQUrl: string;
  pdfAUrl: string;
  passages: KokugoPassage[];
  questions: RawKokugoQuestion[];
  stats?: ExamStats;
}): KokugoExam {
  const { year, title, pdfQUrl, pdfAUrl, passages, questions, stats } = args;

  const normalizedQuestions = (questions ?? []).map(normalizeQuestion);
  const qSorted = [...normalizedQuestions].sort(byAnswerNo);

  const daiSet = new Set<number>();
  for (const p of passages ?? []) daiSet.add(p.dai);
  for (const q of qSorted) daiSet.add(q.dai);

  const dais: KokugoDai[] = [...daiSet]
    .sort((a, b) => a - b)
    .map((dai) => {
      const passage = (passages ?? []).find((p) => p.dai === dai) ?? null;
      const qs = qSorted.filter((q) => q.dai === dai);

      const daiTitle = passage?.title ?? `第${dai}問`;
      const label = passage?.label;

      const pageHint = passage?.pdf
        ? {
            qStart: passage.pdf.q?.start,
            qEnd: passage.pdf.q?.end,
            aStart: passage.pdf.a?.start,
            aEnd: passage.pdf.a?.end,
          }
        : undefined;

      return { dai, title: daiTitle, label, passage, questions: qs, pageHint };
    });

  const questionIndex: Record<string, KokugoQuestion> = {};
  for (const q of qSorted) {
    questionIndex[q.id] = q;
  }

  return {
    year,
    title,
    pdfQUrl,
    pdfAUrl,
    dais,
    questionIndex,
    stats: stats ?? getDefaultStats(year),
  };
}

/** -----------------------------
 * 2025
 * ----------------------------- */
export function buildKokugoExam2025(args: {
  passages: KokugoPassage[];
  questions: RawKokugoQuestion[];
  stats?: ExamStats;
}): KokugoExam {
  const { passages, questions, stats } = args;

  return buildKokugoExamBase({
    year: 2025,
    title: "共通テスト 2025 国語",
    pdfQUrl: "/past/kyotsu-kokugo-2025-q.pdf",
    pdfAUrl: "/past/kyotsu-kokugo-2025-a.pdf",
    passages,
    questions,
    stats,
  });
}

/** -----------------------------
 * 2024
 * ----------------------------- */
export function buildKokugoExam2024(args: {
  passages: KokugoPassage[];
  questions: RawKokugoQuestion[];
  stats?: ExamStats;
}): KokugoExam {
  const { passages, questions, stats } = args;

  return buildKokugoExamBase({
    year: 2024,
    title: "共通テスト 2024 国語",
    pdfQUrl: "/past/kyotsu-kokugo-2024-q.pdf",
    pdfAUrl: "/past/kyotsu-kokugo-2024-a.pdf",
    passages,
    questions,
    stats,
  });
}

/** -----------------------------
 * 2023
 * ----------------------------- */
export function buildKokugoExam2023(args: {
  passages: KokugoPassage[];
  questions: RawKokugoQuestion[];
  stats?: ExamStats;
}): KokugoExam {
  const { passages, questions, stats } = args;

  return buildKokugoExamBase({
    year: 2023,
    title: "共通テスト 2023 国語",
    pdfQUrl: "/past/kyotsu-kokugo-2023-q.pdf",
    pdfAUrl: "/past/kyotsu-kokugo-2023-a.pdf",
    passages,
    questions,
    stats,
  });
}

export function findQuestionByPdfPage(
  exam: KokugoExam,
  page: number,
  mode: "q" | "a"
): KokugoQuestion | null {
  for (const d of exam.dais) {
    for (const q of d.questions) {
      const p = mode === "q" ? q.pdfPageQ : q.pdfPageA;
      if (p === page) return q;
    }
  }
  return null;
}
