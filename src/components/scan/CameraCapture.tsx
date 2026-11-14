"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, RefreshCcw, RotateCcw, SwitchCamera, X, Upload } from "lucide-react";
import { btn } from "../ui";

type Props = {
  pageCount: number;
  onCapture: (file: File) => void;
  onClose: () => void;
  /** Called when the live camera cannot be used; parent shows upload fallback. */
  onUnavailable: (reason: string) => void;
};

/**
 * Live document camera using the MediaDevices API. Prefers the rear camera on
 * phones, supports switching cameras, preview → retake / use photo, and
 * capturing several pages in a row.
 */
export function CameraCapture({ pageCount, onCapture, onClose, onUnavailable }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [deviceCount, setDeviceCount] = useState(0);
  const [ready, setReady] = useState(false);
  const [shot, setShot] = useState<{ url: string; blob: Blob } | null>(null);
  const [starting, setStarting] = useState(true);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
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
          video: { facingMode: { ideal: mode }, width: { ideal: 1920 }, height: { ideal: 1440 } },
          audio: false,
        });
        streamRef.current = stream;
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

  useEffect(() => () => { if (shot) URL.revokeObjectURL(shot.url); }, [shot]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 2000 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => blob && setShot({ blob, url: URL.createObjectURL(blob) }), "image/jpeg", 0.88);
  };

  const usePhoto = () => {
    if (!shot) return;
    onCapture(new File([shot.blob], `page-${pageCount + 1}.jpg`, { type: "image/jpeg" }));
    setShot(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label="Document camera">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm font-medium">
          {shot ? "Is the text clear and readable?" : `Page ${pageCount + 1} — fit the whole page in the frame`}
        </p>
        <button onClick={() => { stopStream(); onClose(); }} className="rounded-full p-2 hover:bg-white/10" aria-label="Close camera">
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className={`h-full w-full object-contain ${shot ? "hidden" : ""}`} />
        {shot && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shot.url} alt={`Captured page ${pageCount + 1}`} className="h-full w-full object-contain" />
        )}
        {!shot && ready && (
          <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-dashed border-white/60" aria-hidden />
        )}
        {starting && <p className="absolute inset-0 grid place-items-center text-sm text-white/80">Starting camera…</p>}
      </div>

      <div className="flex items-center justify-center gap-4 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
        {shot ? (
          <>
            <button onClick={() => setShot(null)} className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-5 py-3 font-semibold hover:bg-white/25">
              <RotateCcw className="h-5 w-5" /> Retake
            </button>
            <button onClick={usePhoto} className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 font-semibold text-black hover:bg-brand-400">
              <Check className="h-5 w-5" /> Use photo
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
              onClick={capture}
              disabled={!ready}
              className="grid h-20 w-20 place-items-center rounded-full border-4 border-white bg-white/20 hover:bg-white/30 disabled:opacity-40"
              aria-label="Take photo"
            >
              <Camera className="h-8 w-8" />
            </button>
            <button
              onClick={() => { stopStream(); onClose(); }}
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
