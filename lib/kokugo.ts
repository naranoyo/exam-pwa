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

  /**
   * ✅ 新形式：blocks（あなたの現在の想定）
   * ただし 2024 等で旧形式(textのみ)が混ざると p.blocks が undefined になり得るので optional に。
   */
  blocks?: KokugoPassageBlock[];

  /**
   * ✅ 旧形式：text（passages.json が {text:"..."} だけのとき用）
   * 2025のblocks形式には不要だけど、互換のために持たせる。
   */
  text?: string;
};

export type KokugoQuestion = {
  id: string;
  dai: number;
  no: number; // 問1,問2...
  passageId: string;

  // ✅ UIで表示する問題文（questions.json の question を入れる）
  prompt: string;

  choices: string[];
  answer: number; // 0-based

  score?: number;

  // ✅ 解答用紙の「解答番号」(questions.json の answerNo)
  answerNo?: number;

  // ✅ 1つの設問が使う解答枠数（通常は1）
  slots?: number;

  pdfPageQ?: number;
  pdfPageA?: number;
  tags?: string[];

  // ✅ 追加（任意）：slotごとの正解
  correct?: number[];

  // ✅ 解説（任意）
  explanation?: string;
};

export type KokugoDai = {
  dai: number;
  title: string;
  label?: string;
  passage: KokugoPassage | null;
  questions: KokugoQuestion[];
  pageHint?: { qStart?: number; qEnd?: number; aStart?: number; aEnd?: number };
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

  // ✅ 旧形式(text) または blocksが無い/壊れている場合
  if (!p?.blocks || !Array.isArray(p.blocks)) {
    return (p?.text ?? "").trim();
  }

  return p.blocks
    .filter((b) => {
      if (b.kind === "heading") return includeHeading;
      if (b.kind === "note") return includeNote;
      return true; // paragraph/quote
    })
    .map((b) => b.text)
    .join("\n\n")
    .trim();
}

/** -----------------------------
 * ✅ questions.json の生データ型
 * ----------------------------- */
export type RawKokugoQuestion = {
  id: string;
  passageId: string;
  dai: number;
  no: number;

  question: string;
  choices: string[];

  // 1-based or 0-based 混在許容
  answer: number;

  score?: number;

  // ✅ これが解答番号
  answerNo?: number;

  // ✅ 枠数（なければ1）
  slots?: number;

  // 問題PDFページ（旧pdfPage）
  pdfPage?: number;
  pdfPageQ?: number;
  pdfPageA?: number;

  tags?: string[];

  // ✅ 追加：slotごとの正解（将来対応）
  correct?: number[];

  // ✅ 解説（任意）
  explanation?: string;
};

function normalizeAnswerIndex(answer: number, choicesLen: number): number {
  if (choicesLen <= 0) return 0;

  // ✅ まず 0-based を優先（0..len-1）
  if (answer >= 0 && answer < choicesLen) return answer;

  // ✅ 次に 1-based（1..len）
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

    // ✅ questions.json の question をそのまま prompt に
    prompt: raw.question ?? "",

    choices,
    answer,
    correct: Array.isArray(raw.correct) ? raw.correct : undefined,

    score: raw.score,

    // ✅ 重要
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

/** -----------------------------
 * ✅ 共通ビルダー（2024/2025で共有）
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
  for (const q of qSorted) questionIndex[q.id] = q;

  return {
    year,
    title,
    pdfQUrl,
    pdfAUrl,
    dais,
    questionIndex,
    stats,
  };
}

/** -----------------------------
 * ✅ 2025（今までの互換を維持）
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
 * ✅ 2024（正式追加：完全版）
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
    // ✅ ここは public/past/ に置くPDF名に合わせて変更してください
    pdfQUrl: "/past/kyotsu-kokugo-2024-q.pdf",
    pdfAUrl: "/past/kyotsu-kokugo-2024-a.pdf",
    passages,
    questions,
    stats,
  });
}

/** -----------------------------
 * ✅ 2023（正式追加）
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
