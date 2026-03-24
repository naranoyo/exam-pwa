// components/quiz/kango/KangoExamClient.tsx
"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PdfViewer } from "@/components/quiz/PdfViewer";
import { ElapsedTimeBar } from "@/components/quiz/kokugo/ElapsedTimeBar";
import { KangoAnswerSheet } from "@/components/quiz/kango/KangoAnswerSheet";
import type { UserAnswer } from "@/lib/examTypes";
import { isCorrectAnswer } from "@/lib/grading";
import {
  calcKangoResult,
  chooseKangoAnswer,
  clearKangoAnswer,
  createInitialKangoAnswers,
  getKangoQuestionTypeLabel,
  saveKangoState,
  type KangoExam,
  type KangoQuestion,
  type KangoAnswerMap,
} from "@/lib/kango";
import { useApp } from "@/lib/state";
import { getDateKey } from "@/lib/date";

type Props = {
  exam: KangoExam;
};

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

function isArrayAnswer(value: UserAnswer): value is number[] {
  return Array.isArray(value);
}

function isNumberAnswer(value: UserAnswer): value is number {
  return typeof value === "number";
}

function isTextAnswer(value: UserAnswer): value is string {
  return typeof value === "string";
}

function isAnsweredValue(value: UserAnswer) {
  return (
    typeof value === "number" ||
    (Array.isArray(value) && value.length > 0) ||
    (typeof value === "string" && value.trim().length > 0)
  );
}

function formatAnswerLabel(value: UserAnswer) {
  if (value === null) return "未";

  if (typeof value === "number") {
    return String(value + 1);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "未";
    return value
      .slice()
      .sort((a, b) => a - b)
      .map((v) => String(v + 1))
      .join(",");
  }

  if (typeof value === "string") {
    return value.trim().length > 0 ? "入力" : "未";
  }

  return "未";
}

function formatResultAnswer(value: UserAnswer) {
  if (value === null) return "未回答";

  if (typeof value === "number") {
    return `${value + 1}`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "未回答";
    return value
      .slice()
      .sort((a, b) => a - b)
      .map((v) => `${v + 1}`)
      .join(", ");
  }

  if (typeof value === "string") {
    return value.trim().length > 0 ? value : "未回答";
  }

  return "未回答";
}

function formatCorrectAnswer(question: KangoQuestion) {
  switch (question.type) {
    case "single":
    case "combo":
      return typeof question.answer === "number"
        ? `${question.answer + 1}`
        : "未設定";

    case "multi":
      return Array.isArray(question.answer)
        ? question.answer
            .slice()
            .sort((a, b) => a - b)
            .map((v) => `${v + 1}`)
            .join(", ")
        : "未設定";

    case "text":
      return question.answerText ?? "未設定";

    case "case":
      if (Array.isArray(question.answer)) {
        return question.answer
          .slice()
          .sort((a, b) => a - b)
          .map((v) => `${v + 1}`)
          .join(", ");
      }
      return typeof question.answer === "number"
        ? `${question.answer + 1}`
        : "未設定";

    default:
      return "未設定";
  }
}

function getQuestionInstruction(question: KangoQuestion) {
  switch (question.type) {
    case "multi":
      return question.selectCount
        ? `${question.selectCount}つ選択`
        : "複数選択";
    case "combo":
      return "組み合わせ問題";
    case "text":
      return "記述問題";
    case "case":
      return Array.isArray(question.answer)
        ? question.selectCount
          ? `${question.selectCount}つ選択`
          : "複数選択"
        : "1つ選択";
    case "single":
    default:
      return "1つ選択";
  }
}

