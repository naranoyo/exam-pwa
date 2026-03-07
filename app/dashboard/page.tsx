// app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { formatJPFullDateTime, getDateKey } from "@/lib/date";
import { clearStorage } from "@/lib/storage";
import { useApp } from "@/lib/state";

import { WishesCard } from "@/components/dashboard/WishesCard";
import { DaysLeftCard } from "@/components/dashboard/DaysLeftCard";
import { TodoCard } from "@/components/dashboard/TodoCard";
import { StudyCard } from "@/components/dashboard/StudyCard";

export default function DashboardPage() {
  const { state, dispatch } = useApp();

  const todayKey = useMemo(() => getDateKey(), []);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  const todayTodo = state.todosByDate?.[todayKey] ?? {
    dateKey: todayKey,
    items: [],
  };

  const todayStudy = state.studyByDate?.[todayKey] ?? {
    dateKey: todayKey,
    totalSeconds: 0,
    sessions: 0,
  };

  return (
    <main
      className="
        bg-[#FFFBEEDB]
        min-h-screen
        overflow-y-auto
        pt-[calc(env(safe-area-inset-top)+12px)]
        pb-[calc(env(safe-area-inset-bottom)+12px)]
      "
      style={{
        paddingTop: "calc(constant(safe-area-inset-top) + 12px)",
        paddingBottom: "calc(constant(safe-area-inset-bottom) + 12px)",
      }}
    >
      <div className="mx-auto max-w-md px-4 pb-5 space-y-4">
        <header className="flex items-end justify-between">
          <div>
            <div className="text-xl font-bold">ダッシュボード</div>
            <div className="text-sm text-black/60">
              {formatJPFullDateTime(now)}
            </div>
          </div>
          <div className="text-[11px] text-black/45">exam-pwa</div>
        </header>

        <WishesCard
          wishes={state.wishes}
          currentHensachi={state.currentHensachi}
          examDates={state.examDates}
          daysLeftSelection={state.daysLeftSelection}
          onChangeWish={(wishId, patch) =>
            dispatch({ type: "SET_WISH_PROFILE", wishId, patch })
          }
          onChangeCurrentHensachi={(value) =>
            dispatch({ type: "SET_CURRENT_HENSACHI", value })
          }
        />

        <DaysLeftCard
          examDates={state.examDates}
          goals={state.goals}
          selected={state.daysLeftSelection}
          onChangeSelected={(next) =>
            dispatch({ type: "SET_DAYSLEFT_SELECTION", value: next })
          }
        />

        <TodoCard
          day={todayTodo}
          onAdd={(title) =>
            dispatch({ type: "ADD_TODO", dateKey: todayKey, title })
          }
          onToggle={(id) =>
            dispatch({ type: "TOGGLE_TODO", dateKey: todayKey, id })
          }
          onDelete={(id) =>
            dispatch({ type: "DELETE_TODO", dateKey: todayKey, id })
          }
        />

        <StudyCard
          summary={todayStudy}
          onStartTimer={() => {
            dispatch({
              type: "ADD_STUDY_SECONDS",
              dateKey: todayKey,
              seconds: 25 * 60,
              sessionsDelta: 1,
            });
          }}
        />

        <footer className="py-4 space-y-3 text-center text-[11px] text-black/40">
          <button
            type="button"
            className="rounded-lg border border-black/15 px-3 py-1 text-xs hover:bg-black/5"
            onClick={async () => {
              const ok = window.confirm(
                "保存データ（IndexedDB / LocalStorage）をすべて初期化します。よろしいですか？"
              );
              if (!ok) return;
              await clearStorage();
              window.location.reload();
            }}
          >
            データを初期化する
          </button>

          <div>PWA / iPhone専用（IndexedDB保存）</div>
        </footer>
      </div>
    </main>
  );
}
