// components/quiz/nihonshi/NihonshiExamClient.tsx

"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { PdfViewer } from "@/components/quiz/PdfViewer";
import { ElapsedTimeBar } from "@/components/quiz/kokugo/ElapsedTimeBar";
import NihonshiAnswerSheet from "./NihonshiAnswerSheet";

import {
  type NihonshiQuestion,
  type NihonshiMeta,
  type NihonshiAnswerState,
  NIHONSHI_2025_STATS,
  calcNihonshiHensachi,
  estimateNihonshiRank,
  getNihonshiGrade,
  gradeNihonshi,
  isCorrect,
} from "@/lib/nihonshi";

import { useApp } from "@/lib/state";
import { getDateKey } from "@/lib/date";
import { useToast } from "@/lib/toast";

import { addNihonshiHistory } from "@/lib/nihonshiHistory";

type Props = {
  meta: NihonshiMeta;
  questions: NihonshiQuestion[];
};

type Mode = "solve" | "sheet" | "result";
type PdfMode = "q" | "a";

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }
}

function formatAnswerLabel(value: number | number[] | null) {
  if (value === null) return "未";

  if (Array.isArray(value)) {
    if (value.length === 0) return "未";
    return value
      .slice()
      .sort((a, b) => a - b)
      .map((v) => String(v + 1))
      .join(",");
  }

  return String(value + 1);
}

function formatCorrectLabel(answer: number | number[]) {
  if (Array.isArray(answer)) {
    return answer
      .slice()
      .sort((a, b) => a - b)
      .map((v) => String(v + 1))
      .join(", ");
  }

  return String(answer + 1);
}

function isAnswered(value: number | number[] | null) {
  return (
    typeof value === "number" || (Array.isArray(value) && value.length > 0)
  );
}