export function KangoExamClient({ exam }: Props) {
  const router = useRouter();
  const { dispatch } = useApp();

  const questions = exam.questions;

  const [mode, setMode] = useState<Mode>("solve");
  const [pdfMode, setPdfMode] = useState<PdfMode>("q");
  const [copiedKind, setCopiedKind] = useState<"viewer" | "file" | null>(null);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<KangoAnswerMap>(() =>
    createInitialKangoAnswers(exam.questions)
  );

  const didHydrateRef = useRef(false);

  const TOTAL_SECONDS = (exam.meta.durationMinutes ?? 160) * 60;

  const [timerRunning, setTimerRunning] = useState(false);
  const autoStopSignalRef = useRef(0);
  const [autoStopSignal, setAutoStopSignal] = useState(0);

  // 初回表示時は毎回まっさらで開始
  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      startTransition(() => {
        setAnswers(createInitialKangoAnswers(exam.questions));
        setCurrentIndex(0);
        didHydrateRef.current = true;
      });
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [exam]);

  const safeIndex = Math.min(Math.max(currentIndex, 0), questions.length - 1);
  const current = questions[safeIndex];

  useEffect(() => {
    if (!didHydrateRef.current) return;
    saveKangoState(exam, answers, safeIndex);
  }, [exam, answers, safeIndex]);

  const result = useMemo(
    () => calcKangoResult(questions, answers),
    [questions, answers]
  );

  const currentPicked = current ? (answers[current.id] ?? null) : null;

  const questionPdf = exam.meta.questionPdf;
  const answerPdf = exam.meta.answerPdf ?? null;
  const pdfSrc = pdfMode === "q" ? questionPdf : answerPdf || questionPdf;
  const pdfPage = current?.pdfPage ?? 1;
  const sessionLabel = exam.meta.session === "pm" ? "PM" : "AM";

  function choose(choiceIndex: number) {
    if (!current) return;

    setAnswers((prev: KangoAnswerMap) => ({
      ...prev,
      [current.id]: chooseKangoAnswer(
        current,
        prev[current.id] ?? null,
        choiceIndex
      ),
    }));
  }

  function setChoiceForQuestion(questionId: string, choiceIndex: number) {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    setAnswers((prev: KangoAnswerMap) => ({
      ...prev,
      [questionId]: chooseKangoAnswer(
        question,
        prev[questionId] ?? null,
        choiceIndex
      ),
    }));
  }

  function clearCurrentAnswer() {
    if (!current) return;

    setAnswers((prev: KangoAnswerMap) => ({
      ...prev,
      [current.id]: clearKangoAnswer(current),
    }));
  }

  function jumpTo(index: number) {
    setCurrentIndex(index);
    setMode("solve");
  }

  function goPrev() {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }

  function goNext() {
    setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
  }

  function goSolve() {
    setAnswers(createInitialKangoAnswers(questions));
    setCurrentIndex(0);
    setMode("solve");
  }

  function goResult() {
    setTimerRunning(false);
    autoStopSignalRef.current += 1;
    setAutoStopSignal(autoStopSignalRef.current);
    setMode("result");
  }

  function resetAll() {
    if (!window.confirm("解答をすべてリセットしますか？")) return;
    setAnswers(createInitialKangoAnswers(questions));
    setCurrentIndex(0);
    setMode("solve");
  }

  function openPdfInAppPage() {
    router.push(`/pdf?src=${encodeURIComponent(pdfSrc)}&page=${pdfPage}`);
  }

  function getPdfViewerLink() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = new URL("/pdf", origin);
    url.searchParams.set("src", pdfSrc);
    url.searchParams.set("page", String(pdfPage));
    return url.toString();
  }

  function getPdfFileLink() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return new URL(pdfSrc, origin).toString();
  }

  async function copyPdfLink(kind: "viewer" | "file") {
    const text = kind === "viewer" ? getPdfViewerLink() : getPdfFileLink();
    const ok = await copyToClipboard(text);

    if (ok) {
      setCopiedKind(kind);
      window.setTimeout(() => setCopiedKind(null), 1500);
    }
  }

  const barRunning = mode === "solve" && timerRunning;

  if (!current) {
    return (
      <section className="mx-auto w-full max-w-400 px-4">
        <div className="rounded-xl border border-black/10 bg-white/80 p-4">
          問題データがありません
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="mx-auto w-full max-w-400 px-4">
        <div className="mb-4 rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="text-sm text-black/45">看護師国家試験</div>
              <h1 className="text-[22px] font-bold text-black md:text-[26px]">
                {exam.meta.title}
              </h1>
              <div className="mt-1 text-sm text-black/55 md:text-[15px]">
                解答済み {result.answered}/{result.total}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push("/quiz")}
                className="rounded-xl border border-black/15 bg-white px-6 py-4 text-sm font-semibold hover:bg-gray-50"
                type="button"
              >
                ← 問題一覧へ
              </button>

              <button
                className={`rounded-xl px-6 py-4 text-sm font-semibold ${
                  mode === "solve"
                    ? "bg-black text-white"
                    : "border border-black/15 bg-white hover:bg-gray-50"
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
                    : "border border-black/15 bg-white hover:bg-gray-50"
                }`}
                onClick={goResult}
                type="button"
              >
                採点する
              </button>

              <button
                type="button"
                onClick={() => copyPdfLink("file")}
                className="rounded-xl border border-black/15 bg-white px-6 py-4 text-sm font-semibold hover:bg-gray-50"
              >
                {copiedKind === "file" ? "コピー済み" : "PDFリンクコピー"}
              </button>
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => jumpTo(idx)}
              className={`rounded-md border px-4 py-3 text-sm font-semibold ${
                idx === safeIndex
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-black/15 bg-white hover:bg-gray-50"
              }`}
              type="button"
            >
              {sessionLabel} {q.no}
            </button>
          ))}
        </div>

        <section className="mb-4 rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm">
          {mode === "solve" ? (
            <>
              <div className="mb-3">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={goPrev}
                    disabled={safeIndex === 0}
                    className={[
                      "inline-flex h-11 w-full items-center justify-center rounded-xl border bg-white shadow-sm",
                      "transition hover:bg-gray-50 active:scale-[0.98]",
                      "disabled:cursor-not-allowed disabled:opacity-40",
                    ].join(" ")}
                  >
                    ← 前へ
                  </button>

                  <button
                    type="button"
                    onClick={openPdfInAppPage}
                    className={[
                      "inline-flex h-11 w-full items-center justify-center rounded-xl border bg-white shadow-sm",
                      "transition hover:bg-gray-50 active:scale-[0.98]",
                    ].join(" ")}
                  >
                    {pdfMode === "q" ? "問題PDFへ" : "解答PDFへ"}
                  </button>

                  <button
                    type="button"
                    onClick={goNext}
                    disabled={safeIndex === questions.length - 1}
                    className={[
                      "inline-flex h-11 w-full items-center justify-center rounded-xl border bg-blue-600 text-white shadow-sm",
                      "transition hover:bg-blue-700 active:scale-[0.98]",
                      "disabled:cursor-not-allowed disabled:opacity-40",
                    ].join(" ")}
                  >
                    次へ →
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-black/10 bg-white p-5">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <div className="text-sm text-black/45">
                    {sessionLabel} {current.no}
                  </div>
                  <div className="rounded-full border border-black/10 bg-gray-50 px-3 py-1 text-xs font-semibold text-black/70">
                    {getKangoQuestionTypeLabel(current.type)}
                  </div>
                  <div className="rounded-full border border-black/10 bg-gray-50 px-3 py-1 text-xs font-semibold text-black/70">
                    {getQuestionInstruction(current)}
                  </div>
                </div>

                <div className="mb-3 text-base font-semibold leading-relaxed">
                  {current.question}
                </div>

                {current.type === "text" ? (
                  <div className="grid gap-3">
                    <textarea
                      value={isTextAnswer(currentPicked) ? currentPicked : ""}
                      onChange={(e) =>
                        setAnswers((prev: KangoAnswerMap) => ({
                          ...prev,
                          [current.id]: e.target.value,
                        }))
                      }
                      rows={4}
                      className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 outline-none focus:border-blue-500"
                      placeholder="解答を入力"
                    />
                  </div>
                ) : "choices" in current ? (
                  <div className="grid gap-2">
                    {current.choices.map((c, i) => {
                      const isMultiLike =
                        current.type === "multi" ||
                        (current.type === "case" &&
                          Array.isArray(current.answer));

                      const selected = isArrayAnswer(currentPicked)
                        ? currentPicked.includes(i)
                        : isNumberAnswer(currentPicked)
                          ? currentPicked === i
                          : false;

                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => choose(i)}
                          className={[
                            "w-full rounded-2xl border px-4 py-4 text-left transition",
                            "flex items-center justify-between gap-3",
                            selected
                              ? "border-black bg-gray-100 shadow-sm"
                              : "border-black/10 bg-white hover:bg-gray-50",
                          ].join(" ")}
                        >
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <div className="min-w-8 pt-0.5 font-semibold text-black/70">
                              {isMultiLike ? `${i + 1}` : `${i + 1}`}
                            </div>

                            <div className="flex-1 leading-relaxed">{c}</div>
                          </div>

                          <span
                            className={[
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold",
                              selected
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-black/15 bg-white text-transparent",
                            ].join(" ")}
                            aria-hidden="true"
                          >
                            ✓
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={clearCurrentAnswer}
                    className="rounded-md border border-black/15 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                    type="button"
                  >
                    この問題の回答をクリア
                  </button>

                  <div className="rounded-md bg-gray-50 px-4 py-2 text-sm text-black/65">
                    現在の回答: {formatAnswerLabel(currentPicked)}
                  </div>
                </div>
              </div>

              <section className="mt-4">
                <KangoAnswerSheet
                  questions={questions}
                  answers={answers}
                  currentIndex={safeIndex}
                  onJump={jumpTo}
                  onSelect={setChoiceForQuestion}
                />
              </section>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-black/10 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-lg font-bold">採点結果</div>
                </div>

                <div className="mt-2 text-2xl font-extrabold">
                  {result.gradable > 0
                    ? `${result.correct} / ${result.gradable}`
                    : "-"}
                </div>

                <div className="mt-2 text-sm text-black/60">
                  回答済み {result.answered}/{result.total}
                  {result.percent !== null
                    ? ` / 正答率 ${result.percent}%`
                    : " / 正答未設定"}
                </div>
              </div>

              <div className="rounded-xl border border-black/10 bg-white p-4">
                <div className="mb-2 font-bold">採点詳細</div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {questions.map((q) => {
                    const picked = answers[q.id] ?? null;
                    const answered = isAnsweredValue(picked);
                    const correct = answered
                      ? isCorrectAnswer(q, picked)
                      : false;

                    const cardClass = !answered
                      ? "border-gray-200 bg-gray-50 text-black/60"
                      : correct
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-rose-200 bg-rose-50 text-rose-700";

                    return (
                      <div
                        key={q.id}
                        className={`rounded-md border px-4 py-3 text-sm ${cardClass}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold">
                            {sessionLabel} {q.no}
                          </div>
                          <div className="text-xs">
                            {!answered ? "ー" : correct ? "正解" : "不正解"}
                          </div>
                        </div>

                        <div className="mt-2 text-xs">
                          種別: {getKangoQuestionTypeLabel(q.type)}
                        </div>

                        <div className="mt-1 text-xs">
                          回答: {formatResultAnswer(picked)}
                        </div>

                        <div className="text-xs">
                          正答: {formatCorrectAnswer(q)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={goSolve}
                    className="rounded-md bg-black px-5 py-3 text-sm font-semibold text-white"
                    type="button"
                  >
                    問題を解く
                  </button>

                  <button
                    onClick={resetAll}
                    className="rounded-md border border-rose-200 bg-white px-5 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                    type="button"
                  >
                    すべてリセット
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="mx-auto mt-4 max-w-5xl rounded-xl border bg-white/80 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-bold">
              {pdfMode === "q" ? "問題PDF" : "解答PDF"}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className={[
                  "rounded-md border px-2 py-1 text-sm",
                  pdfMode === "q"
                    ? "bg-black text-white"
                    : "bg-white hover:bg-gray-50",
                ].join(" ")}
                onClick={() => setPdfMode("q")}
              >
                問題
              </button>

              <button
                type="button"
                className={[
                  "rounded-md border px-2 py-1 text-sm",
                  pdfMode === "a"
                    ? "bg-black text-white"
                    : "bg-white hover:bg-gray-50",
                ].join(" ")}
                onClick={() => setPdfMode("a")}
                disabled={!answerPdf}
              >
                解答
              </button>

              <button
                type="button"
                className="rounded-md border bg-white px-2 py-1 text-sm hover:bg-gray-50"
                onClick={() => copyPdfLink("viewer")}
              >
                {copiedKind === "viewer"
                  ? "コピー済み"
                  : "ビューアリンクコピー"}
              </button>
            </div>
          </div>

          <PdfViewer src={pdfSrc} page={pdfPage} height={320} />
        </section>

        <div className="h-28" />
      </section>

      <ElapsedTimeBar
        running={barRunning}
        totalSeconds={TOTAL_SECONDS}
        initialElapsedSeconds={0}
        onToggle={() => setTimerRunning((v) => !v)}
        rightText={`解答済み ${result.answered}/${result.total}`}
        showAddButton={mode === "result"}
        autoStopSignal={autoStopSignal}
        afterAddAction="reset"
        onAddToToday={(sec) => {
          dispatch({
            type: "ADD_STUDY_SECONDS",
            dateKey: getDateKey(new Date()),
            seconds: sec,
            sessionsDelta: 1,
          });
        }}
      />
    </>
  );
}
