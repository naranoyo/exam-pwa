import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const pagesFile = path.resolve(
  root,
  "data/questions/kokugo/2025/raw_pages_q.json"
);
const passagesIn = path.resolve(
  root,
  "data/questions/kokugo/2025/passages.json"
);
const passagesOut = path.resolve(
  root,
  "data/questions/kokugo/2025/passages.generated.json"
);

function normalizeText(s) {
  return (s ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// “段落っぽく”分割（まずは安全寄り）
function toBlocks(text) {
  const t = normalizeText(text);
  if (!t) return [{ kind: "paragraph", text: "" }];

  const parts = t
    .split(/\n\s*\n/)
    .map((x) => x.trim())
    .filter(Boolean);

  return parts.map((p) => ({
    kind: "paragraph",
    text: p,
  }));
}

const pages = JSON.parse(fs.readFileSync(pagesFile, "utf8"));
const pagesMap = new Map(pages.map((x) => [x.page, x.text]));

const passages = JSON.parse(fs.readFileSync(passagesIn, "utf8"));

for (const p of passages) {
  const start = p?.pdf?.q?.start;
  const end = p?.pdf?.q?.end;

  if (typeof start === "number" && typeof end === "number" && start <= end) {
    const joined = [];
    for (let i = start; i <= end; i++) {
      joined.push(pagesMap.get(i) ?? "");
    }
    const merged = normalizeText(joined.join("\n\n"));
    p.blocks = toBlocks(merged);
  } else {
    // 範囲が無ければ blocks はそのまま
    p.blocks = p.blocks ?? [];
  }
}

fs.writeFileSync(passagesOut, JSON.stringify(passages, null, 2) + "\n", "utf8");
console.log("✅ wrote:", passagesOut);
