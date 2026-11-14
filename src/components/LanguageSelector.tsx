"use client";

import { Languages, Loader2 } from "lucide-react";
import { useMedLens } from "@/lib/store";
import { cx } from "./ui";

export function LanguageSelector({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { languages, language, setLanguage, translationState } = useMedLens();
  return (
    <label
      className={cx(
        "relative flex items-center gap-2 rounded-xl border bg-white",
        compact ? "border-slate-300 px-2 py-1" : "border-brand-300 px-3 py-2 shadow-sm ring-1 ring-brand-100",
        className,
      )}
    >
      {translationState.status === "loading" ? (
        <Loader2 className="h-4 w-4 animate-spin text-brand-700" aria-hidden />
      ) : (
        <Languages className={cx("text-brand-700", compact ? "h-4 w-4" : "h-5 w-5")} aria-hidden />
      )}
      <span className={compact ? "sr-only" : "text-sm font-semibold text-ink"}>Language</span>
      <select
        value={language.code}
        onChange={(e) => setLanguage(e.target.value)}
        className={cx("cursor-pointer bg-transparent font-medium text-ink focus:outline-none", compact ? "max-w-[9rem] text-sm" : "text-base")}
        aria-label="Choose language"
      >
        {languages.map((l) => (
          <option key={l.code} value={l.code}>
            {l.native === l.name ? l.name : `${l.native} — ${l.name}`}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TranslationStatus() {
  const { translationState, language, retryTranslation } = useMedLens();
  if (language.code === "en") return null;
  if (translationState.status === "loading")
    return (
      <p className="flex items-center gap-2 text-sm text-brand-800" role="status">
        <Loader2 className="h-4 w-4 animate-spin" /> Translating into {language.name}… medication names and doses stay unchanged.
      </p>
    );
  if (translationState.status === "error" || translationState.status === "unavailable")
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950" role="status">
        {translationState.message}{" "}
        {translationState.status === "error" && (
          <button className="font-semibold underline" onClick={retryTranslation}>
            Try again
          </button>
        )}
      </p>
    );
  if (translationState.message)
    return <p className="text-sm text-ink-muted">{translationState.message}</p>;
  return (
    <p className="text-sm text-ink-muted">
      Showing {language.name}. Medication names, doses and phone numbers are kept exactly as written. Your original document text is shown unchanged.
    </p>
  );
}
