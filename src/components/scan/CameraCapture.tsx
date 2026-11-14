"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, Check, Flashlight, FlashlightOff, RefreshCcw, RotateCcw, SwitchCamera, X, Upload } from "lucide-react";
import { assessQuality, ISSUE_TEXT, samplePixels, type QualityIssue } from "@/lib/image-quality";
import { btn, cx } from "../ui";

type Props = {
  pageCount: number;
  onCapture: (file: File) => void;
  onClose: () => void;
  /** Called when the live camera cannot be used; parent shows upload fallback. */
  onUnavailable: (reason: string) => void;
};

type Shot = { url: string; blob: Blob; issues: QualityIssue[] };
type TorchCaps = MediaTrackCapabilities & { torch?: boolean; focusMode?: string[] };
type ImageCaptureLike = { takePhoto(): Promise<Blob> };
declare global {
  interface Window {
    ImageCapture?: new (track: MediaStreamTrack) => ImageCaptureLike;
  }
}

const MAX_DIM = 2000;

/**
 * Live document camera using the MediaDevices API. Prefers the rear camera on
 * phones; supports switching cameras, the flashlight, continuous autofocus,
 * full-resolution stills where the browser allows, live hints (too dark,
 * hold steady, glare), a quality check on each photo, retake / use photo,
 * and capturing several pages in a row.
 */
