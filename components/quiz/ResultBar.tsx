"use client";

export function ResultBar({
  correct,
  total,
}: {
  correct: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  return (
    <div className="rounded-xl bg-black/5 p-3">
      <div className="flex items-end justify-between">
        <div className="text-xs text-black/60">正答率</div>
        <div className="text-lg font-bold">{pct}%</div>
      </div>
      <div className="mt-1 text-xs text-black/60">
        {correct} / {total}
      </div>
    </div>
  );
}
