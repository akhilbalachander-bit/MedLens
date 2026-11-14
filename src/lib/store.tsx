"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AnalysisResult } from "./schema";
import type { BillAnalysisResult } from "./bill-schema";
import { BUILT_IN_LANGUAGES, ENV_LANGUAGES, mergeLanguages, type Language } from "./languages";
import { buildTranslatable, protectedTerms, UI_LABELS } from "./translatable";
import { SAMPLE_TRANSLATIONS } from "./sample/discharge-es";

/**
 * Session-based prototype storage.
 * - Patient data (analysis, bill, checklist, reminders, translations) lives in
 *   sessionStorage: it disappears when the tab/browser session ends.
 * - Uploaded document images are never persisted at all.
 * - Only non-medical preferences (language, speech speed, voice, text size)
 *   go to localStorage.
 */

export type Reminder = { id: string; itemId: string; label: string; at: string; fired: boolean };
export type ManualMed = { id: string; name: string; dose: string; notes: string };
export type SpeechRate = "slow" | "normal";
export type Prefs = {
  language: string;
  speechRate: SpeechRate;
  voiceByLang: Record<string, string>;
  textSize: "normal" | "large";
  customLanguages: Language[];
  /** "auto" uses natural online voices when the server has one configured. */
  voiceSource?: "auto" | "device";
};
export type TranslationState = { status: "idle" | "loading" | "ready" | "error" | "unavailable"; message?: string };
export type ProviderStatus = {
  configured: boolean;
  provider: string | null;
  model: string | null;
  maxFileMb: number;
  maxFiles: number;
  tts?: { provider: string } | null;
};

const DEFAULT_PREFS: Prefs = { language: "en", speechRate: "normal", voiceByLang: {}, textSize: "normal", customLanguages: [] };

type Session = {
  analysis: AnalysisResult | null;
  translations: Record<string, Record<string, string>>;
  checklist: Record<string, boolean>;
  reminders: Reminder[];
  bill: BillAnalysisResult | null;
  manualMeds: ManualMed[];
  medVerified: Record<string, boolean>;
};
const EMPTY_SESSION: Session = {
  analysis: null,
  translations: {},
  checklist: {},
  reminders: [],
  bill: null,
  manualMeds: [],
  medVerified: {},
};

/** `translated`: the message is already in the user's language (otherwise it is English and translated when shown). */
type Toast = { id: number; message: string; tone: "info" | "success" | "warning"; translated?: boolean };

type Ctx = Session & {
  hydrated: boolean;
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
  languages: Language[];
  language: Language;
  setLanguage: (code: string) => void;
  setAnalysis: (a: AnalysisResult | null) => void;
  setBill: (b: BillAnalysisResult | null) => void;
  toggleChecklist: (id: string) => void;
  addReminder: (r: Omit<Reminder, "id" | "fired">) => void;
  removeReminder: (id: string) => void;
  markReminderFired: (id: string) => void;
  addManualMed: (m: Omit<ManualMed, "id">) => void;
  removeManualMed: (id: string) => void;
  setMedVerified: (id: string, v: boolean) => void;
  clearSession: () => void;
  /** English source text map for the current analysis (+ UI labels). */
  english: Record<string, string>;
  /** Look up translated text for a key, falling back to English. */
  t: (key: string, fallback?: string | null) => string;
  translationState: TranslationState;
  retryTranslation: () => void;
  provider: ProviderStatus | null;
  toasts: Toast[];
  notify: (message: string, tone?: Toast["tone"], translated?: boolean) => void;
  dismissToast: (id: number) => void;
};

const MedLensContext = createContext<Ctx | null>(null);

