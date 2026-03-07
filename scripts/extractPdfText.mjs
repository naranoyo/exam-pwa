// scripts/extractPdfText.mjs
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// pdfjs (legacy 推奨: Nodeで安定)
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const ROOT = process.cwd();

// 入力PDF（必要ならここを変える）
const PDF_PATH = path.join(ROOT, "public", "past", "kyotsu-kokugo-2025-q.pdf");

// 出力先
const OUT_PATH = path.join(
  ROOT,
  "data",
  "questions",
  "kokugo",
  "2025",
  "raw_pages_q.json"
);

// CMap / 標準フォント（ここが超重要）
const CMAP_DIR = path.join(ROOT, "public", "pdfjs", "cmaps");
const FONT_DIR = path.join(ROOT, "public", "pdfjs", "standard_fonts");

function ensureExists(p) {
  if (!fs.existsSync(p)) {
    throw new Error(
      `Not found: ${p}\n→ public/pdfjs/cmaps と public/pdfjs/standard_fonts を用意してね`
    );
  }
}

async function main() {
  ensureExists(PDF_PATH);
  ensureExists(CMAP_DIR);
  ensureExists(FONT_DIR);

  const data = new Uint8Array(fs.readFileSync(PDF_PATH));

  const loadingTask = pdfjs.getDocument({
    data,

    // ✅ 日本語抽出に必須
    cMapUrl: pathToFileURL(CMAP_DIR + path.sep).href,
    cMapPacked: true,

    // ✅ フォントが無いPDFでも文字化けしにくい
    standardFontDataUrl: pathToFileURL(FONT_DIR + path.sep).href,
  });

  const doc = await loadingTask.promise;
  const numPages = doc.numPages;

  const pages = [];
  let withText = 0;

  for (let pageNo = 1; pageNo <= numPages; pageNo++) {
    const page = await doc.getPage(pageNo);
    const content = await page.getTextContent();

    const text = content.items
      .map((it) => (typeof it.str === "string" ? it.str : ""))
      .join("")
      .replace(/\s+\n/g, "\n")
      .trim();

    if (text) withText++;

    pages.push({ page: pageNo, text });

    if (pageNo % 5 === 0) console.log(`... ${pageNo}/${numPages}`);
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(pages, null, 2) + "\n", "utf-8");

  console.log(`✅ wrote: ${OUT_PATH}`);
  console.log(`pages with text: ${withText}/${numPages}`);
}

main().catch((e) => {
  console.error("❌ extract failed:", e);
  process.exit(1);
});
