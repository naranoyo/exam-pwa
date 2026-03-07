import fs from "node:fs";
import path from "node:path";

const SLOT_PLAN_2025 = {
  // 第1問
  "1-1": 5,
  "1-2": 1,
  "1-3": 1,
  "1-4": 1,
  "1-5": 1,
  "1-6": 1,

  // 第2問
  "2-1": 1,
  "2-2": 1,
  "2-3": 1,
  "2-4": 1,
  "2-5": 1,
  "2-6": 1,
  "2-7": 1,

  // 第3問
  "3-1": 1,
  "3-2": 1,
  "3-3": 3,

  // 第4問
  "4-1": 3,
  "4-2": 1,
  "4-3": 3,

  // 第5問
  "5-1": 3,
  "5-2": 1,
  "5-3": 1,
  "5-4": 1,
  "5-5": 2,
  "5-6": 1,
};

const file = path.resolve(
  process.cwd(),
  "data/questions/kokugo/2025/questions.json"
);

const questions = JSON.parse(fs.readFileSync(file, "utf8"));

for (const q of questions) {
  const key = `${q.dai}-${q.no}`;
  const slots = SLOT_PLAN_2025[key] ?? 1;
  q.slots = slots;
}

fs.writeFileSync(file, JSON.stringify(questions, null, 2) + "\n", "utf8");
console.log("✅ slots added:", file);
