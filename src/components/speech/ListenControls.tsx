"use client";

import { Pause, Play, RotateCcw, Square, Volume2, Gauge, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { useMedLens } from "@/lib/store";
import { cx } from "../ui";
import { useSpeech, type SpeakRequest } from "./SpeechContext";
import { useTr } from "@/lib/i18n";

/** Small per-section read-aloud button. */
export function SpeakButton({ req, label = "Listen", className }: { req: SpeakRequest; label?: string; className?: string }) {
  const s = useSpeech();
  const tr = useTr();
  const isMe = s.currentId === req.id;
  const playing = isMe && s.status === "speaking";
  const paused = isMe && s.status === "paused";
  const loading = isMe && s.status === "loading";
  if (!req.text.trim()) return null;
  return (
    <button
      type="button"
      onClick={() => s.toggle(req)}
      className={cx(
        "no-print inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium",
        playing ? "border-brand-600 bg-brand-700 text-white" : "border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100",
        className,
      )}
      aria-label={`${tr(loading ? "Cancel" : playing ? "Pause" : paused ? "Resume" : label)}: ${req.label}`}
      aria-pressed={playing}
      aria-busy={loading}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      <span>{tr(loading ? "Loading…" : playing ? "Pause" : paused ? "Resume" : label)}</span>
    </button>
  );
}

/**
 * Large, accessible audio player: play / pause / resume / replay / stop,
 * slow vs normal speed, and voice selection for the current language.
 */
export function ListenBar({ full, className, sticky = true }: { full: SpeakRequest; className?: string; sticky?: boolean }) {
  const s = useSpeech();
  const { prefs, setPrefs, language } = useMedLens();
  const tr = useTr();
  const active = s.status !== "idle";
  const noVoice = !s.cloud && s.supported && s.voices.length > 0 && s.languageVoices.length === 0;

  return (
    <div
      className={cx(
        "no-print z-10 rounded-2xl border border-brand-200 bg-white/95 p-3 shadow-card backdrop-blur",
        sticky && "sticky bottom-20 lg:bottom-4",
        className,
      )}
      role="region"
      aria-label={tr("Listen aloud")}
    >
      {!s.supported ? (
        <p className="text-sm text-ink-soft">
          {tr("Read-aloud is not available in this browser. Try a recent version of Chrome, Edge or Safari.")}
        </p>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() =>
              s.status === "loading" ? s.stop() : active ? (s.status === "speaking" ? s.pause() : s.resume()) : s.speak(full)
            }
            className="inline-flex min-h-[56px] items-center justify-center gap-3 rounded-2xl bg-brand-700 px-5 text-lg font-bold text-white shadow hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
            aria-label={
              s.status === "loading"
                ? tr("Cancel")
                : s.status === "speaking"
                  ? tr("Pause reading")
                  : s.status === "paused"
                    ? tr("Resume reading")
                    : tr("Listen to {what}", { what: full.label })
            }
            aria-busy={s.status === "loading"}
          >
            {s.status === "loading" ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : s.status === "speaking" ? (
              <Pause className="h-7 w-7" />
            ) : (
              <Play className="h-7 w-7" />
            )}
            {tr(s.status === "loading" ? "Preparing voice…" : s.status === "speaking" ? "Pause" : s.status === "paused" ? "Resume" : "Listen to everything")}
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={s.replay} disabled={!s.hasLast} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-40" aria-label={tr("Replay from the beginning")}>
              <RotateCcw className="h-4 w-4" /> {tr("Replay")}
            </button>
            <button type="button" onClick={s.stop} disabled={!active} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-40" aria-label={tr("Stop reading")}>
              <Square className="h-4 w-4" /> {tr("Stop")}
            </button>
            <div className="inline-flex overflow-hidden rounded-xl border border-slate-300 text-sm" role="group" aria-label={tr("Speaking speed")}>
              <span className="flex items-center px-2 text-ink-muted"><Gauge className="h-4 w-4" aria-hidden /></span>
              {(["slow", "normal"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setPrefs({ speechRate: r })}
                  aria-pressed={prefs.speechRate === r}
                  className={cx("px-3 py-2 font-medium", prefs.speechRate === r ? "bg-brand-700 text-white" : "hover:bg-slate-50")}
                >
                  {tr(r === "slow" ? "Slower" : "Normal")}
                </button>
              ))}
            </div>
            {s.cloud ? (
              <span className="inline-flex items-center gap-1 rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-800" title={tr("Natural online voice")}>
                <Sparkles className="h-4 w-4" aria-hidden /> {tr("Natural {language} voice", { language: language.native })}
              </span>
            ) : (
            <label className="flex items-center gap-1 text-sm">
              <span className="sr-only">{tr("Voice")}</span>
              <select
                value={s.selectedVoiceId ?? ""}
                onChange={(e) => s.setVoice(e.target.value || null)}
                className="max-w-[12rem] rounded-xl border border-slate-300 bg-white px-2 py-2"
                aria-label={tr("Voice for {language}", { language: language.native })}
              >
                {s.languageVoices.length === 0 && <option value="">{tr("Default voice")}</option>}
                {s.languageVoices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </label>
            )}
          </div>
        </div>
      )}
      {active && s.currentLabel && (
        <p className="mt-2 text-sm text-brand-800" aria-live="polite">
          {tr(s.status === "paused" ? "Paused" : s.status === "loading" ? "Preparing" : "Reading")}: {s.currentLabel}
        </p>
      )}
      {noVoice && (
        <p className="mt-2 flex items-start gap-2 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {tr("No {language} voice is installed in this browser. MedLens will ask the browser to read in {language}, but it may use a different voice or not pronounce it correctly. You can add voices in your device's language/speech settings, or try Chrome or Edge.", { language: language.native })}
        </p>
      )}
      {s.notice && <p className="mt-2 text-sm text-amber-900">{tr(s.notice)}</p>}
      {s.error && <p className="mt-2 text-sm text-red-700">{tr(s.error)}</p>}
    </div>
  );
}
