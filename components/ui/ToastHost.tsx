// components/ui/ToastHost.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast, type ToastItem } from "@/lib/toast";

export type ToastPlacement = "bottom-right" | "top-right" | "top-center";

function ToastCard({
  item,
  onDone,
  placement,
  durationMs,
}: {
  item: ToastItem;
  onDone: (id: string) => void;
  placement: ToastPlacement;
  durationMs: number;
}) {
  const [open, setOpen] = useState(false);

  // 表示位置によって「入ってくる向き」を変える
  const enterExitClass = useMemo(() => {
    // bottom-right / top-right は右からスライド
    if (placement === "bottom-right" || placement === "top-right") {
      return open ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6";
    }
    // top-center は上から落ちる感じ
    return open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2";
  }, [open, placement]);

  useEffect(() => {
    const animMs = 300;

    const t1 = window.setTimeout(() => setOpen(true), 10);
    const t2 = window.setTimeout(() => setOpen(false), Math.max(0, durationMs));
    const t3 = window.setTimeout(
      () => onDone(item.id),
      Math.max(0, durationMs + animMs)
    );

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [item.id, onDone, durationMs]);

  const closeNow = () => {
    const animMs = 300;
    setOpen(false);
    window.setTimeout(() => onDone(item.id), animMs);
  };

  return (
    <div
      className={[
        "pointer-events-auto",
        "rounded-xl border border-emerald-200 bg-emerald-50 shadow-lg",
        "px-4 py-3",
        "text-sm font-semibold text-black/90",
        "transition-all duration-300 ease-out will-change-transform",
        enterExitClass,
      ].join(" ")}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 wrap-break-word">{item.message}</div>

        <button
          type="button"
          onClick={closeNow}
          className="shrink-0 text-xs border rounded px-2 py-0.5 hover:bg-black/5"
          aria-label="close toast"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function ToastHost({
  placement = "bottom-right",
  durationMs = 4000, // ✅ デフォルトを長め（4秒）に
}: {
  placement?: ToastPlacement;
  durationMs?: number;
}) {
  const { toasts, removeToast } = useToast();

  const containerClass = useMemo(() => {
    if (placement === "bottom-right") {
      return "fixed bottom-[calc(env(safe-area-inset-bottom)+16px)] right-4";
    }
    if (placement === "top-right") {
      return "fixed top-[calc(env(safe-area-inset-top)+16px)] right-4";
    }
    // top-center
    return "fixed top-[calc(env(safe-area-inset-top)+16px)] left-1/2 -translate-x-1/2";
  }, [placement]);

  return (
    <div
      className={[
        containerClass,
        "z-50 space-y-2 pointer-events-none",
        placement === "top-center" ? "w-[min(28rem,calc(100vw-2rem))]" : "",
      ].join(" ")}
    >
      {toasts.map((t) => (
        <ToastCard
          key={t.id}
          item={t}
          onDone={removeToast}
          placement={placement}
          durationMs={durationMs}
        />
      ))}
    </div>
  );
}
