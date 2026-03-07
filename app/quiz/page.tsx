// app/quiz/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import englishVocab from "@/data/questions/english_vocab.json";

// ✅ 国語（漢字）
import kanjiYomi100 from "@/data/questions/japanese_kanji_yomi_100.json";
import kanjiImi100 from "@/data/questions/japanese_kanji_imi_100.json";
import kanjiPast5 from "@/data/questions/japanese_kanji_past5.json";

// ✅ 共テ国語（2025/2024/2023）※ここでは「一覧に出す」だけなので questions を入れるだけでOK
import kokugo2025Questions from "@/data/questions/kokugo/2025/questions.json";
import kokugo2024Questions from "@/data/questions/kokugo/2024/questions.json";
import kokugo2023Questions from "@/data/questions/kokugo/2023/questions.json";

import { getDateKey } from "@/lib/date";
import type {
  Question,
  SubjectId,
  CategoryId,
  LevelId,
  QuizResult,
} from "@/lib/quiz";
import { createResultId } from "@/lib/quiz";
import { useApp } from "@/lib/state";

import type { KokugoQuestion } from "@/lib/kokugo";

import { QuizCard } from "@/components/quiz/QuizCard";
import { ResultBar } from "@/components/quiz/ResultBar";
import { PdfViewer } from "@/components/quiz/PdfViewer";

function asQuestions(x: unknown): Question[] {
  return (x as Question[]) ?? [];
}
function asKokugoQuestions(x: unknown): KokugoQuestion[] {
  return (x as KokugoQuestion[]) ?? [];
}

/** ====== パック（小分類） ====== */
type PackKey =
  | "eng_vocab"
  | "jp_yomi_100"
  | "jp_imi_100"
  | "jp_yomi_past5"
  | "jp_kokugo_2025"
  | "jp_kokugo_2024"
  | "jp_kokugo_2023"; // ← ★これを追加

type PackMode = "practice" | "exam";

type Pack = {
  key: PackKey;
  title: string;
  subject: SubjectId;
  category: CategoryId;
  level: LevelId;
  questions: Question[];

  pdf?: {
    url: string;
    label?: string;
    height?: number;
    initialPage?: number; // 0-based
  };

  mode?: PackMode;
  examSeconds?: number;
  hideCount?: boolean;

  /** ✅ “一覧に出すだけ”で、押したら別ページへ飛ばす */
  route?: string;
};

/** ====== 科目（大分類） ====== */
type SubjectGroupKey = "english" | "japanese" | "math";

type PackGroup = {
  subjectKey: SubjectGroupKey;
  title: string;
  packs: Pack[];
};

/** ====== util ====== */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffleChoices(
  choices: string[],
  answerIndex: number
): { choices: string[]; answer: number } {
  const entries = choices.map((text, index) => ({
    text,
    isAnswer: index === answerIndex,
  }));

  for (let i = entries.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [entries[i], entries[j]] = [entries[j], entries[i]];
  }

  const newChoices = entries.map((e) => e.text);
  const newAnswer = entries.findIndex((e) => e.isAnswer);
  return { choices: newChoices, answer: newAnswer };
}

function normalizeQuestion(q: Question): Question {
  const { choices, answer } = shuffleChoices(q.choices, q.answer);
  return { ...q, choices, answer };
}

function formatMMSS(totalSec: number) {
  const t = Math.max(0, totalSec);
  const m = Math.floor(t / 60);
  const s = t % 60;
  const ss = String(s).padStart(2, "0");
  return `${m}:${ss}`;
}

/** ===========================
 * PDFページ：packKey とセットで管理
 * =========================== */
type PdfState = { packKey: PackKey; page: number };
type PdfAction =
  | { type: "RESET"; packKey: PackKey; initialPage: number }
  | { type: "SET"; page: number };

function pdfReducer(state: PdfState, action: PdfAction): PdfState {
  switch (action.type) {
    case "RESET":
      return { packKey: action.packKey, page: action.initialPage };
    case "SET":
      return { ...state, page: action.page };
    default:
      return state;
  }
}

