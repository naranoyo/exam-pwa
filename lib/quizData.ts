// src/lib/quizData.ts
import passages from "@/data/questions/kokugo/2025/passages.json";

export type Passage = {
  id: string;
  title: string;
  pdfPage?: number;
  text: string;
};

export function getPassageById(passageId: string): Passage | null {
  return (passages as Passage[]).find((p) => p.id === passageId) ?? null;
}
