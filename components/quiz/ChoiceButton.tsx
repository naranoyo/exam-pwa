// components/quiz/ChoiceButton.tsx
"use client";

import type { MouseEvent } from "react";

type Props = {
  label: string;
  disabled?: boolean;
  selected?: boolean;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;

  /** 外から見た目を上書き */
  className?: string;

  /** 採点表示用（必要な画面だけ使う） */
  correct?: boolean | null;
  showResultState?: boolean;
};

export function ChoiceButton({
  label,
  disabled = false,
  selected = false,
  onClick,
  className,
  correct = null,
  showResultState = false,
}: Props) {
  const isCorrectSelected = showResultState && selected && correct === true;
  const isWrongSelected = showResultState && selected && correct === false;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={[
        // base
        "w-full rounded-2xl border px-4 py-3 text-left transition",
        "flex items-center justify-between gap-3",

        // normal state
        selected
          ? "border-black bg-black/5 shadow-sm"
          : "border-black/10 bg-white hover:bg-black/5",

        // result state
        isCorrectSelected ? "border-emerald-500 bg-emerald-50" : "",
        isWrongSelected ? "border-rose-500 bg-rose-50" : "",

        // disabled
        disabled ? "cursor-not-allowed opacity-60 hover:bg-white" : "",

        // external override
        className ?? "",
      ].join(" ")}
    >
      <span className="block flex-1 text-base leading-relaxed">{label}</span>

      <span className="shrink-0">
        {selected ? (
          <span
            className={[
              "flex h-8 w-8 items-center justify-center rounded-full border text-sm font-bold",
              isCorrectSelected
                ? "border-emerald-600 bg-emerald-600 text-white"
                : isWrongSelected
                  ? "border-rose-600 bg-rose-600 text-white"
                  : "border-blue-600 bg-blue-600 text-white",
            ].join(" ")}
            aria-hidden="true"
          >
            ✓
          </span>
        ) : (
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full border border-black/15 bg-white text-transparent"
            aria-hidden="true"
          >
            ✓
          </span>
        )}
      </span>
    </button>
  );
}
