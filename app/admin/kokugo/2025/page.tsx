// app/admin/kokugo/2025/page.tsx
import passagesJson from "@/data/questions/kokugo/2025/passages.json";
import questionsJson from "@/data/questions/kokugo/2025/questions.json";

import type { KokugoPassage, KokugoQuestion } from "@/lib/kokugo";
import { Kokugo2025EditorClient } from "@/components/admin/kokugo/Kokugo2025EditorClient";

export default function Page() {
  const passages = passagesJson as unknown as KokugoPassage[];
  const questions = questionsJson as unknown as KokugoQuestion[];

  return (
    <main className="p-4 md:p-6">
      <Kokugo2025EditorClient
        initialPassages={passages}
        initialQuestions={questions}
      />
    </main>
  );
}
