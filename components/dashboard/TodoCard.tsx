// src/components/dashboard/TodoCard.tsx
"use client";

import { useMemo, useState } from "react";
import type { DailyTodo } from "@/lib/state";

export function TodoCard({
  day,
  onAdd,
  onToggle,
  onDelete,
}: {
  day: DailyTodo;
  onAdd: (title: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [text, setText] = useState("");

  const stats = useMemo(() => {
    const total = day.items.length;
    const done = day.items.filter((t) => t.done).length;
    return { total, done };
  }, [day.items]);

  function submit() {
    const v = text.trim();
    if (!v) return;
    onAdd(v);
    setText("");
  }

  return (
    <section className="rounded-2xl bg-white/80 shadow-sm p-4 border border-black/5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold tracking-wide text-black/70">
          今日のToDo
        </div>
        <div className="text-xs text-black/55">
          {stats.done}/{stats.total}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="例：英単語 30分"
          className="flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/25"
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <button
          onClick={submit}
          className="rounded-xl px-3 py-2 text-sm font-semibold bg-black text-white active:scale-[0.99]"
        >
          ＋
        </button>
      </div>

      <ul className="mt-3 space-y-2">
        {day.items.length === 0 && (
          <li className="text-sm text-black/50 py-4 text-center">
            ToDoを追加しよう
          </li>
        )}

        {day.items.map((t) => (
          <li
            key={t.id}
            className="flex items-center gap-2 rounded-xl bg-black/5 p-2"
          >
            <button
              onClick={() => onToggle(t.id)}
              className="h-8 w-8 grid place-items-center rounded-lg bg-white border border-black/10"
              aria-label="toggle todo"
            >
              {t.done ? "✅" : "⬜️"}
            </button>

            <div className="flex-1">
              <div
                className={`text-sm ${
                  t.done ? "line-through text-black/40" : "text-black/80"
                }`}
              >
                {t.title}
              </div>
            </div>

            <button
              onClick={() => onDelete(t.id)}
              className="h-8 w-8 grid place-items-center rounded-lg bg-white border border-black/10 text-black/60"
              aria-label="delete todo"
              title="削除"
            >
              🗑️
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
