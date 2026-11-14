"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCcw, Sparkles } from "lucide-react";
import { useTr } from "@/lib/i18n";
import { useMedLens } from "@/lib/store";
import { prepareImage } from "@/lib/image";
import { sampleResult } from "@/lib/sample/discharge";
import type { AnalysisResult } from "@/lib/schema";
import { btn, Notice } from "../ui";
import { DocumentCapture } from "./DocumentCapture";
import { AnalysisProgress } from "./AnalysisProgress";

type ErrorState = { code: string; message: string } | null;

/** Capture → preview → analyze (one request) → results dashboard. */
export function ScanFlow({ variant = "hero", initialMode = null }: { variant?: "hero" | "compact"; initialMode?: "camera" | "upload" | null }) {
  const router = useRouter();
  const { setAnalysis, notify } = useMedLens();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<ErrorState>(null);
  const [captureKey, setCaptureKey] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const lastFiles = useRef<File[] | null>(null);
  const tr = useTr();

  const finish = (result: AnalysisResult) => {
    setDone(true);
    setAnalysis(result);
    setTimeout(() => router.push("/results"), 450);
  };

  const runSample = () => {
    setError(null);
    setBusy(true);
    setDone(false);
    // Short simulated analysis so the flow is the same as a real scan.
    setTimeout(() => finish(sampleResult("sample")), 2400);
  };

  const analyze = async (files: File[]) => {
    lastFiles.current = files;
    setError(null);
    setBusy(true);
    setDone(false);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const prepared = await Promise.all(files.map((f) => prepareImage(f)));
      const form = new FormData();
      prepared.forEach((f) => form.append("files", f, f.name));
      const res = await fetch("/api/analyze", { method: "POST", body: form, signal: controller.signal });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw Object.assign(new Error(body?.error?.message ?? `Analysis failed (${res.status}).`), { code: body?.error?.code ?? "error" });
      }
      const result = body as AnalysisResult;
      if (result.extraction_status === "failed") {
        setBusy(false);
        setError({
          code: "unreadable",
          message:
            result.analysis_notes ??
            "We could not read a medical document in these images. Try a clearer photo in good light with the whole page in view.",
        });
        return;
      }
      if (result.meta.source === "mock") notify("Mock AI provider is enabled — showing fictional sample results.", "warning");
      finish(result);
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        setBusy(false);
        return;
      }
      setBusy(false);
      setError({ code: (e as { code?: string }).code ?? "error", message: (e as Error).message });
    }
  };

  return (
    <div>
      {busy && (
        <AnalysisProgress
          done={done}
          onCancel={() => {
            abortRef.current?.abort();
            setBusy(false);
          }}
        />
      )}
      <div className={busy ? "hidden" : "space-y-3"}>
      <DocumentCapture key={captureKey} variant={variant} initialMode={initialMode} onAnalyze={analyze} onSample={runSample} />
      {error && (
        <Notice tone={error.code === "provider_not_configured" ? "info" : "danger"} icon={<AlertTriangle className="h-5 w-5" />}>
          <p className="font-semibold">
            {error.code === "provider_not_configured" ? tr("AI analysis is not set up on this server yet") : tr("We couldn't analyze that document")}
          </p>
          <p className="mt-1">{tr(error.message)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {error.code !== "provider_not_configured" && error.code !== "unreadable" && lastFiles.current && (
              <button onClick={() => void analyze(lastFiles.current!)} className={btn.primary}>
                <RefreshCcw className="h-4 w-4" /> {tr("Try again")}
              </button>
            )}
            <button onClick={runSample} className={error.code === "provider_not_configured" ? btn.primary : btn.secondary}>
              <Sparkles className="h-4 w-4" /> {tr("Try the sample document")}
            </button>
            {error.code !== "provider_not_configured" && (
              <button onClick={() => { setError(null); setCaptureKey((k) => k + 1); }} className={btn.secondary}>
                {tr("Scan again")}
              </button>
            )}
          </div>
        </Notice>
      )}
      </div>
    </div>
  );
}
