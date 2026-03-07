// app/quiz/kokugo/2023/page.tsx

import { KokugoExamClient } from "@/components/quiz/kokugo/KokugoExamClient";
import type { KokugoPassage, RawKokugoQuestion, ExamStats } from "@/lib/kokugo";
import { buildKokugoExam2023 } from "@/lib/kokugo";

import passagesJson from "@/data/questions/kokugo/2023/passages.json";
import questionsJson from "@/data/questions/kokugo/2023/questions.json";

export default function Page() {
  const passages = passagesJson as unknown as KokugoPassage[];
  const questions = questionsJson as unknown as RawKokugoQuestion[];

  const stats: ExamStats | undefined = undefined;

  const exam = buildKokugoExam2023({ passages, questions, stats });

  return <KokugoExamClient exam={exam} />;
}