export function CameraCapture({ pageCount, onCapture, onClose, onUnavailable }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [deviceCount, setDeviceCount] = useState(0);
  const [ready, setReady] = useState(false);
  const [shot, setShot] = useState<Shot | null>(null);
  const [starting, setStarting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torch, setTorch] = useState(false);
  const [hint, setHint] = useState<QualityIssue | null>(null);
  const [flash, setFlash] = useState(false);
  const [added, setAdded] = useState<string | null>(null);

  const track = () => streamRef.current?.getVideoTracks()[0] ?? null;

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setTorch(false);
  };

  const start = useCallback(
    async (mode: "environment" | "user") => {
      setStarting(true);
      setReady(false);
      stopStream();
      if (!navigator.mediaDevices?.getUserMedia) {
        onUnavailable(
          window.isSecureContext
            ? "This browser does not support camera access."
            : "Camera access needs a secure (https) connection. Use Upload instead, or open MedLens over https.",
        );
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode }, width: { ideal: 2560 }, height: { ideal: 1920 } },
          audio: false,
        });
        streamRef.current = stream;
        const t = stream.getVideoTracks()[0];
        const caps = (t?.getCapabilities?.() ?? {}) as TorchCaps;
        setTorchSupported(!!caps.torch);
        if (caps.focusMode?.includes("continuous")) {
          await t.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] }).catch(() => {});
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        setDeviceCount(devices.filter((d) => d.kind === "videoinput").length);
        setReady(true);
      } catch (e) {
        const name = (e as DOMException)?.name;
        onUnavailable(
          name === "NotAllowedError"
            ? "Camera permission was denied. You can allow it in your browser settings, or upload a photo instead."
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? "No camera was found on this device. Please upload a photo or PDF instead."
              : name === "NotReadableError"
                ? "The camera is being used by another app. Close it and try again, or upload a photo instead."
                : "The camera could not be started. Please upload a photo or PDF instead.",
        );
      } finally {
        setStarting(false);
      }
    },
    [onUnavailable],
  );

  useEffect(() => {
    void start(facing);
    return stopStream;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  // Release the camera while the tab is hidden; restart when it comes back.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) stopStream();
      else if (!streamRef.current) void start(facing);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [start, facing]);

  useEffect(() => () => { if (shot) URL.revokeObjectURL(shot.url); }, [shot]);

  // Live hints from a small sample of the preview, twice a second.
  useEffect(() => {
    if (!ready || shot) return;
    const id = window.setInterval(() => {
      const v = videoRef.current;
      if (!v || !v.videoWidth) return;
      const px = samplePixels(v, v.videoWidth, v.videoHeight);
      if (!px) return;
      const q = assessQuality(px);
      setHint(q.issues.includes("dark") ? "dark" : q.issues.includes("glare") ? "glare" : q.issues.includes("blurry") ? "blurry" : null);
    }, 500);
    return () => window.clearInterval(id);
  }, [ready, shot]);

  const toggleTorch = async () => {
    const t = track();
    if (!t) return;
    const next = !torch;
    try {
      await t.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorch(next);
    } catch {
      setTorchSupported(false);
    }
  };

  /** Full-resolution still where supported (sharper text), else the video frame. */
  const grab = async (): Promise<{ source: CanvasImageSource; w: number; h: number; close?: () => void } | null> => {
    const v = videoRef.current;
    const t = track();
    if (t && window.ImageCapture && !torch) {
      try {
        const blob = await new window.ImageCapture(t).takePhoto();
        const bmp = await createImageBitmap(blob);
        return { source: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() };
      } catch {
        /* fall back to the preview frame */
      }
    }
    if (!v || !v.videoWidth) return null;
    return { source: v, w: v.videoWidth, h: v.videoHeight };
  };

  const capture = async () => {
    if (busy) return;
    setBusy(true);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 150);
    try {
      const g = await grab();
      if (!g) return;
      const scale = Math.min(1, MAX_DIM / Math.max(g.w, g.h));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(g.w * scale);
      canvas.height = Math.round(g.h * scale);
      canvas.getContext("2d")!.drawImage(g.source, 0, 0, canvas.width, canvas.height);
      g.close?.();
      const px = samplePixels(canvas, canvas.width, canvas.height);
      const issues = px ? assessQuality(px).issues : [];
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.88));
      if (blob) setShot({ blob, url: URL.createObjectURL(blob), issues });
    } finally {
      setBusy(false);
    }
  };

  const usePhoto = () => {
    if (!shot) return;
    onCapture(new File([shot.blob], `page-${pageCount + 1}.jpg`, { type: "image/jpeg" }));
    setAdded(`Page ${pageCount + 1} added`);
    window.setTimeout(() => setAdded(null), 1600);
    setShot(null);
  };

  const close = () => {
    stopStream();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label="Document camera">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <p className="text-sm font-medium">
          {shot ? "Is the text clear and readable?" : `Page ${pageCount + 1} — fit the whole page in the frame`}
        </p>
        <div className="flex items-center gap-1">
          {torchSupported && !shot && (
            <button onClick={toggleTorch} className={cx("rounded-full p-2", torch ? "bg-amber-300 text-black" : "hover:bg-white/10")} aria-pressed={torch} aria-label={torch ? "Turn flashlight off" : "Turn flashlight on"}>
              {torch ? <Flashlight className="h-6 w-6" /> : <FlashlightOff className="h-6 w-6" />}
            </button>
          )}
          <button onClick={close} className="rounded-full p-2 hover:bg-white/10" aria-label="Close camera">
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className={`h-full w-full object-contain ${shot ? "hidden" : ""}`} />
        {shot && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shot.url} alt={`Captured page ${pageCount + 1}`} className="h-full w-full object-contain" />
        )}
        {!shot && ready && (
          <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-dashed border-white/60" aria-hidden>
            {(["left-0 top-0 border-l-4 border-t-4", "right-0 top-0 border-r-4 border-t-4", "left-0 bottom-0 border-b-4 border-l-4", "right-0 bottom-0 border-b-4 border-r-4"] as const).map((c) => (
              <span key={c} className={`absolute h-8 w-8 rounded-sm border-white ${c}`} />
            ))}
          </div>
        )}
        {!shot && ready && hint && (
          <p role="status" className="absolute inset-x-4 top-4 mx-auto w-fit rounded-full bg-black/70 px-4 py-2 text-center text-sm font-medium">
            {ISSUE_TEXT[hint].live}
          </p>
        )}
        {shot && shot.issues.length > 0 && (
          <div role="alert" className="absolute inset-x-4 top-4 mx-auto flex max-w-md items-start gap-2 rounded-xl bg-amber-300 px-4 py-3 text-sm font-medium text-black">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>
              {shot.issues.map((i) => ISSUE_TEXT[i].after).join(" ")} The text may be misread — consider retaking it.
            </span>
          </div>
        )}
        {added && (
          <p role="status" className="absolute inset-x-0 bottom-4 mx-auto w-fit rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-black">
            <Check className="mr-1 inline h-4 w-4" />
            {added}
          </p>
        )}
        {flash && <div className="pointer-events-none absolute inset-0 bg-white/70" aria-hidden />}
        {starting && <p className="absolute inset-0 grid place-items-center text-sm text-white/80">Starting camera…</p>}
      </div>

      <div className="flex items-center justify-center gap-4 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
        {shot ? (
          <>
            <button onClick={() => setShot(null)} className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-5 py-3 font-semibold hover:bg-white/25">
              <RotateCcw className="h-5 w-5" /> Retake
            </button>
            <button onClick={usePhoto} className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 font-semibold text-black hover:bg-brand-400">
              <Check className="h-5 w-5" /> {shot.issues.length ? "Use anyway" : "Use photo"}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
              disabled={deviceCount < 2}
              className="rounded-full bg-white/15 p-3 hover:bg-white/25 disabled:opacity-30"
              aria-label="Switch camera"
            >
              <SwitchCamera className="h-6 w-6" />
            </button>
            <button
              onClick={() => void capture()}
              disabled={!ready || busy}
              className="grid h-20 w-20 place-items-center rounded-full border-4 border-white bg-white/20 hover:bg-white/30 disabled:opacity-40"
              aria-label="Take photo"
            >
              <Camera className="h-8 w-8" />
            </button>
            <button
              onClick={close}
              className="inline-flex min-w-[3rem] items-center gap-1 rounded-full bg-white/15 px-4 py-3 text-sm font-semibold hover:bg-white/25"
            >
              {pageCount > 0 ? <><Check className="h-5 w-5" /> Done ({pageCount})</> : "Cancel"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Shown when the live camera can't be used: native capture input + upload. */
export function CameraFallback({ reason, onFiles, onRetry }: { reason: string; onFiles: (f: FileList | null) => void; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
      <p className="font-medium">{reason}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <label className={btn.primary + " cursor-pointer"}>
          <Camera className="h-5 w-5" /> Use phone camera app
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onFiles(e.target.files)} />
        </label>
        <label className={btn.secondary + " cursor-pointer"}>
          <Upload className="h-5 w-5" /> Upload photo or PDF
          <input type="file" multiple accept="image/*,application/pdf" className="sr-only" onChange={(e) => onFiles(e.target.files)} />
        </label>
        <button onClick={onRetry} className={btn.ghost}>
          <RefreshCcw className="h-4 w-4" /> Try camera again
        </button>
      </div>
    </div>
  );
}
