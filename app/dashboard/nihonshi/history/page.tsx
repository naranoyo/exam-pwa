// app/dashboard/nihonshi/history/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteAllNihonshiHistory,
  deleteNihonshiHistory,
  loadNihonshiHistory,
  type NihonshiHistoryEntry,
} from "@/lib/nihonshiHistory";

type YearFilter = "all" | 2025 | 2024 | 2023;

export default function NihonshiHistoryPage() {
  const router = useRouter();

  const [items, setItems] = useState<NihonshiHistoryEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [yearFilter, setYearFilter] = useState<YearFilter>("all");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setItems(loadNihonshiHistory());
      setIsLoaded(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    if (yearFilter === "all") return items;
    return items.filter((item) => item.year === yearFilter);
  }, [items, yearFilter]);

  const handleDelete = (id: string) => {
    if (!window.confirm("この採点履歴を削除しますか？")) return;

    deleteNihonshiHistory(id);
    setItems((prev) => prev.filter((item) => item.id !== id));

    window.alert("削除しました");
  };

  const handleDeleteAll = () => {
    if (!window.confirm("日本史の採点履歴をすべて削除しますか？")) return;

    deleteAllNihonshiHistory();
    setItems([]);

    window.alert("すべて削除しました");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">日本史 採点履歴</h1>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border bg-white px-3 py-2 hover:bg-black/5"
          >
            ← 前に戻る
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-xl border bg-white px-3 py-2 hover:bg-black/5"
          >
            ダッシュボードに戻る
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <YearButton
          active={yearFilter === "all"}
          onClick={() => setYearFilter("all")}
        >
          すべて
        </YearButton>

        <YearButton
          active={yearFilter === 2025}
          onClick={() => setYearFilter(2025)}
        >
          2025
        </YearButton>

        <YearButton
          active={yearFilter === 2024}
          onClick={() => setYearFilter(2024)}
        >
          2024
        </YearButton>

        <YearButton
          active={yearFilter === 2023}
          onClick={() => setYearFilter(2023)}
        >
          2023
        </YearButton>

        <button
          type="button"
          onClick={handleDeleteAll}
          className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 font-semibold text-red-600 hover:bg-red-100"
        >
          🗑 全履歴削除
        </button>
      </div>

      {!isLoaded ? null : filtered.length === 0 ? (
        <div className="text-sm text-black/60">履歴がありません</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="cursor-pointer rounded-2xl border bg-white p-4 hover:bg-black/5"
              onClick={() =>
                router.push(`/dashboard/nihonshi/history/${item.id}`)
              }
            >
              <div className="font-semibold">{item.examTitle}</div>

              <div className="text-sm text-black/60">
                {new Date(item.createdAt).toLocaleString()}
              </div>

              <div className="mt-1 text-lg font-bold">
                {item.total} / {item.maxTotal}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(item.id);
                }}
                className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-100"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type YearButtonProps = {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

function YearButton({ active, onClick, children }: YearButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 ${
        active ? "bg-black text-white" : "bg-white"
      }`}
    >
      {children}
    </button>
  );
}
