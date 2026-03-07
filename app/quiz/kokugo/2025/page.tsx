// app/quiz/kokugo/2025/page.tsx
import passagesJson from "@/data/questions/kokugo/2025/passages.json";
import questionsJson from "@/data/questions/kokugo/2025/questions.json";

import {
  buildKokugoExam2025,
  type KokugoPassage,
  type RawKokugoQuestion, // ✅ 追加
} from "@/lib/kokugo";

import { KokugoExamClient } from "@/components/quiz/kokugo/KokugoExamClient";

export default function Page() {
  const passages = passagesJson as unknown as KokugoPassage[];
  const questions = questionsJson as unknown as RawKokugoQuestion[]; // ✅ OK

  const exam = buildKokugoExam2025({ passages, questions });

  return (
    <main className="min-h-dvh p-4 md:p-6 pb-36">
      <KokugoExamClient exam={exam} />
    </main>
  );
}
