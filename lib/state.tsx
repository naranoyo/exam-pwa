// lib/state.ts
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from "react";

import type { QuizResult } from "@/lib/quiz";
import { EXAM_TYPES, type ExamTypeId } from "@/lib/exams";
import { loadFromStorage, saveToStorage } from "@/lib/storage";

/* ================================
   型定義（Dashboardで使う）
================================ */

/**
 * ✅ StudyCard が使ってる形に合わせる
 * （合計秒 / 今日やった科目数（=セッション数））
 */
export type StudySummary = {
  dateKey: string;
  totalSeconds: number;
  sessions: number;
};

/** 志望（大学/英検など） */
export type ExamProfile = {
  university: string;
  faculty: string;
  department: string;
};

export type Wish = {
  id: 1 | 2 | 3;
  profile: ExamProfile;
};

/** Goals（DaysLeftCard が参照） */
export type GoalValue = string | string[] | undefined;
export type Goals = Record<string, GoalValue>;

/** 試験日（dateKey -> ISO文字列） */
export type ExamDatesState = Record<string, string>;

/** DaysLeftCard の左右選択 */
export type DaysLeftSelection = { left: ExamTypeId; right: ExamTypeId };

/** TODO */
export type TodoItem = {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
};
export type TodoDay = { dateKey: string; items: TodoItem[] };

export type DailyTodo = TodoDay;

export type TodosByDate = Record<string, TodoDay>;

/** 勉強（科目別内訳も持つ） */
export type StudySubjectStat = {
  seconds: number;
  sessions: number;
};

export type StudyDay = {
  dateKey: string;
  totalSeconds: number;

  /** その日の「学習セッション数」(あなたのUIでは “今日やった科目数” 表示に利用) */
  sessions: number;

  /** ✅ 例: "japanese/kokugo/kokugo-2024" -> {seconds,sessions} */
  bySubject: Record<string, StudySubjectStat>;
};

export type StudyLogEntry = StudyDay;

export type StudyByDate = Record<string, StudyDay>;

/** 国語 本番（採点履歴） */
export type KokugoAttemptDetail = {
  answerNo: number;
  dai: number;
  no: number;
  qid: string;

  chosen: number | null;
  correctChoice: number;
  got: number;
  max: number;

  prompt?: string;
  choices?: string[];
  explanation?: string;
};

export type KokugoAttempt = {
  id: string;
  createdAt: number;
  dateKey: string;

  examId: string;
  examTitle: string;

  total: number;
  maxTotal: number;
  correctCount: number;
  answeredCount: number;

  mean?: number;
  sd?: number;
  examinees?: number;

  details: KokugoAttemptDetail[];
};

/* ================================
   AppState
================================ */

export type AppState = {
  // 練習クイズ（英単語/漢字など）
  quizResults: QuizResult[];

  // 国語 本番（採点履歴）
  kokugoAttempts: KokugoAttempt[];

  // ダッシュボード
  wishes: Wish[];
  currentHensachi: number | null;

  examDates: ExamDatesState;
  daysLeftSelection: DaysLeftSelection;

  goals: Goals;

  // todo / study
  todosByDate: TodosByDate;
  studyByDate: StudyByDate;
};

/* ================================
   Action（DashboardPageのdispatch名に合わせる）
================================ */

export type Action =
  // Quiz
  | { type: "QUIZ_ADD_RESULT"; payload: QuizResult }

  // Wishes
  | { type: "SET_WISH_PROFILE"; wishId: 1 | 2 | 3; patch: Partial<ExamProfile> }
  | { type: "SET_CURRENT_HENSACHI"; value: number | null }

  // Exam dates / selection
  | { type: "EXAM_DATE_SET"; dateKey: string; iso: string }
  | {
      type: "SET_DAYSLEFT_SELECTION";
      value: { left: ExamTypeId; right: ExamTypeId };
    }

  // Goals
  | { type: "GOAL_SET"; key: string; value: GoalValue }

  // Study
  | {
      type: "ADD_STUDY_SECONDS";
      dateKey: string;
      seconds: number;
      sessionsDelta?: number;

      /** ✅ 追加：科目内訳キー（任意） */
      subjectKey?: string;
    }

  // Todo
  | { type: "ADD_TODO"; dateKey: string; title: string }
  | { type: "TOGGLE_TODO"; dateKey: string; id: string }
  | { type: "DELETE_TODO"; dateKey: string; id: string }

  // Kokugo
  | { type: "KOKUGO_ATTEMPT_ADD"; payload: KokugoAttempt }
  | { type: "KOKUGO_ATTEMPT_CLEAR" }

  // Persist
  | { type: "HYDRATE"; payload: Partial<AppState> }
  | { type: "RESET_ALL" };

/* ================================
   util
================================ */

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeDefaultDaysLeftSelection(): DaysLeftSelection {
  const ids = Object.keys(EXAM_TYPES) as ExamTypeId[];
  const left = ids[0] ?? ("center-2026" as ExamTypeId);
  const right = ids[1] ?? left;
  return { left, right };
}

/* ================================
   初期状態
================================ */

function createInitialState(): AppState {
  return {
    quizResults: [],
    kokugoAttempts: [],

    wishes: [
      { id: 1, profile: { university: "", faculty: "", department: "" } },
      { id: 2, profile: { university: "", faculty: "", department: "" } },
      { id: 3, profile: { university: "", faculty: "", department: "" } },
    ],
    currentHensachi: null,

    examDates: {},
    daysLeftSelection: safeDefaultDaysLeftSelection(),

    goals: {},

    todosByDate: {},
    studyByDate: {},
  };
}

