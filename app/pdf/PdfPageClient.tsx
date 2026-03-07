// app/pdf/PdfPageClient.tsx
"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PdfViewer } from "@/components/quiz/PdfViewer";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// ✅ 安全のため、開けるPDFを /past 配下に限定
function isAllowedPdfPath(path: string) {
  return path.startsWith("/past/");
}

export default function PdfPageClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const srcRaw = sp.get("src") ?? "";
  const pageRaw = sp.get("page") ?? "0";
  const label = sp.get("label") ?? "本文（PDF）";
  const heightRaw = sp.get("h") ?? "640";

  const src = useMemo(() => decodeURIComponent(srcRaw), [srcRaw]);
  const initialPage = clamp(Number(pageRaw) || 0, 0, 9999);
  const height = clamp(Number(heightRaw) || 640, 360, 1200);

  if (!src || !isAllowedPdfPath(src)) {
    return (
      <main className="mx-auto max-w-xl p-4">
        <section className="rounded-2xl bg-white/80 shadow-sm p-4 border border-black/5">
          <div className="text-base font-bold">PDFを開けません</div>
          <div className="mt-2 text-sm text-black/70">
            不正なURLです。/past 配下のPDFのみ開ける設定になっています。
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-4 w-full rounded-xl bg-black px-3 py-3 text-sm font-semibold text-white active:scale-[0.99]"
          >
            戻る
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl p-4 space-y-3">
      <header className="rounded-2xl bg-white/80 shadow-sm p-4 border border-black/5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-black/70">{label}</div>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-xs font-semibold text-black/70 hover:bg-white active:scale-[0.99]"
          >
            ← 戻る
          </button>
        </div>
      </header>

      <section className="rounded-2xl bg-white/80 shadow-sm p-4 border border-black/5">
        <PdfViewer
          url={src}
          page={initialPage}
          height={height}
          showControls
          onPageChange={() => {
            // 必要ならここでURLにページ反映
          }}
        />
      </section>

      <footer className="text-[11px] text-black/45">
        ※ アプリ内で開いているので、必ず「戻る」で元の画面に戻れます
      </footer>
    </main>
  );
}
