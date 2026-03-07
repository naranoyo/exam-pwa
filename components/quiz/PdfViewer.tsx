// components/quiz/PdfViewer.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import type {
  PDFDocumentProxy,
  PDFPageProxy,
} from "pdfjs-dist/types/src/display/api";

type PdfjsLibWithWorker = typeof pdfjsLib & {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: {
    url: string;
    cMapUrl?: string;
    cMapPacked?: boolean;
    standardFontDataUrl?: string;
  }) => { promise: Promise<PDFDocumentProxy> };
};

type PdfRenderTask = { promise: Promise<unknown>; cancel: () => void };

type Props = {
  url: string;
  page: number; // 1-based
  onPageChange?: (page: number) => void;
  className?: string;

  height?: number;
  showControls?: boolean;

  autoScaleByHeight?: boolean;
  minScale?: number;
  maxScale?: number;

  /** ✅ 文字の荒さ改善：高DPI倍率（デフォルト: devicePixelRatio） */
  dpr?: number;
};

const pdf = pdfjsLib as unknown as PdfjsLibWithWorker;
pdf.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

export function PdfViewer({
  url,
  page,
  onPageChange,
  className,
  height = 520,
  showControls = true,
  autoScaleByHeight = true,
  minScale = 0.6,
  maxScale = 3.2,
  dpr,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [internalPage, setInternalPage] = useState(page);

  const renderTaskRef = useRef<PdfRenderTask | null>(null);
  const renderTokenRef = useRef(0);

  // 親からpageが来たら同期
  useEffect(() => setInternalPage(page), [page]);

  // PDFロード
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const loadingTask = pdf.getDocument({
        url,
        cMapUrl: "/pdfjs/cmaps/",
        cMapPacked: true,
        standardFontDataUrl: "/pdfjs/standard_fonts/",
      });

      try {
        const loaded = await loadingTask.promise;
        if (cancelled) return;

        setDoc(loaded);
        setNumPages(loaded.numPages);
      } catch {
        // 読み込み失敗時
        if (cancelled) return;
        setDoc(null);
        setNumPages(0);
      }
    })();

    return () => {
      cancelled = true;

      // トークン更新 + 描画停止
      renderTokenRef.current = renderTokenRef.current + 1;

      const prev = renderTaskRef.current;
      if (prev) {
        try {
          prev.cancel();
        } catch {
          // ignore
        }
        renderTaskRef.current = null;
      }

      setDoc(null);
      setNumPages(0);
    };
  }, [url]);

  const safePage = useMemo(() => {
    if (!numPages) return Math.max(1, internalPage);
    return Math.min(Math.max(1, internalPage), numPages);
  }, [internalPage, numPages]);

  // 描画
  useEffect(() => {
    if (!doc) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // この描画のトークン（古い描画を無効化）
    const myToken = renderTokenRef.current + 1;
    renderTokenRef.current = myToken;

    // 既存レンダーキャンセル
    const prev = renderTaskRef.current;
    if (prev) {
      try {
        prev.cancel();
      } catch {
        // ignore
      }
      renderTaskRef.current = null;
    }

    let cancelled = false;

    (async () => {
      let pageObj: PDFPageProxy;
      try {
        pageObj = await doc.getPage(safePage);
      } catch {
        return;
      }
      if (cancelled) return;
      if (renderTokenRef.current !== myToken) return;

      // scale 決定
      let scale = 1.4;
      if (autoScaleByHeight) {
        const base = pageObj.getViewport({ scale: 1 });
        const byHeight = height / base.height;
        scale = Math.min(maxScale, Math.max(minScale, byHeight));
      }

      const viewport = pageObj.getViewport({ scale });
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // ✅ 高DPI対応
      const deviceDpr =
        typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const useDpr = dpr ?? deviceDpr;

      const cssW = Math.floor(viewport.width);
      const cssH = Math.floor(viewport.height);

      // 実ピクセル確保
      canvas.width = Math.floor(cssW * useDpr);
      canvas.height = Math.floor(cssH * useDpr);

      // 見た目サイズ
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;

      // DPR反映
      ctx.setTransform(useDpr, 0, 0, useDpr, 0, 0);
      ctx.imageSmoothingEnabled = true;

      const renderArgs = {
        canvasContext: ctx,
        canvas,
        viewport,
      } as unknown as Parameters<PDFPageProxy["render"]>[0];

      const task = pageObj.render(renderArgs) as unknown as PdfRenderTask;
      renderTaskRef.current = task;

      try {
        await task.promise;
      } catch {
        // cancel は無視
      } finally {
        if (renderTaskRef.current === task) renderTaskRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [doc, safePage, height, autoScaleByHeight, minScale, maxScale, dpr]);

  // UI操作
  const move = (next: number) => {
    const p = numPages
      ? Math.min(Math.max(1, next), numPages)
      : Math.max(1, next);

    setInternalPage(p);
    onPageChange?.(p);
  };

  return (
    <div className={className}>
      {showControls && (
        <div className="flex items-center gap-2 mb-2">
          <button
            className="px-3 py-1 rounded-lg border bg-white"
            onClick={() => move(safePage - 1)}
            disabled={safePage <= 1}
          >
            ←
          </button>

          <div className="text-sm">
            {safePage} / {numPages || "—"}
          </div>

          <button
            className="px-3 py-1 rounded-lg border bg-white"
            onClick={() => move(safePage + 1)}
            disabled={!!numPages && safePage >= numPages}
          >
            →
          </button>
        </div>
      )}

      <div
        className="rounded-xl border bg-white overflow-auto"
        style={{ height }}
      >
        <canvas ref={canvasRef} className="block mx-auto" />
      </div>
    </div>
  );
}