export default function QuizPage() {
  const router = useRouter();
  const { dispatch } = useApp();

  /** ✅ Hydration対策：mounted になるまで固定UI */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // 共テ国語データ（questionsだけ）
  const kokugoQs2025 = useMemo(
    () => asKokugoQuestions(kokugo2025Questions),
    []
  );
  const kokugoQs2024 = useMemo(
    () => asKokugoQuestions(kokugo2024Questions),
    []
  );
  const kokugoQs2023 = useMemo(
    () => asKokugoQuestions(kokugo2023Questions),
    []
  );

  const groups: PackGroup[] = useMemo(
    () => [
      {
        subjectKey: "english",
        title: "英語",
        packs: [
          {
            key: "eng_vocab",
            title: "英単語（4択）",
            subject: "english",
            category: "vocab",
            level: "vocab-4",
            questions: asQuestions(englishVocab),
            mode: "practice",
          },
        ],
      },
      {
        subjectKey: "japanese",
        title: "国語",
        packs: [
          {
            key: "jp_yomi_100",
            title: "漢字（読み）四択100問",
            subject: "japanese",
            category: "kanji",
            level: "kanji-yomi-100",
            questions: asQuestions(kanjiYomi100),
            mode: "practice",
          },
          {
            key: "jp_imi_100",
            title: "漢字（意味）四択100問",
            subject: "japanese",
            category: "kanji",
            level: "kanji-imi-100",
            questions: asQuestions(kanjiImi100),
            mode: "practice",
          },

          // ✅ 共テ国語(2025)（一覧に出すだけ→押したら /quiz/kokugo/2025）
          {
            key: "jp_kokugo_2025",
            title: "共テ国語(2025)本番形式",
            subject: "japanese",
            category: "kokugo" as CategoryId,
            level: "kokugo-2025" as LevelId,
            questions: kokugoQs2025 as unknown as Question[],
            mode: "exam",
            examSeconds: 90 * 60,
            hideCount: true,
            route: "/quiz/kokugo/2025",
            pdf: {
              url: "/past/kyotsu-kokugo-2025-q.pdf",
              label: "2025 共通テスト（国語）問題",
              height: 420,
              initialPage: 0,
            },
          },

          // ✅ 共テ国語(2024)（一覧に出すだけ→押したら /quiz/kokugo/2024）
          {
            key: "jp_kokugo_2024",
            title: "共テ国語(2024)本番形式",
            subject: "japanese",
            category: "kokugo" as CategoryId,
            level: "kokugo-2024" as LevelId,
            questions: kokugoQs2024 as unknown as Question[],
            mode: "exam",
            examSeconds: 90 * 60,
            hideCount: true,
            route: "/quiz/kokugo/2024",
            pdf: {
              url: "/past/kyotsu-kokugo-2024-q.pdf",
              label: "2024 共通テスト（国語）問題",
              height: 420,
              initialPage: 0,
            },
          },

          // ✅ 共テ国語(2023)（一覧に出すだけ→押したら /quiz/kokugo/2023）
          {
            key: "jp_kokugo_2023",
            title: "共テ国語(2023)本番形式",
            subject: "japanese",
            category: "kokugo" as CategoryId,
            level: "kokugo-2023" as LevelId,
            questions: kokugoQs2023 as unknown as Question[],
            mode: "exam",
            examSeconds: 90 * 60,
            hideCount: true,
            route: "/quiz/kokugo/2023",
            pdf: {
              url: "/past/kyotsu-kokugo-2023-q.pdf",
              label: "2023 共通テスト（国語）問題",
              height: 420,
              initialPage: 0,
            },
          },

          {
            key: "jp_yomi_past5",
            title: "漢字（読み）過去5年",
            subject: "japanese",
            category: "kanji",
            level: "kanji-yomi-past5",
            questions: asQuestions(kanjiPast5),
            mode: "practice",
          },
        ],
      },
      { subjectKey: "math", title: "数学", packs: [] },
    ],
    [kokugoQs2025, kokugoQs2024, kokugoQs2023]
  );

  const visibleGroups = useMemo(
    () => groups.filter((g) => g.packs.length > 0),
    [groups]
  );

  const [subjectKey, setSubjectKey] = useState<SubjectGroupKey>("english");

  const currentGroup = useMemo(() => {
    return (
      visibleGroups.find((g) => g.subjectKey === subjectKey) ?? visibleGroups[0]
    );
  }, [visibleGroups, subjectKey]);

  const packs = useMemo(() => currentGroup?.packs ?? [], [currentGroup]);

  const initialPackKey = useMemo<PackKey>(() => {
    const g =
      visibleGroups.find((x) => x.subjectKey === "english") ?? visibleGroups[0];
    return (g?.packs[0]?.key ?? "eng_vocab") as PackKey;
  }, [visibleGroups]);

  const [packKey, setPackKey] = useState<PackKey>(initialPackKey);

  // ✅ 練習モード用の出題数
  const [count, setCount] = useState<number>(10);

  const pack = useMemo(() => {
    return packs.find((p) => p.key === packKey) ?? packs[0];
  }, [packs, packKey]);

  /** ====== PDF ページ（本番形式プレビュー用） ====== */
  const [pdfState, pdfDispatch] = useReducer(pdfReducer, {
    packKey: initialPackKey,
    page: 0,
  });
  const pdfPage = pdfState.page;

  function resetPdfToPack(nextPackKey: PackKey, nextPack?: Pack) {
    const init = nextPack?.pdf?.initialPage ?? 0;
    pdfDispatch({ type: "RESET", packKey: nextPackKey, initialPage: init });
  }

  /** ====== timer ====== */
  const committedRef = useRef(false);
  const runningRef = useRef(false);
  const sessionSecRef = useRef(0);

  const [elapsedSec, setElapsedSec] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!runningRef.current) return;
      sessionSecRef.current += 1;
      setElapsedSec(sessionSecRef.current);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  function startTimerFromZero() {
    committedRef.current = false;
    sessionSecRef.current = 0;
    setElapsedSec(0);
    setIsPaused(false);
    runningRef.current = true;
  }

  function pauseTimer() {
    runningRef.current = false;
  }

  function commitStudyTime() {
    if (!pack) return;
    if (committedRef.current) return;
    committedRef.current = true;

    pauseTimer();

    const sec = sessionSecRef.current;
    if (sec <= 0) return;

    const dateKey = getDateKey(new Date());
    const subjectKey2 = `${pack.subject}/${pack.category}/${pack.level}`;

    dispatch({
      type: "ADD_STUDY_SECONDS",
      dateKey,
      seconds: sec,
      subjectKey: subjectKey2,
    });
  }

  /** ====== quiz build ====== */
  function buildQuiz(
    fromPacks: Pack[],
    nextPackKey: PackKey,
    nextCount: number
  ) {
    const p = fromPacks.find((x) => x.key === nextPackKey) ?? fromPacks[0];
    const src = p?.questions ?? [];

    // examは順番固定、practiceはシャッフル
    const base = p?.mode === "exam" ? src : shuffle(src).map(normalizeQuestion);
    const n = Math.max(1, Math.min(nextCount, base.length || 1));
    return p?.mode === "exam" ? base : base.slice(0, n);
  }

  /** ✅ Hydration対策：初期stateでランダム生成しない */
  const [quiz, setQuiz] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);

  const finished = idx >= quiz.length;
  const q = quiz[idx];

  function startNewRun(
    fromPacks: Pack[],
    nextPackKey: PackKey,
    nextCount: number
  ) {
    setQuiz(buildQuiz(fromPacks, nextPackKey, nextCount));
    setIdx(0);
    setCorrect(0);
    setChosen(null);
    startTimerFromZero();
  }

  /** ✅ mounted後にだけ初回スタート（1回だけ） */
  const didInitRef = useRef(false);
  useEffect(() => {
    if (!mounted) return;
    if (didInitRef.current) return;
    if (!packs || packs.length === 0) return;

    didInitRef.current = true;

    const safePack = packs.find((p) => p.key === packKey) ?? packs[0]!;
    if (safePack.key !== packKey) setPackKey(safePack.key);

    resetPdfToPack(safePack.key, safePack);
    startNewRun(packs, safePack.key, count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, packs]);

  /** ===========================
   * ✅ 本番形式は別ページへ遷移
   * =========================== */
  function goExamRoute(route: string) {
    pauseTimer();
    setIsPaused(false);
    router.push(route);
  }

  /** ====== change handlers ====== */
  function changeSubject(next: SubjectGroupKey) {
    if (isPaused) return;

    const nextGroup =
      visibleGroups.find((x) => x.subjectKey === next) ?? visibleGroups[0];
    const first = nextGroup?.packs[0];
    if (!first) return;

    // ✅ 先頭が「本番形式（routeあり）」ならそのまま遷移
    if (first.route) {
      setSubjectKey(next);
      setPackKey(first.key);
      goExamRoute(first.route);
      return;
    }

    setSubjectKey(next);
    setPackKey(first.key);

    resetPdfToPack(first.key, first);
    startNewRun(nextGroup.packs, first.key, count);
  }

  function changePack(nextPackKey: PackKey) {
    if (isPaused) return;

    const nextPack = packs.find((p) => p.key === nextPackKey) ?? packs[0];

    // ✅ 本番形式（routeあり）なら専用ページへ
    if (nextPack?.route) {
      setPackKey(nextPackKey);
      goExamRoute(nextPack.route);
      return;
    }

    setPackKey(nextPackKey);
    resetPdfToPack(nextPackKey, nextPack);
    startNewRun(packs, nextPackKey, count);
  }

  function changeCount(nextCount: number) {
    if (isPaused) return;
    setCount(nextCount);
    startNewRun(packs, packKey, nextCount);
  }

  /** ====== answer ====== */
  function onChoose(ch: number, msSpent: number) {
    if (isPaused) return;
    if (!q || chosen !== null || !pack) return;

    setChosen(ch);

    const isCorrect = ch === q.answer;
    if (isCorrect) setCorrect((x) => x + 1);

    const dateKey = getDateKey(new Date());
    const result: QuizResult = {
      id: createResultId(),
      dateKey,
      subject: pack.subject,
      category: pack.category,
      level: pack.level,
      questionId: q.id,
      isCorrect,
      chosen: ch,
      correct: q.answer,
      msSpent,
    };

    dispatch({ type: "QUIZ_ADD_RESULT", payload: result });
  }

  function goNext() {
    if (isPaused) return;
    if (chosen === null) return;
    setIdx((x) => x + 1);
    setChosen(null);
  }

  function resetRun() {
    if (isPaused) return;
    startNewRun(packs, packKey, count);
  }

  function goDashboardNoSave() {
    pauseTimer();
    router.push("/dashboard");
  }

  function goDashboardSave() {
    commitStudyTime();
    router.push("/dashboard");
  }

  /** ✅ mounted前は固定UI（SSR/CSR一致） */
  if (!mounted) {
    return (
      <main className="mx-auto max-w-xl p-4">
        <section className="rounded-2xl bg-white/80 shadow-sm p-4 border border-black/5">
          <div className="text-sm font-semibold text-black/70">問題</div>
          <div className="mt-2 text-sm text-black/60">読み込み中…</div>
        </section>
      </main>
    );
  }

  if (!pack) {
    return (
      <main className="mx-auto max-w-xl p-4">
        <div className="rounded-2xl bg-white/80 shadow-sm p-4 border border-black/5">
          <div className="font-bold">出題データがありません</div>
          <div className="mt-2 text-sm text-black/70">
            data/questions の JSON を確認してください。
          </div>
          <Link className="text-sm underline" href="/dashboard">
            ダッシュボードへ
          </Link>
        </div>
      </main>
    );
  }

  /** ====== header values ====== */
  const isExam = pack.mode === "exam";
  const examTotal = pack.examSeconds ?? 0;
  const remaining = isExam ? Math.max(0, examTotal - elapsedSec) : 0;
  const shownTotal = Math.min(count, quiz.length);

  return (
    <main className="mx-auto max-w-xl p-4 space-y-3 relative">
      <header className="rounded-2xl bg-white/80 shadow-sm p-4 border border-black/5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-black/70">問題</div>

          <button
            type="button"
            onClick={goDashboardNoSave}
            className="rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-xs font-semibold text-black/70 hover:bg-white active:scale-[0.99]"
          >
            ダッシュボードに戻る（保存なし）
          </button>
        </div>

        <div className="mt-3 grid gap-2">
          {/* 科目タブ */}
          <div className="grid grid-cols-2 gap-2">
            {visibleGroups.map((g) => (
              <button
                key={g.subjectKey}
                type="button"
                onClick={() => changeSubject(g.subjectKey)}
                disabled={isPaused}
                className={[
                  "rounded-xl px-3 py-3 text-sm font-semibold border",
                  g.subjectKey === subjectKey
                    ? "bg-black text-white border-black"
                    : "bg-white/80 border-black/10 hover:bg-black/5",
                  isPaused ? "opacity-50 pointer-events-none" : "",
                ].join(" ")}
              >
                {g.title}
              </button>
            ))}
          </div>

          {/* 小分類（横スクロール） */}
          <div className="-mx-1 overflow-x-auto">
            <div className="flex gap-2 px-1">
              {packs.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => changePack(p.key)}
                  disabled={isPaused}
                  className={[
                    "shrink-0 rounded-xl px-4 py-3 text-sm font-semibold border",
                    p.key === packKey
                      ? "bg-black text-white border-black"
                      : "bg-white/80 border-black/10 hover:bg-black/5",
                    isPaused ? "opacity-50 pointer-events-none" : "",
                  ].join(" ")}
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>

          {/* ✅ PDF（練習/プレビュー用） */}
          {pack.pdf?.url ? (
            <div className="mt-1 min-w-0">
              <div className="flex items-center justify-between px-1 pb-2">
                <div className="text-xs font-semibold text-black/70">
                  {pack.pdf.label ?? "本文（PDF）"}
                </div>

                {/* ✅ 本番形式のときは “本番ページへ” ボタンを右上に出す */}
                {pack.route ? (
                  <button
                    type="button"
                    onClick={() => goExamRoute(pack.route!)}
                    className="text-xs rounded-lg border px-2 py-1 bg-white hover:bg-black/5"
                  >
                    本番ページへ →
                  </button>
                ) : null}
              </div>

              <div className={isPaused ? "pointer-events-none opacity-75" : ""}>
                <PdfViewer
                  url={pack.pdf.url}
                  page={pdfPage}
                  height={pack.pdf.height ?? 420}
                  showControls
                  onPageChange={(p) => pdfDispatch({ type: "SET", page: p })}
                />
              </div>
            </div>
          ) : null}

          {/* 出題数 + タイマー */}
          <div className="flex items-center gap-2">
            {!pack.hideCount ? (
              <>
                <div className="text-xs text-black/60">出題数</div>
                <select
                  value={count}
                  onChange={(e) => changeCount(Number(e.target.value))}
                  disabled={isPaused}
                  className={[
                    "rounded-lg border border-black/10 bg-white/80 px-2 py-2 text-sm",
                    isPaused ? "opacity-50" : "",
                  ].join(" ")}
                >
                  {[5, 10, 15, 20].map((n) => (
                    <option key={n} value={n}>
                      {n}問
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <div className="text-xs text-black/60">試験時間</div>
            )}

            <div className="ml-auto flex items-center gap-2 text-xs text-black/60">
              {isExam ? (
                <>
                  残り{" "}
                  <span className="font-semibold text-black/80">
                    {formatMMSS(remaining)}
                  </span>
                  <span className="text-[11px] text-black/45">
                    / {formatMMSS(examTotal)}
                  </span>
                </>
              ) : (
                <>
                  経過時間{" "}
                  <span className="font-semibold text-black/80">
                    {formatMMSS(elapsedSec)}
                  </span>
                </>
              )}
            </div>
          </div>

          {!isExam && <ResultBar correct={correct} total={shownTotal} />}
        </div>
      </header>

      {quiz.length === 0 ? (
        <section className="rounded-2xl bg-white/80 shadow-sm p-4 border border-black/5">
          <div className="text-sm text-black/60">問題を準備中…</div>
        </section>
      ) : !finished && q ? (
        <QuizCard
          q={q as unknown as Question}
          index={idx}
          total={quiz.length}
          chosen={chosen}
          onChoose={onChoose}
          onNext={goNext}
          disabled={false}
        />
      ) : (
        <section className="rounded-2xl bg-white/80 shadow-sm p-4 border border-black/5">
          <div className="text-base font-bold">おつかれ！</div>

          {!isExam && (
            <div className="mt-1 text-sm text-black/70">
              正解：{correct} / {quiz.length}
            </div>
          )}

          <div className="mt-2 text-sm text-black/70">
            {isExam ? (
              <>残り時間：{formatMMSS(remaining)}</>
            ) : (
              <>経過時間：{formatMMSS(elapsedSec)}</>
            )}
          </div>

          <button
            type="button"
            onClick={resetRun}
            className="mt-3 w-full rounded-xl px-3 py-3 text-sm font-semibold bg-black text-white active:scale-[0.99]"
          >
            もう一回
          </button>

          <button
            type="button"
            onClick={goDashboardSave}
            className="mt-2 w-full rounded-xl px-3 py-3 text-sm font-semibold text-center bg-white/90 border border-black/10 hover:bg-white active:scale-[0.99]"
          >
            保存してダッシュボードに戻る
          </button>

          <button
            type="button"
            onClick={goDashboardNoSave}
            className="mt-2 w-full rounded-xl px-3 py-3 text-sm font-semibold text-center bg-white/80 border border-black/10 hover:bg-white active:scale-[0.99]"
          >
            保存せずに戻る
          </button>
        </section>
      )}

      <footer className="text-[11px] text-black/45">
        ※ 練習問題は選択肢を毎回ランダム（正解位置も更新）／
        勉強時間は「保存して戻る」時のみ加算
      </footer>

      <div className="hidden">
        <Link href="/dashboard">dashboard</Link>
      </div>
    </main>
  );
}