export default function NihonshiExamClient({ meta, questions }: Props) {
  const router = useRouter();
  const { dispatch } = useApp();
  const { pushToast } = useToast();

  const [mode, setMode] = useState<Mode>("solve");
  const [pdfMode, setPdfMode] = useState<PdfMode>("q");
  const [copiedKind, setCopiedKind] = useState<"viewer" | "file" | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<NihonshiAnswerState>({});

  const [timerRunning, setTimerRunning] = useState(false);
  const autoStopSignalRef = useRef(0);
  const [autoStopSignal, setAutoStopSignal] = useState(0);

  const safeIndex = Math.min(Math.max(currentIndex, 0), questions.length - 1);
  const current = questions[safeIndex];

  const result = useMemo(
    () => gradeNihonshi(questions, answers),
    [questions, answers]
  );

  const hensachi = useMemo(
    () => calcNihonshiHensachi(result.score),
    [result.score]
  );

  const rankInfo = useMemo(
    () => estimateNihonshiRank(result.score),
    [result.score]
  );

  const grade = useMemo(() => getNihonshiGrade(hensachi), [hensachi]);

  const answeredCount = useMemo(() => {
    return questions.filter((q) => isAnswered(answers[q.id] ?? null)).length;
  }, [questions, answers]);

  const pdfSrc =
    pdfMode === "a" && meta.answerPdf ? meta.answerPdf : meta.questionPdf;

  const pdfPage = current?.pdfPage ?? 1;
  const totalSeconds = (meta.durationMinutes ?? 60) * 60;
  const barRunning = mode === "solve" && timerRunning;

  const scoreBandStart = Math.floor(result.score / 5) * 5;
  const scoreBandEnd = scoreBandStart + 4;

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

  function chooseSingle(q: NihonshiQuestion, choiceIndex: number) {
    setAnswers((prev) => ({
      ...prev,
      [q.id]: choiceIndex,
    }));
  }

  function chooseMulti(q: NihonshiQuestion, choiceIndex: number) {
    setAnswers((prev) => {
      const arr = Array.isArray(prev[q.id]) ? (prev[q.id] as number[]) : [];
      const exists = arr.includes(choiceIndex);

      const next = exists
        ? arr.filter((x) => x !== choiceIndex)
        : [...arr, choiceIndex];

      return {
        ...prev,
        [q.id]: next,
      };
    });
  }

  function setChoiceForQuestion(questionId: string, choiceIndex: number) {
    const q = questions.find((x) => x.id === questionId);
    if (!q) return;

    if (q.type === "multi") {
      chooseMulti(q, choiceIndex);
    } else {
      chooseSingle(q, choiceIndex);
    }
  }

  function clearCurrentAnswer() {
    if (!current) return;

    setAnswers((prev) => ({
      ...prev,
      [current.id]: null,
    }));
  }

  function jumpTo(index: number) {
    setCurrentIndex(Math.min(Math.max(index, 0), questions.length - 1));
    setMode("solve");
  }

  function goPrev() {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }

  function goNext() {
    setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
  }

  function goResult() {
    setTimerRunning(false);
    autoStopSignalRef.current += 1;
    setAutoStopSignal(autoStopSignalRef.current);
    setMode("result");
  }

  function resetAll() {
    if (!window.confirm("解答をすべてリセットしますか？")) return;
    setAnswers({});
    setCurrentIndex(0);
    setMode("solve");
  }

  function saveResult() {
    const ok = window.confirm(
      "この採点結果を履歴に保存します。よろしいですか？"
    );

    if (!ok) return;

    const dateKey = getDateKey(new Date());

    const details = questions.map((q) => {
      const value = answers[q.id] ?? null;
      const ok = isCorrect(q, value);

      const chosen = Array.isArray(value) ? (value[0] ?? null) : value;
      const correctChoice = Array.isArray(q.answer) ? q.answer[0] : q.answer;

      return {
        answerNo: q.answerNo,
        dai: q.dai,
        no: q.no,
        qid: q.id,
        chosen,
        correctChoice,
        got: ok ? q.score : 0,
        max: q.score,
        question: q.question,
        choices: q.choices,
        explanation: q.explanation,
      };
    });

    addNihonshiHistory({
      dateKey,

      examId: meta.id,
      examTitle: meta.title,
      year: 2025,

      total: result.score,
      maxTotal: result.maxScore,
      correctCount: result.correctCount,
      answeredCount,
      percent: result.percent,
      hensachi,

      mean: NIHONSHI_2025_STATS.mean,
      sd: NIHONSHI_2025_STATS.sd,
      examinees: NIHONSHI_2025_STATS.examinees,

      details,
    });

    pushToast("採点結果を保存しました");
  }

  if (!current) {
    return (
      <main className="mx-auto max-w-xl p-4">
        <section className="rounded-2xl border border-black/10 bg-white/80 p-4">
          問題データがありません
        </section>
      </main>
    );
  }

  const currentAnswer = answers[current.id] ?? null;

  return (
    <>
      <section className="mx-auto w-full max-w-400 px-4 pt-6">
        <div className="mb-4 rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="text-sm text-black/45">共通テスト 本番形式</div>
              <h1 className="text-[22px] font-bold text-black md:text-[26px]">
                {meta.title}
              </h1>
              <div className="mt-1 text-sm text-black/55 md:text-[15px]">
                解答済み {answeredCount}/{questions.length} / 配点{" "}
                {meta.totalScore}点
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
                onClick={() => setMode("solve")}
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

              {mode === "result" && (
                <>
                  <button
                    type="button"
                    onClick={saveResult}
                    className="rounded-xl bg-emerald-600 px-6 py-4 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    採点結果を保存
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/nihonshi/history")}
                    className="rounded-xl border border-black/15 bg-white px-6 py-4 text-sm font-semibold hover:bg-gray-50"
                  >
                    採点履歴を見る
                  </button>
                </>
              )}

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

        <div className="mb-4 grid grid-cols-6 gap-2 sm:flex sm:flex-wrap">
          {questions.map((q, idx) => {
            const value = answers[q.id] ?? null;
            const answered = isAnswered(value);

            return (
              <button
                key={q.id}
                onClick={() => jumpTo(idx)}
                className={[
                  "rounded-md border px-2 py-2 text-center text-sm font-semibold",
                  idx === safeIndex
                    ? "border-blue-600 bg-blue-600 text-white"
                    : answered
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-black/15 bg-white hover:bg-gray-50",
                ].join(" ")}
                type="button"
              >
                {q.answerNo}
              </button>
            );
          })}
        </div>

        <section className="mb-4 rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm">
          {mode === "solve" ? (
            <>
              <div className="mb-3 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={safeIndex === 0}
                  className="h-11 rounded-xl border bg-white shadow-sm disabled:opacity-40"
                >
                  ← 前へ
                </button>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/pdf?src=${encodeURIComponent(pdfSrc)}&page=${pdfPage}`
                    )
                  }
                  className="h-11 rounded-xl border bg-white shadow-sm"
                >
                  PDFへ
                </button>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={safeIndex === questions.length - 1}
                  className="h-11 rounded-xl border bg-blue-600 text-white shadow-sm disabled:opacity-40"
                >
                  次へ →
                </button>
              </div>

              <div className="rounded-xl border border-black/10 bg-white p-5">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <div className="text-sm text-black/45">
                    第{current.dai}問 問{current.no}
                  </div>
                  <div className="rounded-full border border-black/10 bg-gray-50 px-3 py-1 text-xs font-semibold text-black/70">
                    解答番号 {current.answerNo}
                  </div>
                  <div className="rounded-full border border-black/10 bg-gray-50 px-3 py-1 text-xs font-semibold text-black/70">
                    {current.type === "multi"
                      ? `${current.selectCount ?? 2}つ選択`
                      : "1つ選択"}
                  </div>
                </div>

                <div className="mb-3 whitespace-pre-wrap text-base font-semibold leading-relaxed">
                  {current.question}
                </div>

                <div className="grid gap-2">
                  {current.choices.map((choice, i) => {
                    const selected = Array.isArray(currentAnswer)
                      ? currentAnswer.includes(i)
                      : currentAnswer === i;

                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          current.type === "multi"
                            ? chooseMulti(current, i)
                            : chooseSingle(current, i)
                        }
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
                            {i + 1}
                          </div>
                          <div className="flex-1 leading-relaxed">{choice}</div>
                        </div>

                        <span
                          className={[
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold",
                            selected
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-black/15 bg-white text-transparent",
                          ].join(" ")}
                        >
                          ✓
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={clearCurrentAnswer}
                    className="rounded-md border border-black/15 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                    type="button"
                  >
                    この問題の回答をクリア
                  </button>

                  <div className="rounded-md bg-gray-50 px-4 py-2 text-sm text-black/65">
                    現在の回答: {formatAnswerLabel(currentAnswer)}
                  </div>
                </div>
              </div>

              <section className="mt-4">
                <NihonshiAnswerSheet
                  questions={questions}
                  answers={answers}
                  currentIndex={safeIndex}
                  onJump={jumpTo}
                  onSelect={setChoiceForQuestion}
                />
              </section>
            </>
          ) : mode === "sheet" ? (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-lg font-bold">解答用紙</div>
                <button
                  type="button"
                  onClick={resetAll}
                  className="rounded-md border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600"
                >
                  リセット
                </button>
              </div>

              <NihonshiAnswerSheet
                questions={questions}
                answers={answers}
                currentIndex={safeIndex}
                onJump={jumpTo}
                onSelect={setChoiceForQuestion}
              />

              <button
                type="button"
                onClick={goResult}
                className="mt-4 w-full rounded-xl bg-black p-3 text-sm font-semibold text-white"
              >
                採点する
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-black/10 bg-white p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-lg font-bold">採点結果</div>

                    <div className="mt-2 text-2xl font-extrabold">
                      {result.score} / {result.maxScore} 点
                    </div>

                    <div className="mt-2 text-sm text-black/60">
                      正解数 {result.correctCount}/{result.totalCount} / 正答率{" "}
                      {result.percent}%
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={saveResult}
                      className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      採点結果を保存
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push("/dashboard/nihonshi/history")}
                      className="rounded-xl border border-black/15 bg-white px-5 py-3 text-sm font-semibold hover:bg-gray-50"
                    >
                      採点履歴を見る
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-black/10 bg-white p-4">
                <div className="mb-3 text-lg font-bold">平均データ（年度）</div>

                <div className="text-sm text-black/70">
                  平均点：{NIHONSHI_2025_STATS.mean} / 受験者数：
                  {NIHONSHI_2025_STATS.examinees.toLocaleString()} / 標準偏差：
                  {NIHONSHI_2025_STATS.sd}
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-black/15 px-4 py-3">
                    <span className="font-bold">偏差値</span>
                    <span className="text-2xl font-extrabold">{hensachi}</span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-black/15 px-4 py-3">
                    <span className="font-bold">推定順位</span>
                    <span className="text-2xl font-extrabold">
                      {rankInfo.rank.toLocaleString()}
                      <span className="ml-1 text-sm font-normal text-black/60">
                        / {NIHONSHI_2025_STATS.examinees.toLocaleString()} 位
                      </span>
                    </span>
                  </div>

                  <div className="rounded-xl border border-black/15 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">成績判定</span>
                      <span className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-2 text-2xl font-extrabold text-rose-600">
                        {grade.label}
                      </span>
                    </div>

                    <div className="mt-3 text-sm text-black/70">
                      目安：{grade.text}
                      <br />
                      下位：{rankInfo.lowerRate}%
                      <br />
                      得点帯：{scoreBandStart}〜{scoreBandEnd}点
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-black/50">
                  ※ 正規分布仮定による推定 / 判定・偏差値帯・得点帯は目安です
                </div>
              </div>

              <div className="rounded-xl border border-black/10 bg-white p-4">
                <div className="mb-2 font-bold">採点詳細</div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {questions.map((q, index) => {
                    const picked = answers[q.id] ?? null;
                    const answered = isAnswered(picked);
                    const ok = answered ? isCorrect(q, picked) : false;

                    const cardClass = !answered
                      ? "border-gray-200 bg-gray-50 text-black/60"
                      : ok
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-rose-200 bg-rose-50 text-rose-700";

                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => jumpTo(index)}
                        className={`rounded-md border px-4 py-3 text-left text-sm ${cardClass}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold">
                            解答番号 {q.answerNo}
                          </div>
                          <div className="text-xs">
                            {!answered ? "ー" : ok ? "正解" : "不正解"}
                          </div>
                        </div>

                        <div className="mt-1 text-xs">
                          回答: {formatAnswerLabel(picked)}
                        </div>

                        <div className="text-xs">
                          正答: {formatCorrectLabel(q.answer)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="mx-auto mt-4 rounded-xl border bg-white/80 p-4">
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
                disabled={!meta.answerPdf}
              >
                解答
              </button>

              <button
                type="button"
                onClick={() => copyPdfLink("viewer")}
                className="rounded-md border bg-white px-2 py-1 text-sm hover:bg-gray-50"
              >
                {copiedKind === "viewer"
                  ? "コピー済み"
                  : "ビューアリンクコピー"}
              </button>
            </div>
          </div>

          <PdfViewer
            url={pdfSrc}
            page={pdfPage}
            height={320}
            showControls
            onPageChange={() => {}}
          />
        </section>

        <div className="h-28" />
      </section>

      <ElapsedTimeBar
        running={barRunning}
        totalSeconds={totalSeconds}
        initialElapsedSeconds={0}
        onToggle={() => setTimerRunning((v) => !v)}
        rightText={`解答済み ${answeredCount}/${questions.length}`}
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
