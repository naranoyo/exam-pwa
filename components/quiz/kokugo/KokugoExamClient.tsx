// components/quiz/kokugo/KokugoExamClient.tsx
"use client";

import { useMemo, useRef, useState } from "react";
import type { KokugoExam, KokugoQuestion, KokugoPassage } from "@/lib/kokugo";
import { findQuestionByPdfPage, passageToText } from "@/lib/kokugo";
import { PdfViewer } from "@/components/quiz/PdfViewer";
import { AnswerSheet } from "@/components/quiz/kokugo/AnswerSheet";
import {
  gradeKokugo,
  type AnswerState,
  calcHensachi,
  estimateRank,
} from "@/lib/kokugoGrade";
import { useRouter } from "next/navigation";
import { getPassageById } from "@/lib/quizData";
import { ElapsedTimeBar } from "@/components/quiz/kokugo/ElapsedTimeBar";

import { getDateKey } from "@/lib/date";
import {
  useApp,
  type KokugoAttempt,
  type KokugoAttemptDetail,
} from "@/lib/state";
import { useToast } from "@/lib/toast";

type Props = { exam: KokugoExam };
type Mode = "solve" | "result";
type PdfMode = "q" | "a";

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function cryptoId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clampInt(n: number) {
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

/** +12分34秒 / +1時間02分03秒 */
function formatAddedSecondsPlus(sec: number) {
  const s = Math.max(0, clampInt(sec));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;

  if (hh > 0) {
    return `+${hh}時間${String(mm).padStart(2, "0")}分${String(ss).padStart(
      2,
      "0"
    )}秒`;
  }
  return `+${mm}分${String(ss).padStart(2, "0")}秒`;
}

const choiceLabel = (v: number | null) =>
  v === null ? "-" : ("①②③④"[v] ?? "-");

const isCorrectRow = (chosen: number | null, correct: number) =>
  chosen !== null && chosen === correct;

const judgeMark = (chosen: number | null, correct: number) => {
  if (chosen === null) return "—";
  return isCorrectRow(chosen, correct) ? "〇" : "✖";
};

function clampPercent(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function scoreFromHensachi(hensachi: number, mean: number, sd: number) {
  return mean + ((hensachi - 50) / 10) * sd;
}

function makeHensachiBand(hensachi: number) {
  const start = Math.floor(hensachi);
  const end = start + 0.9;

  return {
    start,
    end,
    label: `${start.toFixed(1)}〜${end.toFixed(1)}`,
  };
}

function makeScoreBandFromHensachiBand(
  band: { start: number; end: number },
  mean: number,
  sd: number,
  maxScore: number
) {
  const rawStart = scoreFromHensachi(band.start, mean, sd);
  const rawEnd = scoreFromHensachi(band.end, mean, sd);

  const start = Math.max(0, Math.min(maxScore, Math.round(rawStart)));
  const end = Math.max(0, Math.min(maxScore, Math.round(rawEnd)));

  const lo = Math.min(start, end);
  const hi = Math.max(start, end);

  return {
    start: lo,
    end: hi,
    label: `${lo}〜${hi}点`,
  };
}

function getPerformanceJudge(hensachi: number) {
  if (!Number.isFinite(hensachi)) {
    return {
      label: "-",
      description: "判定不能",
      tone: "text-black/60 bg-black/5 border-black/10",
    };
  }

  if (hensachi >= 62) {
    return {
      label: "A",
      description: "かなり良い",
      tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
    };
  }

  if (hensachi >= 55) {
    return {
      label: "B",
      description: "良い",
      tone: "text-sky-700 bg-sky-50 border-sky-200",
    };
  }

  if (hensachi >= 47) {
    return {
      label: "C",
      description: "標準",
      tone: "text-amber-700 bg-amber-50 border-amber-200",
    };
  }

  if (hensachi >= 40) {
    return {
      label: "D",
      description: "要強化",
      tone: "text-orange-700 bg-orange-50 border-orange-200",
    };
  }

  return {
    label: "E",
    description: "基礎固め",
    tone: "text-rose-700 bg-rose-50 border-rose-200",
  };
}

function getExamKey(exam: KokugoExam) {
  return `kokugo/kyotsu${exam.year}`;
}

function findPassageInExam(
  exam: KokugoExam,
  passageId: string
): KokugoPassage | null {
  for (const d of exam.dais) {
    if (d.passage?.id === passageId) return d.passage;
  }
  return null;
}

export function KokugoExamClient({ exam }: Props) {
  const router = useRouter();
  const { dispatch } = useApp();
  const { pushToast } = useToast();

  const todayKey = useMemo(() => getDateKey(), []);
  const examKey = useMemo(() => getExamKey(exam), [exam]);

  const [mode, setMode] = useState<Mode>("solve");
  const [pdfMode, setPdfMode] = useState<PdfMode>("q");
  const [copiedKind, setCopiedKind] = useState<"viewer" | "file" | null>(null);

  // タイマー（90分）
  const TOTAL_SECONDS = 90 * 60;
  const [timerRunning, setTimerRunning] = useState(false);

  // 結果画面へ移る瞬間に止める signal
  const autoStopSignalRef = useRef(0);
  const [autoStopSignal, setAutoStopSignal] = useState(0);

  // 初期位置
  const firstDai = exam.dais[0]?.dai ?? 1;
  const firstQid = exam.dais[0]?.questions[0]?.id ?? "";
  const [activeDai, setActiveDai] = useState<number>(firstDai);
  const [activeQid, setActiveQid] = useState<string>(firstQid);

  // 解答・PDF
  const [answers, setAnswers] = useState<AnswerState>({});
  const [pdfPage, setPdfPage] = useState<number>(1);

  // 保存済みガード
  const [savedAttemptId, setSavedAttemptId] = useState<string | null>(null);

  const dai = useMemo(
    () => exam.dais.find((d) => d.dai === activeDai) ?? null,
    [exam.dais, activeDai]
  );

  const activeQ: KokugoQuestion | null = useMemo(() => {
    if (!activeQid) return null;
    return exam.questionIndex[activeQid] ?? null;
  }, [exam.questionIndex, activeQid]);

  // 本文
  const passageView = useMemo(() => {
    if (!activeQ) return { title: "", text: "" };

    try {
      const p = activeQ.passageId ? getPassageById(activeQ.passageId) : null;
      if (p && typeof p.text === "string") {
        return { title: p.title ?? "", text: p.text };
      }
    } catch {
      // ignore
    }

    const p2 = activeQ.passageId
      ? findPassageInExam(exam, activeQ.passageId)
      : null;

    if (p2) {
      return {
        title: p2.title ?? "",
        text: passageToText(p2, {
          includeHeading: true,
          includeNote: true,
        }),
      };
    }

    return { title: "", text: "" };
  }, [activeQ, exam]);

  const hasPassage = !!passageView.text;

  const flatQuestions = useMemo(
    () => exam.dais.flatMap((d) => d.questions),
    [exam.dais]
  );

  const answerNoQuestions = useMemo(() => {
    const all = exam.dais.flatMap((d) => d.questions);
    const withAnswerNo = all.filter((q) => typeof q.answerNo === "number");
    withAnswerNo.sort((a, b) => (a.answerNo ?? 0) - (b.answerNo ?? 0));
    return withAnswerNo;
  }, [exam.dais]);

  const totalAnswerNoCount = answerNoQuestions.length;

  const answeredCount = useMemo(() => {
    return Object.values(answers).filter((a) => a.chosen !== null).length;
  }, [answers]);

  const pdfUrl = pdfMode === "q" ? exam.pdfQUrl : exam.pdfAUrl;

  const syncPdfFromQuestion = (q: KokugoQuestion, nextPdfMode?: PdfMode) => {
    const m = nextPdfMode ?? pdfMode;
    const p = m === "q" ? q.pdfPageQ : q.pdfPageA;

    if (typeof p === "number" && p > 0) {
      setPdfPage(p);
      return;
    }

    const d = exam.dais.find((x) => x.dai === q.dai);
    if (!d) return;

    if (m === "q" && typeof d.pageHint?.qStart === "number") {
      setPdfPage(d.pageHint.qStart);
    }
    if (m === "a" && typeof d.pageHint?.aStart === "number") {
      setPdfPage(d.pageHint.aStart);
    }
  };

  const selectDai = (daiNo: number) => {
    setActiveDai(daiNo);
    const d = exam.dais.find((x) => x.dai === daiNo);
    const first = d?.questions[0];
    if (first) {
      setActiveQid(first.id);
      syncPdfFromQuestion(first);
    }
  };

  const onPdfPageChange = (p: number) => {
    setPdfPage(p);
    const hit = findQuestionByPdfPage(exam, p, pdfMode);
    if (hit) {
      setActiveDai(hit.dai);
      setActiveQid(hit.id);
    }
  };

  const setChoice = (qid: string, choice: number) => {
    setAnswers((prev) => ({
      ...prev,
      [qid]: { chosen: choice, msSpent: prev[qid]?.msSpent ?? 0 },
    }));
  };

  const grade = useMemo(() => gradeKokugo(exam, answers), [exam, answers]);

  const statsView = useMemo(() => {
    const st = exam.stats;
    if (!st) return null;
    if (typeof st.sd !== "number" || st.sd <= 0) return null;

    const hensachi = calcHensachi(grade.total, st.mean, st.sd);
    const rank = estimateRank(grade.total, st.mean, st.sd, st.examinees);

    if (hensachi === null || rank === null) return null;

    const upperPercent = clampPercent(rank.upperPercent);

    const currentHensachiBand = makeHensachiBand(hensachi);
    const currentScoreBand = makeScoreBandFromHensachiBand(
      currentHensachiBand,
      st.mean,
      st.sd,
      grade.maxTotal
    );

    const judge = getPerformanceJudge(hensachi);

    return {
      hensachi,
      rank: rank.rank,
      examinees: st.examinees,
      percentile: rank.percentile,
      upperPercent,
      currentHensachiBand,
      currentScoreBand,
      judge,
    };
  }, [exam.stats, grade.total, grade.maxTotal]);

  const currentIndex = activeQ
    ? flatQuestions.findIndex((q) => q.id === activeQ.id)
    : -1;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < flatQuestions.length - 1;

  const goPrev = () => {
    if (!hasPrev) return;
    const prev = flatQuestions[currentIndex - 1];
    setActiveDai(prev.dai);
    setActiveQid(prev.id);
    syncPdfFromQuestion(prev);
  };

  const goNext = () => {
    if (!hasNext) return;
    const next = flatQuestions[currentIndex + 1];
    setActiveDai(next.dai);
    setActiveQid(next.id);
    syncPdfFromQuestion(next);
  };

  const openPdfInAppPage = () => {
    const src = pdfMode === "q" ? exam.pdfQUrl : exam.pdfAUrl;
    router.push(`/pdf?src=${encodeURIComponent(src)}&page=${pdfPage}`);
  };

  const getPdfViewerLink = () => {
    const src = pdfMode === "q" ? exam.pdfQUrl : exam.pdfAUrl;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = new URL("/pdf", origin);
    url.searchParams.set("src", src);
    url.searchParams.set("page", String(pdfPage));
    return url.toString();
  };

  const getPdfFileLink = () => {
    const src = pdfMode === "q" ? exam.pdfQUrl : exam.pdfAUrl;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return new URL(src, origin).toString();
  };

  const copyPdfLink = async (kind: "viewer" | "file") => {
    const text = kind === "viewer" ? getPdfViewerLink() : getPdfFileLink();
    const ok = await copyToClipboard(text);

    if (ok) {
      setCopiedKind(kind);
      window.setTimeout(() => setCopiedKind(null), 1500);
    }

    pushToast(
      ok
        ? "リンクをコピーしました 🔗（貼り付けて共有できます）"
        : "コピーに失敗しました"
    );
  };

  const chosenOnQuestionView = activeQ
    ? (answers[activeQ.id]?.chosen ?? null)
    : null;

  const saveAttempt = () => {
    if (savedAttemptId) {
      pushToast("この採点結果はすでに保存しています");
      return;
    }

    const ok = window.confirm(
      "この採点結果を履歴に保存します。よろしいですか？"
    );
    if (!ok) return;

    const now = Date.now();
    const id = cryptoId();

    const details: KokugoAttemptDetail[] = grade.details.map((r) => {
      const q = exam.questionIndex[r.qid];

      return {
        answerNo: r.answerNo,
        dai: r.dai,
        no: r.no,
        qid: r.qid,
        chosen: r.chosen,
        correctChoice: r.correctChoice,
        got: r.got,
        max: r.max,
        prompt: q?.prompt,
        choices: q?.choices,
        explanation: q?.explanation,
      };
    });

    const payload: KokugoAttempt = {
      id,
      createdAt: now,
      dateKey: getDateKey(new Date(now)),
      examId: examKey,
      examTitle: exam.title,
      total: grade.total,
      maxTotal: grade.maxTotal,
      correctCount: grade.correctCount,
      answeredCount: grade.answeredCount,
      mean: exam.stats?.mean,
      sd: exam.stats?.sd,
      examinees: exam.stats?.examinees,
      details,
    };

    dispatch({ type: "KOKUGO_ATTEMPT_ADD", payload });
    setSavedAttemptId(id);

    pushToast(
      `採点結果を保存しました ✅（${payload.total}/${payload.maxTotal}）`
    );
  };

  const goSolve = () => setMode("solve");

  const goResult = () => {
    setTimerRunning(false);
    autoStopSignalRef.current += 1;
    setAutoStopSignal(autoStopSignalRef.current);
    setMode("result");
  };

  const barRunning = mode === "solve" && timerRunning;

  return (
    <>
      <section className="mx-auto w-full max-w-400 px-4">
        <div className="mb-4 rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="text-sm text-black/45">共通テスト</div>
              <h1 className="text-[22px] font-bold text-black md:text-[26px]">
                {exam.title}
              </h1>
              <div className="mt-1 text-sm text-black/55 md:text-[15px]">
                解答済み {answeredCount}/{totalAnswerNoCount}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push("/quiz")}
                className="rounded-xl border border-black/15 bg-white px-6 py-4 text-sm font-semibold hover:bg-black/3"
                type="button"
              >
                ← 問題一覧へ
              </button>

              <button
                className={`rounded-xl px-6 py-4 text-sm font-semibold ${
                  mode === "solve"
                    ? "bg-black text-white"
                    : "border border-black/15 bg-white hover:bg-black/3"
                }`}
                onClick={goSolve}
                type="button"
              >
                問題を解く
              </button>

              <button
                className={`rounded-xl px-6 py-4 text-sm font-semibold ${
                  mode === "result"
                    ? "bg-black text-white"
                    : "border border-black/15 bg-white hover:bg-black/3"
                }`}
                onClick={goResult}
                type="button"
              >
                採点する
              </button>

              {mode === "result" ? (
                <>
                  <button
                    type="button"
                    onClick={saveAttempt}
                    className={`rounded-xl px-6 py-4 text-sm font-semibold ${
                      savedAttemptId
                        ? "border border-black/10 bg-black/5 text-black/60"
                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                    }`}
                    disabled={!!savedAttemptId}
                  >
                    {savedAttemptId ? "保存済み" : "採点結果を保存"}
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/kokugo/history")}
                    className="rounded-xl border border-black/15 bg-white px-6 py-4 text-sm font-semibold hover:bg-black/3"
                  >
                    採点履歴を見る
                  </button>
                </>
              ) : null}

              <button
                onClick={() => router.push(`/admin/kokugo/${exam.year}`)}
                className="rounded-xl border border-black/15 bg-white px-6 py-4 text-sm font-semibold hover:bg-black/3"
                type="button"
              >
                データ編集（国語{exam.year}）
              </button>

              <button
                type="button"
                onClick={() => copyPdfLink("file")}
                className="rounded-xl border border-black/15 bg-white px-6 py-4 text-sm font-semibold hover:bg-black/3"
              >
                {copiedKind === "file" ? "コピー済み" : "PDFリンクコピー"}
              </button>
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {exam.dais.map((d, index) => (
            <button
              key={`dai-${d.dai}-${index}`}
              onClick={() => selectDai(d.dai)}
              className={`rounded-md border px-4 py-3 text-sm font-semibold ${
                d.dai === activeDai
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-black/15 bg-white hover:bg-black/3"
              }`}
              type="button"
            >
              {d.title}
            </button>
          ))}
        </div>

        <section className="rounded-2xl border bg-white/80 p-4 mb-4">
          {mode === "solve" ? (
            activeQ ? (
              <>
                <div className="mb-3">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={goPrev}
                      disabled={!hasPrev}
                      className={[
                        "w-full inline-flex items-center justify-center",
                        "h-11 rounded-xl border bg-white shadow-sm",
                        "transition hover:bg-black/5 active:scale-[0.98]",
                        "disabled:opacity-40 disabled:cursor-not-allowed",
                      ].join(" ")}
                    >
                      ← 前へ
                    </button>

                    <button
                      type="button"
                      onClick={openPdfInAppPage}
                      className={[
                        "w-full inline-flex items-center justify-center",
                        "h-11 rounded-xl border bg-white shadow-sm",
                        "transition hover:bg-black/5 active:scale-[0.98]",
                      ].join(" ")}
                    >
                      {pdfMode === "q" ? "問題PDFへ" : "解答PDFへ"}
                    </button>

                    <button
                      type="button"
                      onClick={goNext}
                      disabled={!hasNext}
                      className={[
                        "w-full inline-flex items-center justify-center",
                        "h-11 rounded-xl border bg-blue-600 text-white shadow-sm",
                        "transition hover:bg-blue-700 active:scale-[0.98]",
                        "disabled:opacity-40 disabled:cursor-not-allowed",
                      ].join(" ")}
                    >
                      次へ →
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  {hasPassage ? (
                    <div className="rounded-xl border bg-white px-3 py-2">
                      <div className="text-xs text-black/60 mb-1">
                        {passageView.title}
                      </div>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {passageView.text}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-red-600">
                      本文が見つかりません（passageId と passages.json の id
                      を確認）
                    </div>
                  )}
                </div>

                <div className="rounded-xl border bg-white p-4">
                  <div className="font-bold mb-2">
                    {dai?.title} / 問{activeQ.no}
                  </div>

                  <div className="text-base font-semibold mb-3">
                    {activeQ.prompt}
                  </div>

                  <div className="grid gap-2">
                    {activeQ.choices.map((c, i) => {
                      const selected = chosenOnQuestionView === i;
                      return (
                        <button
                          key={i}
                          className={`w-full rounded-2xl border px-4 py-3 text-left ${
                            selected
                              ? "border-black bg-black/5"
                              : "border-black/10"
                          }`}
                          onClick={() => setChoice(activeQ.id, i)}
                          type="button"
                        >
                          {`${"①②③④"[i] ?? `${i + 1}.`}  ${c}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-black/60">設問がありません</div>
            )
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-lg font-bold">採点結果</div>

                  <button
                    type="button"
                    onClick={saveAttempt}
                    disabled={!!savedAttemptId}
                    className={`text-sm rounded-xl border px-3 py-2 ${
                      savedAttemptId
                        ? "bg-black/5 text-black/60"
                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                    }`}
                  >
                    {savedAttemptId ? "保存済み" : "採点結果を保存"}
                  </button>
                </div>

                <div className="text-2xl font-extrabold mt-2">
                  {grade.total} / {grade.maxTotal}
                </div>

                <div className="text-sm text-black/60 mt-2">
                  正答数 {grade.correctCount}/{grade.answeredCount}
                  （未回答を除く）
                </div>

                {savedAttemptId ? (
                  <div className="mt-2 text-sm">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/dashboard/kokugo/history/${savedAttemptId}`
                        )
                      }
                      className="rounded-lg border px-3 py-1 bg-white hover:bg-black/5"
                    >
                      今保存した履歴を開く →
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border bg-white p-4">
                <div className="font-bold mb-2">平均データ（年度）</div>

                {exam.stats ? (
                  <>
                    <div className="text-sm text-black/70">
                      平均点：{exam.stats.mean} / 受験者数：
                      {exam.stats.examinees.toLocaleString()}
                      {typeof exam.stats.sd === "number"
                        ? ` / 標準偏差：${exam.stats.sd}`
                        : ""}
                    </div>

                    {statsView ? (
                      <div className="mt-3 grid gap-2">
                        <div className="rounded-xl border px-3 py-2 flex items-center justify-between">
                          <div className="font-semibold">偏差値</div>
                          <div className="font-extrabold text-xl">
                            {statsView.hensachi.toFixed(1)}
                          </div>
                        </div>

                        <div className="rounded-xl border px-3 py-2 flex items-center justify-between">
                          <div className="font-semibold">推定順位</div>
                          <div className="flex items-end gap-1">
                            <span className="font-extrabold text-xl">
                              {statsView.rank.toLocaleString()}
                            </span>
                            <span className="text-sm text-black/60">
                              / {statsView.examinees.toLocaleString()} 位
                            </span>
                          </div>
                        </div>

                        <div className="rounded-xl border px-3 py-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-semibold">成績判定</div>

                            <div
                              className={[
                                "min-w-16 text-center rounded-xl border px-3 py-1",
                                "font-extrabold text-2xl",
                                statsView.judge.tone,
                              ].join(" ")}
                            >
                              {statsView.judge.label}
                            </div>
                          </div>

                          <div className="mt-2 text-sm text-black/70">
                            目安：{statsView.judge.description}
                          </div>

                          <div className="mt-2 text-sm text-black/70">
                            下位：{statsView.upperPercent.toFixed(1)}%
                          </div>

                          <div className="text-sm text-black/70">
                            偏差値帯：{statsView.currentHensachiBand.label}
                          </div>

                          <div className="text-sm text-black/70">
                            得点帯：{statsView.currentScoreBand.label}
                          </div>
                        </div>

                        <div className="text-xs text-black/60">
                          ※ 正規分布仮定による推定 /
                          判定・偏差値帯・得点帯は目安です
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 text-sm text-black/60">
                        偏差値/順位には標準偏差（sd）が必要です
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-black/60">
                    stats（平均点/受験者数/標準偏差）を設定すると偏差値/順位が表示できます
                  </div>
                )}
              </div>

              <div className="rounded-2xl border bg-white p-4">
                <div className="font-bold mb-2">採点詳細（解答番号ごと）</div>

                <div className="overflow-x-auto">
                  <table className="min-w-180 w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="border px-2 py-2 bg-black/5 text-left">
                          解答番号
                        </th>
                        <th className="border px-2 py-2 bg-black/5 text-left">
                          大問/問
                        </th>
                        <th className="border px-2 py-2 bg-black/5 text-left">
                          あなた
                        </th>
                        <th className="border px-2 py-2 bg-black/5 text-left">
                          正解
                        </th>
                        <th className="border px-2 py-2 bg-black/5 text-center w-16">
                          判定
                        </th>
                        <th className="border px-2 py-2 bg-black/5 text-right">
                          得点
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {grade.details.map((r) => {
                        const correct = isCorrectRow(r.chosen, r.correctChoice);

                        const rowBg =
                          r.chosen === null
                            ? "bg-black/5 text-black/60"
                            : correct
                              ? "bg-emerald-50"
                              : "bg-rose-50";

                        const judgeText =
                          r.chosen === null
                            ? "text-black/60"
                            : correct
                              ? "text-emerald-700 font-bold"
                              : "text-rose-700 font-bold";

                        return (
                          <tr key={r.key}>
                            <td className={`border px-2 py-2 ${rowBg}`}>
                              {r.answerNo}
                            </td>

                            <td className={`border px-2 py-2 ${rowBg}`}>
                              第{r.dai}問 / 問{r.no}
                            </td>

                            <td className={`border px-2 py-2 ${rowBg}`}>
                              {choiceLabel(r.chosen)}
                            </td>

                            <td className={`border px-2 py-2 ${rowBg}`}>
                              {choiceLabel(r.correctChoice)}
                            </td>

                            <td
                              className={`border px-2 py-2 text-center ${rowBg}`}
                            >
                              <span className={judgeText}>
                                {judgeMark(r.chosen, r.correctChoice)}
                              </span>
                            </td>

                            <td
                              className={`border px-2 py-2 text-right ${rowBg}`}
                            >
                              {r.got}/{r.max}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="text-xs text-black/60 mt-2">
                  ※ 正解：〇 / 不正解：✖
                </div>
              </div>
            </div>
          )}
        </section>

        <AnswerSheet exam={exam} answers={answers} onChange={setChoice} />

        <section className="rounded-2xl bg-white/80 border p-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold">
              {pdfMode === "q" ? "問題PDF" : "解答PDF"}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className={[
                  "px-2 py-1 rounded-lg border text-sm",
                  pdfMode === "q" ? "bg-black text-white" : "bg-white",
                ].join(" ")}
                onClick={() => {
                  setPdfMode("q");
                  if (activeQ) syncPdfFromQuestion(activeQ, "q");
                }}
              >
                問題
              </button>

              <button
                type="button"
                className={[
                  "px-2 py-1 rounded-lg border text-sm",
                  pdfMode === "a" ? "bg-black text-white" : "bg-white",
                ].join(" ")}
                onClick={() => {
                  setPdfMode("a");
                  if (activeQ) syncPdfFromQuestion(activeQ, "a");
                }}
              >
                解答
              </button>

              <button
                type="button"
                className="px-2 py-1 rounded-lg border text-sm bg-white"
                onClick={() => copyPdfLink("viewer")}
              >
                {copiedKind === "viewer"
                  ? "コピー済み"
                  : "ビューアリンクコピー"}
              </button>
            </div>
          </div>

          <PdfViewer
            url={pdfUrl}
            page={pdfPage}
            height={420}
            showControls
            onPageChange={onPdfPageChange}
          />

          {dai?.pageHint ? (
            <div className="text-xs text-black/60 mt-2">
              ヒント：
              {pdfMode === "q"
                ? `問題 p.${dai.pageHint.qStart ?? "?"}〜${dai.pageHint.qEnd ?? "?"}`
                : `解答 p.${dai.pageHint.aStart ?? "?"}〜${dai.pageHint.aEnd ?? "?"}`}
            </div>
          ) : null}
        </section>

        <div className="h-28" />
      </section>

      <ElapsedTimeBar
        running={barRunning}
        totalSeconds={TOTAL_SECONDS}
        initialElapsedSeconds={0}
        onToggle={() => setTimerRunning((v) => !v)}
        rightText={`解答済み ${answeredCount}/${totalAnswerNoCount}`}
        showAddButton={mode === "result"}
        autoStopSignal={autoStopSignal}
        afterAddAction="reset"
        onAddToToday={(sec) => {
          dispatch({
            type: "ADD_STUDY_SECONDS",
            dateKey: todayKey,
            seconds: sec,
            sessionsDelta: 1,
          });

          pushToast(
            `今日の学習に追加しました 🔥 ${formatAddedSecondsPlus(sec)}（国語 / 共通テスト${exam.year}）`
          );
        }}
      />
    </>
  );
}
