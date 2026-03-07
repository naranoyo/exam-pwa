// app/pdf/page.tsx
import { Suspense } from "react";
import PdfPageClient from "./PdfPageClient";

export default function PdfPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-xl p-4">
          <section className="rounded-2xl bg-white/80 shadow-sm p-4 border border-black/5">
            <div className="text-base font-bold">PDFを読み込み中…</div>
            <div className="mt-2 text-sm text-black/70">少し待ってください</div>
          </section>
        </main>
      }
    >
      <PdfPageClient />
    </Suspense>
  );
}
