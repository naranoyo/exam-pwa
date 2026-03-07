// app/dashboard/study/page.tsx
"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useApp } from "@/lib/state";
import { getDateKey, formatJPFullDateTime } from "@/lib/date";
import type { QuizResult } from "@/lib/quiz";
import { StudyTabs } from "@/components/dashboard/StudyTabs";

function clampInt(n: number) {
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

function formatDuration(sec: number) {
  const s = Math.max(0, clampInt(sec));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;

  if (hh > 0) return `${hh}時間${String(mm).padStart(2, "0")}分`;
  if (mm > 0) return `${mm}分${String(ss).padStart(2, "0")}秒`;
  return `${ss}秒`;
}

function formatHM(dateMs: number) {
  const d = new Date(dateMs);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatSubjectLabel(key: string) {
  const map: Record<string, string> = {
    english: "英語",
    japanese: "国語",
    math: "数学",

    vocab: "英単語",
    kanji: "漢字",
    kokugo: "共テ国語",

    "english/vocab/vocab-4": "英語 / 英単語4択",
    "japanese/kanji/kanji-yomi-100": "国語 / 漢字（読み）100",
    "japanese/kanji/kanji-imi-100": "国語 / 漢字（意味）100",
    "japanese/kanji/kanji-yomi-past5": "国語 / 漢字（読み）過去5年",
    "japanese/kokugo/kokugo-2025": "国語 / 共テ国語2025",
    "japanese/kokugo/kokugo-2024": "国語 / 共テ国語2024",
    "japanese/kokugo/kokugo-2023": "国語 / 共テ国語2023",
  };

  return map[key] ?? key;
}

type QuizResultEx = QuizResult & {
  subject?: string;
  category?: string;
  subjectKey?: string;

  title?: string;
  examTitle?: string;
  exam?: string;
  level?: string;

  total?: number;
  score?: number;
  maxTotal?: number;
  max?: number;

  correctCount?: number;
  answeredCount?: number;

  seconds?: number;
  elapsedSeconds?: number;
  timeSeconds?: number;

  createdAt?: number;
  at?: number;
  timestamp?: number;

  dateKey?: string;
};

function getResultMeta(r: QuizResultEx) {
  const subjectRaw =
    (typeof r.subjectKey === "string" && r.subjectKey) ||
    [
      typeof r.subject === "string" ? r.subject : "",
      typeof r.category === "string" ? r.category : "",
      typeof r.level === "string" ? r.level : "",
    ]
      .filter(Boolean)
      .join("/") ||
    (typeof r.subject === "string" && r.subject) ||
    "学習";

  const subject = formatSubjectLabel(subjectRaw);

  const title =
    (typeof r.title === "string" && r.title) ||
    (typeof r.examTitle === "string" && r.examTitle) ||
    (typeof r.exam === "string" && r.exam) ||
    (typeof r.level === "string" && r.level) ||
    "";

  const total =
    typeof r.total === "number"
      ? r.total
      : typeof r.score === "number"
        ? r.score
        : null;

  const max =
    typeof r.maxTotal === "number"
      ? r.maxTotal
      : typeof r.max === "number"
        ? r.max
        : null;

  const correct = typeof r.correctCount === "number" ? r.correctCount : null;
  const answered = typeof r.answeredCount === "number" ? r.answeredCount : null;

  const spentSec =
    typeof r.seconds === "number"
      ? r.seconds
      : typeof r.elapsedSeconds === "number"
        ? r.elapsedSeconds
        : typeof r.timeSeconds === "number"
          ? r.timeSeconds
          : null;

  const at =
    typeof r.createdAt === "number"
      ? r.createdAt
      : typeof r.at === "number"
        ? r.at
        : typeof r.timestamp === "number"
          ? r.timestamp
          : null;

  return {
    subject,
    subjectRaw,
    title,
    total,
    max,
    correct,
    answered,
    spentSec,
    at,
  };
}

function SubjectBarChart({
  items,
}: {
  items: { key: string; label: string; seconds: number }[];
}) {
  const max = Math.max(1, ...items.map((x) => x.seconds));

  return (
    <div className="space-y-2">
      {items.map((x) => {
        const w = Math.round((x.seconds / max) * 100);

        return (
          <div key={x.key} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold truncate">{x.label}</div>
              <div className="text-xs text-black/60 tabular-nums">
                {formatDuration(x.seconds)}
              </div>
            </div>
            <div className="h-3 rounded-full bg-black/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-black/70"
                style={{ width: `${w}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function StudyDetailPage() {
  const { state } = useApp();
  const todayKey = useMemo(() => getDateKey(), []);

  const today = state.studyByDate?.[todayKey] ?? {
    dateKey: todayKey,
    totalSeconds: 0,
    sessions: 0,
    bySubject: {},
  };

  const todayResults = useMemo(() => {
    const all = (state.quizResults ?? []) as QuizResultEx[];

    const isSameDayByMs = (ms: number) => getDateKey(new Date(ms)) === todayKey;

    return all.filter((r) => {
      if (typeof r.dateKey === "string") return r.dateKey === todayKey;

      const t =
        typeof r.createdAt === "number"
          ? r.createdAt
          : typeof r.at === "number"
            ? r.at
            : typeof r.timestamp === "number"
              ? r.timestamp
              : null;

      if (typeof t === "number") return isSameDayByMs(t);
      return false;
    });
  }, [state.quizResults, todayKey]);

  const subjectLogs = useMemo(() => {
    return Object.entries(today.bySubject ?? {})
      .map(([key, v]) => ({
        key,
        label: formatSubjectLabel(key),
        count: v.sessions,
        seconds: v.seconds,
      }))
      .sort((a, b) => b.seconds - a.seconds);
  }, [today.bySubject]);

  const bySubject = useMemo(() => {
    const map = new Map<
      string,
      { key: string; label: string; count: number; seconds: number }
    >();

    for (const r of todayResults) {
      const m = getResultMeta(r);
      const key = m.subjectRaw;

      const prev = map.get(key) ?? {
        key,
        label: formatSubjectLabel(key),
        count: 0,
        seconds: 0,
      };

      map.set(key, {
        key,
        label: prev.label,
        count: prev.count + 1,
        seconds: prev.seconds + (m.spentSec ?? 0),
      });
    }

    for (const s of subjectLogs) {
      const prev = map.get(s.key) ?? {
        key: s.key,
        label: s.label,
        count: 0,
        seconds: 0,
      };

      map.set(s.key, {
        key: s.key,
        label: s.label,
        count: prev.count + s.count,
        seconds: prev.seconds + s.seconds,
      });
    }

    return Array.from(map.values()).sort((a, b) => b.seconds - a.seconds);
  }, [todayResults, subjectLogs]);

  const topSubjects = bySubject.slice(0, 8).map((x) => ({
    key: x.key,
    label: x.label,
    seconds: x.seconds,
  }));

  return (
    <main className="bg-[#FFFBEEDB] min-h-screen pt-[calc(env(safe-area-inset-top)+12px)] pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <div className="mx-auto max-w-md px-4 pb-6 space-y-4">
        <header className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-xl font-bold">今日の学習（詳細）</div>
              <div className="text-sm text-black/60">
                {formatJPFullDateTime(new Date())}
              </div>
            </div>

            <Link
              href="/dashboard"
              className="text-sm rounded-lg border border-black/15 px-3 py-1 bg-white hover:bg-black/5"
            >
              ダッシュボードへ
            </Link>
          </div>

          <div className="flex items-center justify-between gap-3">
            <StudyTabs active="today" />
          </div>
        </header>

        <section className="rounded-2xl bg-white/80 shadow-sm p-4 border border-black/5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-black/5 p-3">
              <div className="text-xs text-black/60">合計</div>
              <div className="mt-1 text-2xl font-bold">
                {formatDuration(today.totalSeconds)}
              </div>
            </div>

            <div className="rounded-xl bg-black/5 p-3">
              <div className="text-xs text-black/60">今日やった科目数</div>
              <div className="mt-1 text-2xl font-bold">
                {today.sessions}科目
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs text-black/50">
            科目:{" "}
            {Object.keys(today.bySubject ?? {})
              .map(formatSubjectLabel)
              .join(" / ") || "—"}
          </div>
        </section>

        <section className="rounded-2xl bg-white/80 shadow-sm p-4 border border-black/5">
          <div className="font-bold mb-2">科目別グラフ（今日）</div>
          {topSubjects.length === 0 ? (
            <div className="text-sm text-black/60">まだ記録がありません</div>
          ) : (
            <SubjectBarChart items={topSubjects} />
          )}
          <div className="mt-2 text-[11px] text-black/45">
            ※ クイズ履歴の所要時間と、保存された科目別学習時間を合算しています
          </div>
        </section>

        <section className="rounded-2xl bg-white/80 shadow-sm p-4 border border-black/5">
          <div className="font-bold mb-2">科目別内訳</div>

          {bySubject.length === 0 ? (
            <div className="text-sm text-black/60">まだ記録がありません</div>
          ) : (
            <div className="space-y-2">
              {bySubject.map((s) => (
                <div
                  key={s.key}
                  className="rounded-xl border bg-white px-3 py-2 flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{s.label}</div>
                    <div className="text-xs text-black/60">
                      履歴 {s.count}件
                    </div>
                  </div>
                  <div className="text-sm font-bold tabular-nums">
                    {formatDuration(s.seconds)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white/80 shadow-sm p-4 border border-black/5">
          <div className="font-bold mb-2">学習集計ログ（今日）</div>

          {subjectLogs.length === 0 ? (
            <div className="text-sm text-black/60">
              今日の学習集計はまだありません
            </div>
          ) : (
            <div className="space-y-2">
              {subjectLogs.map((x) => (
                <div
                  key={x.key}
                  className="rounded-xl border bg-white px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{x.label}</div>
                      <div className="text-[11px] text-black/45 mt-0.5">
                        セッション {x.count}件
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-bold tabular-nums">
                      {formatDuration(x.seconds)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white/80 shadow-sm p-4 border border-black/5">
          <div className="font-bold mb-2">クイズ履歴（今日）</div>

          {todayResults.length === 0 ? (
            <div className="text-sm text-black/60">
              今日の履歴はまだありません
            </div>
          ) : (
            <div className="space-y-2">
              {todayResults.map((r, idx) => {
                const m = getResultMeta(r);
                const time = typeof m.at === "number" ? formatHM(m.at) : "—";

                const score =
                  typeof m.total === "number" && typeof m.max === "number"
                    ? `${m.total}/${m.max}`
                    : "";

                const right =
                  typeof m.spentSec === "number"
                    ? formatDuration(m.spentSec)
                    : score;

                const sub =
                  m.correct !== null && m.answered !== null
                    ? `正答 ${m.correct}/${m.answered}`
                    : "";

                return (
                  <div
                    key={idx}
                    className="rounded-xl border bg-white px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs text-black/60">{time}</div>
                        <div className="font-semibold truncate">
                          {m.subject}
                          {m.title ? ` / ${m.title}` : ""}
                        </div>
                        {sub ? (
                          <div className="text-xs text-black/60 mt-0.5">
                            {sub}
                          </div>
                        ) : null}
                      </div>

                      <div className="shrink-0 text-sm font-bold tabular-nums">
                        {right || "—"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
