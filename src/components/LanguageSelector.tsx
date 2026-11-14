"use client";

import { Languages, Loader2 } from "lucide-react";
import { useMedLens } from "@/lib/store";
import { cx } from "./ui";
import { useTr } from "@/lib/i18n";

export function LanguageSelector({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { languages, language, setLanguage, translationState } = useMedLens();
  const tr = useTr();
  return (
    <label
      className={cx(
        "relative flex min-w-0 max-w-full items-center gap-2 rounded-xl border bg-white",
        compact ? "border-slate-300 px-2 py-1" : "border-brand-300 px-3 py-2 shadow-sm ring-1 ring-brand-100",
        className,
      )}
    >
      {translationState.status === "loading" ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-700" aria-hidden />
      ) : (
        <Languages className={cx("shrink-0 text-brand-700", compact ? "h-4 w-4" : "h-5 w-5")} aria-hidden />
      )}
      <span className={compact ? "sr-only" : "shrink-0 text-sm font-semibold text-ink"}>{tr("Language")}</span>
      <select
        value={language.code}
        onChange={(e) => setLanguage(e.target.value)}
        className={cx("min-w-0 cursor-pointer truncate bg-transparent font-medium text-ink focus:outline-none", compact ? "max-w-[9rem] text-sm" : "w-full flex-1 text-base")}
        aria-label={tr("Choose language")}
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
  const tr = useTr();
  if (language.code === "en") return null;
  if (translationState.status === "loading")
    return (
      <p className="flex items-center gap-2 text-sm text-brand-800" role="status">
        <Loader2 className="h-4 w-4 animate-spin" /> {tr("Translating into {language}… medication names and doses stay unchanged.", { language: language.native })}
      </p>
    );
  if (translationState.status === "error" || translationState.status === "unavailable")
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950" role="status">
        {tr(translationState.message ?? "")}{" "}
        {translationState.status === "error" && (
          <button className="font-semibold underline" onClick={retryTranslation}>
            {tr("Try again")}
          </button>
        )}
      </p>
    );
  if (translationState.message)
    return (
      <p className="text-sm text-ink-muted">
        {tr(translationState.message)}{" "}
        {translationState.status === "ready" && (
          <button className="font-semibold underline" onClick={retryTranslation}>
            {tr("Try again")}
          </button>
        )}
      </p>
    );
  return (
    <p className="text-sm text-ink-muted">
      {tr("Showing {language}. Medication names, doses and phone numbers are kept exactly as written. Your original document text is shown unchanged.", { language: language.native })}
    </p>
  );
}
