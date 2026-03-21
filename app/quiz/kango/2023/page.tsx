// app/quiz/kango/2023/page.tsx
import Link from "next/link";
import { KangoExamClient } from "@/components/quiz/kango/KangoExamClient";
import type { KangoExam } from "@/lib/kango";
import type { ExamSession } from "@/lib/examTypes";

import amQuestions from "@/data/questions/kango/2023/am/questions.json";
import pmQuestions from "@/data/questions/kango/2023/pm/questions.json";
import amMeta from "@/data/questions/kango/2023/am/meta.json";
import pmMeta from "@/data/questions/kango/2023/pm/meta.json";

function toExamSession(value: unknown): ExamSession | undefined {
  return value === "am" || value === "pm" ? value : undefined;
}

type PageProps = {
  searchParams?: Promise<{
    session?: string;
  }>;
};

export default async function Kango2023Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const session: ExamSession = params?.session === "pm" ? "pm" : "am";

  const selectedMeta = session === "pm" ? pmMeta : amMeta;
  const selectedQuestions = session === "pm" ? pmQuestions : amQuestions;

  const exam: KangoExam = {
    meta: {
      id: selectedMeta.id,
      title: selectedMeta.title,
      subject: "kango",
      examYear: selectedMeta.examYear,
      session: toExamSession(selectedMeta.session),
      questionPdf: selectedMeta.questionPdf,
      answerPdf: selectedMeta.answerPdf,
      durationMinutes: selectedMeta.durationMinutes ?? 160,
    },
    questions: selectedQuestions as KangoExam["questions"],
  };

  return (
    <main className="mx-auto w-full max-w-400 px-4 py-4">
      <div className="mb-4 rounded-2xl border border-black/10 bg-white p-3 shadow-sm">
        <div className="mb-2 text-sm font-semibold text-black/70">
          看護師国家試験 2023
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/quiz/kango/2023?session=am"
            className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition ${
              session === "am"
                ? "bg-sky-600 text-white shadow"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            午前
          </Link>

          <Link
            href="/quiz/kango/2023?session=pm"
            className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition ${
              session === "pm"
                ? "bg-sky-600 text-white shadow"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            午後
          </Link>
        </div>
      </div>

      <KangoExamClient exam={exam} />
    </main>
  );
}
