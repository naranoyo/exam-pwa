declare module "pdfjs-dist/build/pdf.mjs" {
  const pdfjs: typeof import("pdfjs-dist");
  export = pdfjs;
}

declare module "pdfjs-dist/legacy/build/pdf.mjs" {
  const pdfjs: typeof import("pdfjs-dist/legacy/build/pdf");
  export = pdfjs;
}
