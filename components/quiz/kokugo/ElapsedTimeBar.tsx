// components/quiz/kokugo/ElapsedTimeBar.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function clampInt(n: number) {
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

function formatTime(sec: number) {
  const s = Math.max(0, clampInt(sec));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;

  if (hh > 0) {
    return `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

type AfterAddAction = "none" | "reset" | "badge";

type Props = {
  /** true の間だけカウント */
  running: boolean;

  /** 試験時間（秒）例: 90分=5400 */
  totalSeconds: number;

  /** 初期の経過秒（再開用） */
  initialElapsedSeconds?: number;

  /** 開始/停止ボタンを押したとき */
  onToggle?: () => void;

  /** 右側に小さく出す情報（例: 解答済み） */
  rightText?: string;

  /** ✅ 今日の学習に加算（秒） */
  onAddToToday?: (addSeconds: number) => void;

  /** ✅ ボタン表示（結果画面だけ true など） */
  showAddButton?: boolean;

  /** ✅ 二重加算防止：差分だけ加算 */
  addAsDeltaFromLastClick?: boolean;

  /**
   * ✅ 「追加」ボタンを停止中だけ押せるようにするか
   * - true: 停止中だけ（おすすめ）
   * - false: 計測中でも押せる
   */
  addOnlyWhenStopped?: boolean;

  /**
   * ✅ 結果画面に入ったら自動停止したい時に使うシグナル
   * - mode が result になった瞬間に 1 増やして渡す想定（例: 0→1→2…）
   * - 値が変化したら、running=true の場合に停止する（onToggleを呼ぶ）
   */
  autoStopSignal?: number;

  /**
   * ✅ 追加ボタン押下後の動作
   * - "reset": 経過を0に戻す（次の計測を新規スタート扱いに）
   * - "badge": 「追加しました」を数秒表示
   */
  afterAddAction?: AfterAddAction;

  /** "badge" の表示時間(ms) */
  addedBadgeMs?: number;
};

export function ElapsedTimeBar({
  running,
  totalSeconds,
  initialElapsedSeconds = 0,
  onToggle,
  rightText,
  onAddToToday,
  showAddButton = false,
  addAsDeltaFromLastClick = true,
  addOnlyWhenStopped = true,
  autoStopSignal,
  afterAddAction = "badge",
  addedBadgeMs = 1800,
}: Props) {
  const [elapsed, setElapsed] = useState(() => clampInt(initialElapsedSeconds));
  const tickRef = useRef<number | null>(null);

  // 二重加算防止：前回「追加」した時点の elapsed
  const lastAddedElapsedRef = useRef<number>(clampInt(initialElapsedSeconds));

  // 「追加しました」バッジ
  const [addedBadge, setAddedBadge] = useState(false);
  const badgeTimerRef = useRef<number | null>(null);

  // =========================
  // ✅ 結果画面に入ったら自動停止（signalが変化したら）
  // =========================
  const prevAutoStopRef = useRef<number | undefined>(autoStopSignal);
  useEffect(() => {
    const prev = prevAutoStopRef.current;
    prevAutoStopRef.current = autoStopSignal;

    // 初回は無視
    if (prev === undefined) return;
    if (autoStopSignal === undefined) return;
    if (prev === autoStopSignal) return;

    // signalが変化した＝「止めたいタイミング」
    if (running && onToggle) onToggle();
  }, [autoStopSignal, running, onToggle]);

  // =========================
  // running の切替に追従（インターバル管理）
  // =========================
  useEffect(() => {
    if (!running) {
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }

    tickRef.current = window.setInterval(() => {
      setElapsed((e) => {
        const next = e + 1;
        if (next >= totalSeconds) {
          if (tickRef.current) {
            window.clearInterval(tickRef.current);
            tickRef.current = null;
          }
          return totalSeconds;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [running, totalSeconds]);

  // バッジタイマーの後始末
  useEffect(() => {
    return () => {
      if (badgeTimerRef.current) {
        window.clearTimeout(badgeTimerRef.current);
        badgeTimerRef.current = null;
      }
    };
  }, []);

  const remaining = Math.max(0, totalSeconds - elapsed);
  const remainingLabel = useMemo(() => formatTime(remaining), [remaining]);
  const elapsedLabel = useMemo(() => formatTime(elapsed), [elapsed]);
  const isTimeUp = remaining <= 0;

  // ✅ render中に ref.current を読まない
  const canAdd =
    !!onAddToToday &&
    showAddButton &&
    elapsed > 0 &&
    (addOnlyWhenStopped ? !running : true);

  const showBadgeNow = addedBadge;

  const flashAddedBadge = () => {
    if (badgeTimerRef.current) {
      window.clearTimeout(badgeTimerRef.current);
      badgeTimerRef.current = null;
    }
    setAddedBadge(true);
    badgeTimerRef.current = window.setTimeout(
      () => {
        setAddedBadge(false);
        badgeTimerRef.current = null;
      },
      Math.max(300, clampInt(addedBadgeMs))
    );
  };

  const handleAdd = () => {
    if (!onAddToToday) return;

    let added = 0;

    if (addAsDeltaFromLastClick) {
      const last = lastAddedElapsedRef.current;
      const delta = Math.max(0, elapsed - last);
      if (delta <= 0) return;
      onAddToToday(delta);
      lastAddedElapsedRef.current = elapsed;
      added = delta;
    } else {
      if (elapsed <= 0) return;
      onAddToToday(elapsed);
      added = elapsed;
    }

    // ✅ 押した後の動作
    if (afterAddAction === "reset") {
      // 経過を0に戻す（連続計測のときもズレないよう lastAdded も 0 に）
      setElapsed(0);
      lastAddedElapsedRef.current = 0;

      // ついでに分かるようにバッジも出す（不要なら消してOK）
      flashAddedBadge();
      return;
    }

    if (afterAddAction === "badge") {
      // 追加済み表示だけ
      if (added > 0) flashAddedBadge();
    }
  };

  return (
    <div
      className="
        fixed left-0 right-0 bottom-0 z-50
        border-t border-black/10
        bg-white/90 backdrop-blur
      "
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)" }}
    >
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-3">
        {/* 左：残り時間 */}
        <div className="min-w-0">
          <div className="text-xs sm:text-sm text-black/60">残り時間</div>

          <div className="flex items-baseline gap-3">
            <div
              className={[
                "font-extrabold tabular-nums",
                "text-2xl sm:text-3xl",
                isTimeUp ? "text-red-600" : "text-black",
              ].join(" ")}
            >
              {remainingLabel}
            </div>

            <div className="text-xs sm:text-sm text-black/50 tabular-nums">
              経過 {elapsedLabel}
            </div>

            {/* ✅ 追加済みバッジ */}
            {showBadgeNow ? (
              <span className="ml-1 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                追加しました
              </span>
            ) : null}
          </div>

          {isTimeUp ? (
            <div className="text-xs sm:text-sm text-red-600 mt-1">
              時間になりました
            </div>
          ) : running ? (
            <div className="text-xs sm:text-sm text-green-700 mt-1">
              ● 計測中
            </div>
          ) : (
            <div className="text-xs sm:text-sm text-black/50 mt-1">停止中</div>
          )}
        </div>

        {/* 右：ボタン群 */}
        <div className="flex items-center gap-2 shrink-0">
          {rightText ? (
            <div className="hidden sm:block text-sm text-black/60">
              {rightText}
            </div>
          ) : null}

          {showAddButton ? (
            <button
              type="button"
              onClick={handleAdd}
              disabled={!canAdd}
              className={[
                "inline-flex items-center justify-center",
                "h-11 px-4 rounded-2xl border",
                "bg-white shadow-sm",
                "text-base font-semibold",
                "transition",
                "hover:bg-black/5",
                "active:scale-[0.98]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                !canAdd ? "opacity-40 cursor-not-allowed active:scale-100" : "",
              ].join(" ")}
              title="経過時間を今日の学習に加算"
            >
              今日の学習に追加
            </button>
          ) : null}

          <button
            type="button"
            onClick={onToggle}
            className={[
              "inline-flex items-center justify-center",
              "h-11 px-4 rounded-2xl border",
              "bg-white shadow-sm",
              "text-base font-semibold",
              "transition",
              "hover:bg-black/5",
              "active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
              isTimeUp ? "opacity-40 cursor-not-allowed" : "",
            ].join(" ")}
            disabled={isTimeUp || !onToggle}
            title={running ? "停止" : "開始"}
          >
            {running ? "停止" : "開始"}
          </button>
        </div>
      </div>

      {rightText ? (
        <div className="sm:hidden px-4 pb-1 text-xs text-black/60">
          {rightText}
        </div>
      ) : null}
    </div>
  );
}