function readJson<T>(storage: "local" | "session", key: string, fallback: T): T {
  try {
    const s = storage === "local" ? window.localStorage : window.sessionStorage;
    const raw = s.getItem(key);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(storage: "local" | "session", key: string, value: unknown) {
  try {
    const s = storage === "local" ? window.localStorage : window.sessionStorage;
    s.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: app still works in memory */
  }
}

export function MedLensProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<Session>(EMPTY_SESSION);
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);
  const [provider, setProvider] = useState<ProviderStatus | null>(null);
  const [txState, setTxState] = useState<Record<string, TranslationState>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  useEffect(() => {
    setSession(readJson("session", "medlens.session", EMPTY_SESSION));
    setPrefsState(readJson("local", "medlens.prefs", DEFAULT_PREFS));
    setHydrated(true);
    fetch("/api/config")
      .then((r) => r.json())
      .then(setProvider)
      .catch(() => setProvider({ configured: false, provider: null, model: null, maxFileMb: 10, maxFiles: 8 }));
  }, []);

  useEffect(() => {
    if (hydrated) writeJson("session", "medlens.session", session);
  }, [session, hydrated]);
  useEffect(() => {
    if (hydrated) writeJson("local", "medlens.prefs", prefs);
  }, [prefs, hydrated]);
  useEffect(() => {
    document.documentElement.style.fontSize = prefs.textSize === "large" ? "118%" : "";
  }, [prefs.textSize]);

  const languages = useMemo(
    () => mergeLanguages(BUILT_IN_LANGUAGES, ENV_LANGUAGES, prefs.customLanguages),
    [prefs.customLanguages],
  );
  const language = languages.find((l) => l.code === prefs.language) ?? languages[0];

  const update = useCallback((fn: (s: Session) => Session) => setSession(fn), []);
  const setPrefs = useCallback((p: Partial<Prefs>) => setPrefsState((cur) => ({ ...cur, ...p })), []);

  const notify = useCallback((message: string, tone: Toast["tone"] = "info", translated = false) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message, tone, translated }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);

  const english = useMemo(
    () => (session.analysis ? buildTranslatable(session.analysis) : { ...UI_LABELS }) as Record<string, string>,
    [session.analysis],
  );

  // ---------- translation (cached per language for this session) ----------
  const inflight = useRef<Set<string>>(new Set());
  const translate = useCallback(
    async (lang: Language, force = false) => {
      if (lang.code === "en") return;
      const analysis = session.analysis;
      const cached = session.translations[lang.code] ?? {};
      const missingKeys = Object.keys(english).filter((k) => !(k in cached));
      if (!force && missingKeys.length === 0) {
        setTxState((s) => ({ ...s, [lang.code]: { status: "ready" } }));
        return;
      }
      // Offline sample translations (work without any API key).
      const offline = analysis && analysis.meta.source !== "ai" ? SAMPLE_TRANSLATIONS[lang.code] : undefined;
      const uiOnlyOffline = !analysis ? SAMPLE_TRANSLATIONS[lang.code] : undefined;
      if (offline || uiOnlyOffline) {
        const src = (offline ?? uiOnlyOffline)!;
        const subset = Object.fromEntries(Object.keys(english).filter((k) => k in src).map((k) => [k, src[k]]));
        update((s) => ({ ...s, translations: { ...s.translations, [lang.code]: { ...subset, ...(s.translations[lang.code] ?? {}) } } }));
        if (Object.keys(english).every((k) => k in src)) {
          setTxState((s) => ({ ...s, [lang.code]: { status: "ready" } }));
          return;
        }
      }
      if (provider && !provider.configured) {
        setTxState((s) => ({
          ...s,
          [lang.code]: {
            status: "unavailable",
            message:
              analysis?.meta.source === "sample"
                ? `Offline translation of the sample is available in Spanish. ${lang.name} needs an AI provider key — showing English for now.`
                : `Translation to ${lang.name} needs an AI provider key. Showing English for now.`,
          },
        }));
        return;
      }
      const key = `${lang.code}:${missingKeys.length}`;
      if (inflight.current.has(key)) return;
      inflight.current.add(key);
      setTxState((s) => ({ ...s, [lang.code]: { status: "loading" } }));
      try {
        const todo = force ? Object.keys(english) : missingKeys;
        const prot = analysis ? protectedTerms(analysis) : [];
        let errorMessage: string | null = null;
        const sendBatch = async (keys: string[]): Promise<string[]> => {
          const res = await fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              language: { code: lang.code, name: lang.name },
              entries: Object.fromEntries(keys.map((k) => [k, english[k]])),
              protected: prot,
            }),
          });
          const body = await res.json().catch(() => null);
          if (!res.ok) {
            errorMessage = body?.error?.message ?? "Translation failed.";
            return keys;
          }
          // Show each batch as soon as it arrives.
          update((s) => ({
            ...s,
            translations: { ...s.translations, [lang.code]: { ...(s.translations[lang.code] ?? {}), ...body.translations } },
          }));
          return (body.missing as string[] | undefined) ?? [];
        };
        // Batches of 60 entries, two at a time; anything missed is retried once.
        const runAll = async (keys: string[]) => {
          const batches: string[][] = [];
          for (let i = 0; i < keys.length; i += 60) batches.push(keys.slice(i, i + 60));
          const missed: string[] = [];
          const queue = [...batches];
          await Promise.all(
            [0, 1].map(async () => {
              for (let b = queue.shift(); b; b = queue.shift()) missed.push(...(await sendBatch(b)));
            }),
          );
          return missed;
        };
        let missed = await runAll(todo);
        if (missed.length) {
          await new Promise((r) => setTimeout(r, 2000));
          errorMessage = null;
          missed = await runAll(missed);
        }
        if (missed.length === todo.length) throw new Error(errorMessage ?? "Translation failed.");
        setTxState((s) => ({
          ...s,
          [lang.code]: missed.length
            ? { status: "ready", message: "Some items could not be translated and are shown in English." }
            : { status: "ready" },
        }));
      } catch (e) {
        setTxState((s) => ({ ...s, [lang.code]: { status: "error", message: (e as Error).message } }));
      } finally {
        inflight.current.delete(key);
      }
    },
    [english, session.analysis, session.translations, provider, update],
  );

  useEffect(() => {
    if (hydrated && provider) void translate(language);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, provider, language.code, english]);

  const t = useCallback(
    (key: string, fallback?: string | null) => {
      if (language.code !== "en") {
        const hit = session.translations[language.code]?.[key];
        if (hit) return hit;
      }
      return english[key] ?? fallback ?? "";
    },
    [language.code, session.translations, english],
  );

  const value: Ctx = {
    ...session,
    hydrated,
    prefs,
    setPrefs,
    languages,
    language,
    setLanguage: (code) => setPrefs({ language: code }),
    setAnalysis: (a) =>
      update((s) => ({ ...s, analysis: a, translations: {}, checklist: {}, reminders: [], medVerified: {} })),
    setBill: (b) => update((s) => ({ ...s, bill: b })),
    toggleChecklist: (id) => update((s) => ({ ...s, checklist: { ...s.checklist, [id]: !s.checklist[id] } })),
    addReminder: (r) =>
      update((s) => ({
        ...s,
        reminders: [...s.reminders.filter((x) => x.itemId !== r.itemId), { ...r, id: `rem-${Date.now()}`, fired: false }],
      })),
    removeReminder: (id) => update((s) => ({ ...s, reminders: s.reminders.filter((r) => r.id !== id) })),
    markReminderFired: (id) =>
      update((s) => ({ ...s, reminders: s.reminders.map((r) => (r.id === id ? { ...r, fired: true } : r)) })),
    addManualMed: (m) => update((s) => ({ ...s, manualMeds: [...s.manualMeds, { ...m, id: `mm-${Date.now()}` }] })),
    removeManualMed: (id) => update((s) => ({ ...s, manualMeds: s.manualMeds.filter((m) => m.id !== id) })),
    setMedVerified: (id, v) => update((s) => ({ ...s, medVerified: { ...s.medVerified, [id]: v } })),
    clearSession: () => {
      setSession(EMPTY_SESSION);
      setTxState({});
      try {
        window.sessionStorage.removeItem("medlens.session");
      } catch {
        /* ignore */
      }
    },
    english,
    t,
    translationState: language.code === "en" ? { status: "ready" } : (txState[language.code] ?? { status: "idle" }),
    retryTranslation: () => void translate(language),
    provider,
    toasts,
    notify,
    dismissToast: (id) => setToasts((t) => t.filter((x) => x.id !== id)),
  };

  return <MedLensContext.Provider value={value}>{children}</MedLensContext.Provider>;
}

export function useMedLens() {
  const ctx = useContext(MedLensContext);
  if (!ctx) throw new Error("useMedLens must be used inside MedLensProvider");
  return ctx;
}
