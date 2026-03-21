// components/quiz/PdfViewer.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import type { RenderTask } from "pdfjs-dist";

type Props = {
  src?: string;
  url?: string;
  page: number;
  height?: number;
  showControls?: boolean;
  onPageChange?: (page: number) => void;
};

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

export function PdfViewer({
  src,
  url,
  page,
  height = 420,
  showControls = false,
  onPageChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const [numPages, setNumPages] = useState<number>(0);

  const pdfUrl = useMemo(() => src ?? url ?? "", [src, url]);

  useEffect(() => {
    let renderTask: RenderTask | null = null;
    let cancelled = false;

    async function render() {
      if (!pdfUrl) return;

      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;

      const loadingTask = pdfjsLib.getDocument({
        url: pdfUrl,
        cMapUrl: "/pdfjs/cmaps/",
        cMapPacked: true,
        standardFontDataUrl: "/pdfjs/standard_fonts/",
      });

      try {
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        setNumPages(pdf.numPages);

        const safePage = Math.min(Math.max(page, 1), pdf.numPages);
        const pdfPage = await pdf.getPage(safePage);
        if (cancelled) return;

        const baseViewport = pdfPage.getViewport({ scale: 1 });

        const containerWidth = wrap.clientWidth || baseViewport.width;
        const fitScale = containerWidth / baseViewport.width;

        // ぼやけ対策：devicePixelRatio 分だけ高解像度で描画
        const dpr =
          typeof window !== "undefined"
            ? Math.max(window.devicePixelRatio || 1, 1)
            : 1;

        const cssViewport = pdfPage.getViewport({ scale: fitScale });
        const renderViewport = pdfPage.getViewport({ scale: fitScale * dpr });

        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.width = Math.floor(renderViewport.width);
        canvas.height = Math.floor(renderViewport.height);
        canvas.style.width = `${Math.floor(cssViewport.width)}px`;
        canvas.style.height = `${Math.floor(cssViewport.height)}px`;

        context.setTransform(1, 0, 0, 1, 0, 0);
        context.imageSmoothingEnabled = true;

        const task = pdfPage.render({
          canvasContext: context,
          viewport: renderViewport,
        });

        renderTask = task;
        await task.promise;
      } catch (error) {
        if (!cancelled) {
          console.error("PDF render error:", error);
        }
      }
    }

    render();

    return () => {
      cancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [pdfUrl, page]);

  function goPrev() {
    if (!onPageChange) return;
    onPageChange(Math.max(1, page - 1));
  }

  function goNext() {
    if (!onPageChange) return;
    onPageChange(numPages > 0 ? Math.min(numPages, page + 1) : page + 1);
  }

  return (
    <div className="w-full">
      {showControls && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <button
            onClick={goPrev}
            disabled={page <= 1}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium hover:bg-black/3 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← 前へ
          </button>

          <div className="text-sm text-black/60">
            {numPages > 0 ? `${page} / ${numPages}` : `${page}`}
          </div>

          <button
            onClick={goNext}
            disabled={numPages > 0 && page >= numPages}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium hover:bg-black/3 disabled:cursor-not-allowed disabled:opacity-40"
          >
            次へ →
          </button>
        </div>
      )}

      <div
        ref={wrapRef}
        className="w-full overflow-auto rounded-2xl bg-neutral-100 p-2"
        style={{ minHeight: height }}
      >
        <div className="flex justify-center">
          <canvas ref={canvasRef} className="max-w-none" />
        </div>
      </div>
    </div>
  );
}
