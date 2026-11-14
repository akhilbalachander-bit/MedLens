"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cx } from "../ui";

export const DOCUMENT_STAGES = [
  "Uploading your document securely",
  "Reading the text on each page",
  "Finding medications, doses and instructions",
  "Writing simple explanations",
  "Sorting warning signs and recovery steps",
  "Double-checking the results",
];

export const BILL_STAGES = [
  "Uploading your bill securely",
  "Reading each charge",
  "Grouping charges by category",
  "Explaining billing terms",
  "Looking for items to ask about",
];

/**
 * Progress display for the single analysis request. The request is one call,
 * so stages advance on a timer and the final stage completes only when the
 * response arrives.
 */
export function AnalysisProgress({ stages = DOCUMENT_STAGES, done, onCancel, stepMs = 2600 }: { stages?: string[]; done?: boolean; onCancel?: () => void; stepMs?: number }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (done) {
      setStep(stages.length);
      return;
    }
    const id = setInterval(() => setStep((s) => Math.min(s + 1, stages.length - 1)), stepMs);
    return () => clearInterval(id);
  }, [done, stages.length, stepMs]);
  const pct = Math.round(((done ? stages.length : step + 0.5) / stages.length) * 100);

  return (
    <div className="rounded-3xl border border-brand-200 bg-white p-6 shadow-card" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <Loader2 className={cx("h-7 w-7 text-brand-700", !done && "animate-spin")} aria-hidden />
        <div>
          <p className="text-lg font-bold text-ink">{done ? "Done!" : "Analyzing your document…"}</p>
          <p className="text-sm text-ink-muted">This usually takes 10–30 seconds.</p>
        </div>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
        <div className="h-full rounded-full bg-brand-600 transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <ol className="mt-4 space-y-2">
        {stages.map((s, i) => {
          const state = i < step || done ? "done" : i === step ? "active" : "todo";
          return (
            <li key={s} className={cx("flex items-center gap-3 text-[15px]", state === "todo" ? "text-ink-muted" : "text-ink")}>
              <span
                className={cx(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs",
                  state === "done" ? "bg-brand-600 text-white" : state === "active" ? "border-2 border-brand-600" : "border border-slate-300",
                )}
              >
                {state === "done" ? <Check className="h-4 w-4" /> : state === "active" ? <span className="h-2 w-2 animate-pulse rounded-full bg-brand-600" /> : null}
              </span>
              {s}
            </li>
          );
        })}
      </ol>
      {onCancel && !done && (
        <button onClick={onCancel} className="mt-4 text-sm font-medium text-ink-muted underline hover:text-ink">
          Cancel
        </button>
      )}
    </div>
  );
}
