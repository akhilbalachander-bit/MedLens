"use client";

import { findRedactions, type Box, type OcrLine, type OcrWord, type Redaction } from "./redact";

/**
 * Privacy shield: everything here runs on the patient's device.
 *
 * Each page (photo or PDF page) is drawn onto a canvas, read with on-device
 * text recognition (Tesseract, served from MedLens itself), and personal
 * details are covered with black labelled boxes ("NAME", "AGE 60–69"…).
 * Only that covered image is uploaded, re-encoded so hidden photo data
 * (GPS location, camera details) is dropped, with a neutral file name.
 */
export type ShieldPage = {
  id: string;
  canvas: HTMLCanvasElement;
  words: OcrWord[];
  redactions: Redaction[];
  /** false when text recognition could not run on this page */
  ocrOk: boolean;
};
export type ShieldProgress = { stage: "loading" | "reading" | "pdf"; page: number; total: number };

const MAX_DIM = 2000;
let n = 0;

// ---------- text recognition (loaded once, on first use) ----------
type TessWorker = {
  recognize: (img: HTMLCanvasElement, opts?: object, output?: object) => Promise<{ data: { blocks: TessBlock[] | null } }>;
  terminate: () => Promise<unknown>;
};
type TessBlock = { paragraphs: { lines: { words: { text: string; bbox: Box }[] }[] }[] };
let workerPromise: Promise<TessWorker> | null = null;

function getWorker(): Promise<TessWorker> {
  workerPromise ??= (async () => {
    const { createWorker } = await import("tesseract.js");
    const w = await createWorker("eng", 1, {
      workerPath: "/vendor/tesseract/worker.min.js",
      corePath: "/vendor/tesseract/core",
      langPath: "/vendor/tesseract/lang",
      gzip: true,
      workerBlobURL: false,
    });
    return w as unknown as TessWorker;
  })().catch((e) => {
    workerPromise = null;
    throw e;
  });
  return workerPromise;
}

async function readLines(canvas: HTMLCanvasElement): Promise<OcrLine[]> {
  const worker = await getWorker();
  const { data } = await worker.recognize(canvas, {}, { blocks: true });
  const lines: OcrLine[] = [];
  for (const b of data.blocks ?? [])
    for (const p of b.paragraphs)
      for (const l of p.lines) {
        const words = l.words.filter((w) => w.text.trim()).map((w) => ({ text: w.text, bbox: w.bbox }));
        if (words.length) lines.push({ words });
      }
  return lines;
}

// ---------- drawing pages ----------
function canvasFor(w: number, h: number): HTMLCanvasElement {
  const scale = Math.min(1, MAX_DIM / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  return c;
}

async function imageToCanvas(file: File): Promise<HTMLCanvasElement> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(
      `"${file.name}" can't be checked for personal details on this device. Please use a JPG or PNG photo, or a PDF.`,
    );
  }
  const c = canvasFor(bmp.width, bmp.height);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return c;
}

async function pdfToCanvases(file: File, maxPages: number): Promise<HTMLCanvasElement[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const out: HTMLCanvasElement[] = [];
  for (let i = 1; i <= Math.min(doc.numPages, maxPages); i++) {
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(3, MAX_DIM / Math.max(base.width, base.height));
    const viewport = page.getViewport({ scale });
    const c = document.createElement("canvas");
    c.width = Math.round(viewport.width);
    c.height = Math.round(viewport.height);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport, canvas: c } as Parameters<typeof page.render>[0]).promise;
    out.push(c);
  }
  await doc.destroy();
  return out;
}

/** Read every page and find personal details. Nothing leaves the device. */
export async function shieldFiles(files: File[], maxPages: number, onProgress: (p: ShieldProgress) => void): Promise<ShieldPage[]> {
  const canvases: HTMLCanvasElement[] = [];
  for (const f of files) {
    if (canvases.length >= maxPages) break;
    const isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
    if (isPdf) {
      onProgress({ stage: "pdf", page: canvases.length + 1, total: files.length });
      canvases.push(...(await pdfToCanvases(f, maxPages - canvases.length)));
    } else canvases.push(await imageToCanvas(f));
  }
  onProgress({ stage: "loading", page: 0, total: canvases.length });
  const pages: ShieldPage[] = [];
  for (let i = 0; i < canvases.length; i++) {
    onProgress({ stage: "reading", page: i + 1, total: canvases.length });
    let lines: OcrLine[] = [];
    let ocrOk = true;
    try {
      lines = await readLines(canvases[i]);
    } catch {
      ocrOk = false; // the patient can still cover details by hand
    }
    pages.push({ id: `pg${++n}`, canvas: canvases[i], words: lines.flatMap((l) => l.words), redactions: findRedactions(lines), ocrOk });
  }
  return pages;
}

// ---------- covering ----------
const PAD = 4;

/** Draw the page with every redaction covered by a black, labelled box. */
export function drawMasked(page: ShieldPage, target: HTMLCanvasElement = document.createElement("canvas")): HTMLCanvasElement {
  target.width = page.canvas.width;
  target.height = page.canvas.height;
  const ctx = target.getContext("2d")!;
  ctx.drawImage(page.canvas, 0, 0);
  for (const r of page.redactions) {
    for (const b of r.boxes) {
      const x = Math.max(0, b.x0 - PAD);
      const y = Math.max(0, b.y0 - PAD);
      const w = Math.min(target.width, b.x1 + PAD) - x;
      const h = Math.min(target.height, b.y1 + PAD) - y;
      ctx.fillStyle = "#000000";
      ctx.fillRect(x, y, w, h);
      // The label tells the AI what kind of detail was here, never the detail itself.
      const text = `[${r.label}]`;
      let size = Math.max(9, Math.min(h * 0.7, 28));
      ctx.font = `600 ${size}px system-ui, sans-serif`;
      while (ctx.measureText(text).width > w - 4 && size > 7) {
        size -= 1;
        ctx.font = `600 ${size}px system-ui, sans-serif`;
      }
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "middle";
      ctx.fillText(text, x + 3, y + h / 2, Math.max(1, w - 6));
    }
  }
  return target;
}

/** The covered page as a fresh JPEG (no photo metadata), with a neutral name. */
export async function maskedFile(page: ShieldPage, index: number): Promise<File> {
  const c = drawMasked(page);
  const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", 0.88));
  if (!blob) throw new Error("Could not prepare the page.");
  return new File([blob], `page-${index + 1}.jpg`, { type: "image/jpeg" });
}

export function newRedaction(box: Box, text = ""): Redaction {
  return { id: `m${++n}`, kind: "other", label: "HIDDEN", boxes: [box], text, auto: false };
}

/** Warm up the reader in the background (e.g. when the review screen opens). */
export function preloadShield() {
  void getWorker().catch(() => {});
}
