"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Upload, FileText, Trash2, ArrowUp, ArrowDown, Plus, Sparkles, ShieldCheck, ImageOff } from "lucide-react";
import { ACCEPT_ATTR, resolveMime } from "@/lib/files";
import { useMedLens } from "@/lib/store";
import { btn, cx, Notice } from "../ui";
import { CameraCapture, CameraFallback } from "./CameraCapture";
import { useTr } from "@/lib/i18n";

export type Page = { id: string; file: File; url: string | null; kind: "image" | "pdf" };

type Props = {
  variant?: "hero" | "compact";
  onAnalyze: (files: File[]) => void;
  onSample?: () => void;
  sampleLabel?: string;
  analyzeLabel?: string;
  initialMode?: "camera" | "upload" | null;
  disabled?: boolean;
  what?: string;
};

let counter = 0;

/**
 * Capture or upload → preview → confirm. Supports several pages, camera with
 * rear-camera preference, a native-capture fallback, image and PDF uploads.
 */
export function DocumentCapture({
  variant = "hero",
  onAnalyze,
  onSample,
  sampleLabel = "Try Sample Document",
  analyzeLabel = "Analyze document",
  initialMode = null,
  disabled,
  what = "prescription bottle, medication label or hospital discharge papers",
}: Props) {
  const { provider } = useMedLens();
  const tr = useTr();
  const [pages, setPages] = useState<Page[]>([]);
  const [camera, setCamera] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const started = useRef(false);
  const maxFiles = provider?.maxFiles ?? 8;
  const maxMb = provider?.maxFileMb ?? 10;

  useEffect(() => {
    if (started.current || !initialMode) return;
    started.current = true;
    if (initialMode === "camera") setCamera(true);
    if (initialMode === "upload") setTimeout(() => uploadRef.current?.click(), 50);
  }, [initialMode]);

  useEffect(() => () => pages.forEach((p) => p.url && URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = (list: FileList | File[] | null) => {
    if (!list) return;
    const errors: string[] = [];
    const next: Page[] = [];
    for (const f of Array.from(list)) {
      const mime = resolveMime(f.name, f.type);
      const isPdf = mime === "application/pdf";
      const isImg = mime.startsWith("image/");
      if (!isPdf && !isImg) {
        errors.push(tr("\"{name}\" is not an image or PDF.", { name: f.name }));
        continue;
      }
      if (f.size > maxMb * 1024 * 1024) {
        errors.push(tr("\"{name}\" is larger than {mb} MB.", { name: f.name, mb: maxMb }));
        continue;
      }
      const previewable = isImg && /jpeg|png|webp|gif/.test(mime);
      next.push({
        id: `p${++counter}`,
        file: f.type ? f : new File([f], f.name, { type: mime }),
        url: previewable ? URL.createObjectURL(f) : null,
        kind: isPdf ? "pdf" : "image",
      });
    }
    setPages((cur) => {
      const room = maxFiles - cur.length;
      if (next.length > room) errors.push(tr("You can add up to {count} pages.", { count: maxFiles }));
      return [...cur, ...next.slice(0, Math.max(0, room))];
    });
    setFileError(errors.length ? errors.join(" ") : null);
  };

  const remove = (id: string) =>
    setPages((cur) => {
      const p = cur.find((x) => x.id === id);
      if (p?.url) URL.revokeObjectURL(p.url);
      return cur.filter((x) => x.id !== id);
    });
  const move = (i: number, d: -1 | 1) =>
    setPages((cur) => {
      const j = i + d;
      if (j < 0 || j >= cur.length) return cur;
      const copy = [...cur];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const uploadInput = (
    <input
      ref={uploadRef}
      type="file"
      multiple
      accept={ACCEPT_ATTR}
      className="sr-only"
      onChange={(e) => {
        addFiles(e.target.files);
        e.target.value = "";
      }}
      aria-label={tr("Upload document files")}
    />
  );

  const openCamera = () => {
    setCamError(null);
    setCamera(true);
  };

  return (
    <div>
      {uploadInput}
      {camera && (
        <CameraCapture
          pageCount={pages.length}
          onCapture={(f) => addFiles([f])}
          onClose={() => setCamera(false)}
          onUnavailable={(r) => {
            setCamera(false);
            setCamError(r);
          }}
        />
      )}

      {pages.length === 0 ? (
        variant === "hero" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={openCamera}
              disabled={disabled}
              className="group flex min-h-[150px] flex-col items-start justify-between rounded-3xl bg-brand-700 p-5 text-left text-white shadow-card hover:bg-brand-600 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-300 disabled:opacity-50"
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15">
                <Camera className="h-8 w-8" aria-hidden />
              </span>
              <span>
                <span className="block text-xl font-bold">{tr("Scan with Camera")}</span>
                <span className="block text-sm text-white/85">{tr("Photograph your {what}", { what: tr(what) })}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => uploadRef.current?.click()}
              disabled={disabled}
              className="group flex min-h-[150px] flex-col items-start justify-between rounded-3xl border-2 border-brand-200 bg-white p-5 text-left shadow-card hover:border-brand-400 hover:bg-brand-50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-300 disabled:opacity-50"
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                <Upload className="h-8 w-8" aria-hidden />
              </span>
              <span>
                <span className="block text-xl font-bold text-ink">{tr("Upload Document")}</span>
                <span className="block text-sm text-ink-soft">{tr("Photo, image or PDF from your device")}</span>
              </span>
            </button>
            {onSample && (
              <button
                type="button"
                onClick={onSample}
                disabled={disabled}
                className="flex items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4 text-left hover:border-brand-400 hover:bg-white sm:col-span-2"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800">
                  <Sparkles className="h-6 w-6" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold text-ink">{tr(sampleLabel)}</span>
                  <span className="block text-sm text-ink-soft">{tr("Explore MedLens with a fictional ER discharge paper — nothing is uploaded.")}</span>
                </span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={openCamera} disabled={disabled} className={btn.primary}>
              <Camera className="h-5 w-5" /> {tr("Scan with camera")}
            </button>
            <button type="button" onClick={() => uploadRef.current?.click()} disabled={disabled} className={btn.secondary}>
              <Upload className="h-5 w-5" /> {tr("Upload photo or PDF")}
            </button>
            {onSample && (
              <button type="button" onClick={onSample} disabled={disabled} className={btn.ghost}>
                <Sparkles className="h-4 w-4" /> {tr(sampleLabel)}
              </button>
            )}
          </div>
        )
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-ink">
              {pages.length > 1 ? tr("Review {count} pages", { count: pages.length }) : tr("Review 1 page")}
            </h3>
            <p className="text-sm text-ink-muted">{tr("Make sure all text is sharp and nothing is cut off.")}</p>
          </div>
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {pages.map((p, i) => (
              <li key={p.id} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <div className="relative aspect-[3/4] bg-slate-100">
                  {p.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.url} alt={tr("Page {n} preview", { n: i + 1 })} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 p-2 text-center text-ink-muted">
                      {p.kind === "pdf" ? <FileText className="h-10 w-10 text-red-600" /> : <ImageOff className="h-10 w-10" />}
                      <span className="line-clamp-2 break-all text-xs">{p.file.name}</span>
                      {p.kind === "image" && <span className="text-[11px]">{tr("Preview unavailable")}</span>}
                    </div>
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">{i + 1}</span>
                </div>
                <div className="flex items-center justify-between px-1 py-1">
                  <div className="flex">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1.5 hover:bg-white disabled:opacity-30" aria-label={tr("Move page {n} earlier", { n: i + 1 })}>
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button onClick={() => move(i, 1)} disabled={i === pages.length - 1} className="rounded p-1.5 hover:bg-white disabled:opacity-30" aria-label={tr("Move page {n} later", { n: i + 1 })}>
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                  <button onClick={() => remove(p.id)} className="rounded p-1.5 text-red-700 hover:bg-red-50" aria-label={tr("Remove page {n}", { n: i + 1 })}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
            {pages.length < maxFiles && (
              <li className="flex aspect-[3/4] flex-col items-stretch justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-3">
                <button onClick={openCamera} className={cx(btn.secondary, "px-2 text-sm")}>
                  <Plus className="h-4 w-4" /> {tr("Photo")}
                </button>
                <button onClick={() => uploadRef.current?.click()} className={cx(btn.secondary, "px-2 text-sm")}>
                  <Plus className="h-4 w-4" /> {tr("File")}
                </button>
              </li>
            )}
          </ol>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={() => {
                pages.forEach((p) => p.url && URL.revokeObjectURL(p.url));
                setPages([]);
              }}
              className={btn.ghost}
            >
              {tr("Start over")}
            </button>
            <button onClick={() => onAnalyze(pages.map((p) => p.file))} disabled={disabled} className={cx(btn.primary, "py-3 text-lg")}>
              {tr(analyzeLabel)} ({pages.length > 1 ? tr("{count} pages", { count: pages.length }) : tr("1 page")})
            </button>
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
            <ShieldCheck className="h-4 w-4 text-brand-700" /> {tr("Your document is sent once for analysis and is not stored by MedLens.")}
          </p>
        </div>
      )}

      {camError && (
        <div className="mt-3">
          <CameraFallback reason={camError} onFiles={(f) => { addFiles(f); setCamError(null); }} onRetry={openCamera} />
        </div>
      )}
      {fileError && (
        <Notice tone="warning" className="mt-3">
          {fileError}
        </Notice>
      )}
    </div>
  );
}