/* ================================
   merge（HYDRATE用）
================================ */

function mergeState(base: AppState, patch: Partial<AppState>): AppState {
  return {
    ...base,
    ...patch,

    examDates: { ...base.examDates, ...(patch.examDates ?? {}) },
    goals: { ...base.goals, ...(patch.goals ?? {}) },
    todosByDate: { ...base.todosByDate, ...(patch.todosByDate ?? {}) },
    studyByDate: { ...base.studyByDate, ...(patch.studyByDate ?? {}) },

    quizResults: patch.quizResults ?? base.quizResults,
    kokugoAttempts: patch.kokugoAttempts ?? base.kokugoAttempts,
    wishes: patch.wishes ?? base.wishes,

    daysLeftSelection: (() => {
      const next = patch.daysLeftSelection ?? base.daysLeftSelection;
      const leftOk = !!EXAM_TYPES[next.left];
      const rightOk = !!EXAM_TYPES[next.right];
      if (leftOk && rightOk) return next;
      return safeDefaultDaysLeftSelection();
    })(),
  };
}

/* ================================
   Reducer
================================ */

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "QUIZ_ADD_RESULT":
      return { ...state, quizResults: [action.payload, ...state.quizResults] };

    case "SET_WISH_PROFILE":
      return {
        ...state,
        wishes: state.wishes.map((w) =>
          w.id === action.wishId
            ? { ...w, profile: { ...w.profile, ...action.patch } }
            : w
        ),
      };

    case "SET_CURRENT_HENSACHI":
      return { ...state, currentHensachi: action.value };

    case "EXAM_DATE_SET":
      return {
        ...state,
        examDates: { ...state.examDates, [action.dateKey]: action.iso },
      };

    case "SET_DAYSLEFT_SELECTION": {
      const left = EXAM_TYPES[action.value.left]
        ? action.value.left
        : safeDefaultDaysLeftSelection().left;
      const right = EXAM_TYPES[action.value.right]
        ? action.value.right
        : safeDefaultDaysLeftSelection().right;

      return { ...state, daysLeftSelection: { left, right } };
    }

    case "GOAL_SET":
      return {
        ...state,
        goals: { ...state.goals, [action.key]: action.value },
      };

    case "ADD_STUDY_SECONDS": {
      const prev: StudyDay =
        state.studyByDate[action.dateKey] ??
        ({
          dateKey: action.dateKey,
          totalSeconds: 0,
          sessions: 0,
          bySubject: {},
        } satisfies StudyDay);

      const sessionsDelta = action.sessionsDelta ?? 0;

      // ✅ 科目内訳を更新
      const bySubject = { ...(prev.bySubject ?? {}) };
      if (action.subjectKey) {
        const cur = bySubject[action.subjectKey] ?? { seconds: 0, sessions: 0 };
        bySubject[action.subjectKey] = {
          seconds: cur.seconds + action.seconds,
          sessions: cur.sessions + sessionsDelta,
        };
      }

      const next: StudyDay = {
        dateKey: action.dateKey,
        totalSeconds: prev.totalSeconds + action.seconds,
        sessions: prev.sessions + sessionsDelta,
        bySubject,
      };

      return {
        ...state,
        studyByDate: { ...state.studyByDate, [action.dateKey]: next },
      };
    }

    case "ADD_TODO": {
      const day = state.todosByDate[action.dateKey] ?? {
        dateKey: action.dateKey,
        items: [],
      };
      const next: TodoDay = {
        ...day,
        items: [
          {
            id: uid(),
            title: action.title,
            done: false,
            createdAt: Date.now(),
          },
          ...day.items,
        ],
      };
      return {
        ...state,
        todosByDate: { ...state.todosByDate, [action.dateKey]: next },
      };
    }

    case "TOGGLE_TODO": {
      const day = state.todosByDate[action.dateKey];
      if (!day) return state;
      const next: TodoDay = {
        ...day,
        items: day.items.map((it) =>
          it.id === action.id ? { ...it, done: !it.done } : it
        ),
      };
      return {
        ...state,
        todosByDate: { ...state.todosByDate, [action.dateKey]: next },
      };
    }

    case "DELETE_TODO": {
      const day = state.todosByDate[action.dateKey];
      if (!day) return state;
      const next: TodoDay = {
        ...day,
        items: day.items.filter((it) => it.id !== action.id),
      };
      return {
        ...state,
        todosByDate: { ...state.todosByDate, [action.dateKey]: next },
      };
    }

    case "KOKUGO_ATTEMPT_ADD":
      return {
        ...state,
        kokugoAttempts: [action.payload, ...state.kokugoAttempts],
      };

    case "KOKUGO_ATTEMPT_CLEAR":
      return { ...state, kokugoAttempts: [] };

    case "HYDRATE":
      return mergeState(state, action.payload);

    case "RESET_ALL":
      return createInitialState();

    default:
      return state;
  }
}

/* ================================
   Context + Persist
================================ */

type AppContextType = {
  state: AppState;
  dispatch: React.Dispatch<Action>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  // 起動時Hydrate
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const maybe = await loadFromStorage<Partial<AppState> | undefined>();
        if (cancelled) return;
        if (maybe && typeof maybe === "object") {
          dispatch({ type: "HYDRATE", payload: maybe });
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // 保存
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
