// app/quiz/kokugo/2024/page.tsx

import { KokugoExamClient } from "@/components/quiz/kokugo/KokugoExamClient";
import type { KokugoPassage, RawKokugoQuestion, ExamStats } from "@/lib/kokugo";
import { buildKokugoExam2024 } from "@/lib/kokugo";

// ✅ JSON import（Next.js App Router でOK）
import passagesJson from "@/data/questions/kokugo/2024/passages.json";
import questionsJson from "@/data/questions/kokugo/2024/questions.json";

export default function Page() {
  const passages = passagesJson as unknown as KokugoPassage[];
  const questions = questionsJson as unknown as RawKokugoQuestion[];

  // （任意）統計を後で入れる用。今は無しでOK
  const stats: ExamStats | undefined = undefined;

  const exam = buildKokugoExam2024({ passages, questions, stats });

  return <KokugoExamClient exam={exam} />;
}
