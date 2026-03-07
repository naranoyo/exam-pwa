"use client";

import type { MouseEvent } from "react";

type Props = {
  label: string;
  disabled?: boolean;
  selected?: boolean;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;

  /** ✅ 追加：外から見た目を上書きできる */
  className?: string;
};

export function ChoiceButton({
  label,
  disabled = false,
  selected = false,
  onClick,
  className,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        // base
        "w-full rounded-2xl border px-4 py-3 text-left transition",
        "bg-white hover:bg-black/5",

        // state
        selected ? "border-black bg-black/5" : "border-black/10",
        disabled ? "opacity-60 cursor-not-allowed hover:bg-white" : "",

        // external override
        className ?? "",
      ].join(" ")}
    >
      <span className="block text-base leading-relaxed">{label}</span>
    </button>
  );
}
