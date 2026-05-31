// app/quiz/nihonshi/2025/page.tsx

import NihonshiExamClient from "@/components/quiz/nihonshi/NihonshiExamClient";

import metaJson from "@/data/questions/nihonshi/2025/meta.json";
import questionsJson from "@/data/questions/nihonshi/2025/questions.json";

type NihonshiMeta = {
  id: string;
  title: string;
  examYear: number;
  subject: string;
  category: string;
  level: string;
  durationMinutes: number;
  totalScore: number;
  questionPdf: string;
  answerPdf?: string;
};

type NihonshiQuestion = {
  id: string;
  examYear: number;
  subject: string;
  category: string;
  level: string;
  dai: number;
  no: number;
  answerNo: number;
  pdfPage: number;
  score: number;
  type: "single" | "multi" | "numeric";
  question: string;
  choices: string[];
  answer: number | number[];
  selectCount?: number;
};

const meta = metaJson as NihonshiMeta;
const questions = questionsJson as NihonshiQuestion[];

export default function Nihonshi2025Page() {
  return <NihonshiExamClient meta={meta} questions={questions} />;
}
