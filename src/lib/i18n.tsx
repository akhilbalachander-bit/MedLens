"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useMedLens } from "./store";

/**
 * Interface text in the selected language.
 *
 *   const tr = useTr();
 *   tr("Scan with Camera")
 *   tr("Page {n} added", { n: 2 })
 *
 * English is the source. Strings are collected as they render, translated in
 * batches by /api/translate (shared server cache, so each language is paid
 * for about once), and saved in this browser. Until a translation arrives the
 * English text shows. Never pass document content, medication names or
 * quotes through tr(): those are translated (or deliberately kept) elsewhere.
 */
export type Vars = Record<string, string | number>;
export type Tr = (english: string, vars?: Vars) => string;

const STORAGE_PREFIX = "medlens.ui.v1.";
const BATCH = 80;

export function fill(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

function load(code: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_PREFIX + code) ?? "{}") ?? {};
  } catch {
    return {};
  }
}
function save(code: string, dict: Record<string, string>) {
  try {
    localStorage.setItem(STORAGE_PREFIX + code, JSON.stringify(dict));
  } catch {
    /* storage full or blocked: keep in memory only */
  }
}

/** A translation must keep the same {placeholders}, or it is not used. */
export function samePlaceholders(a: string, b: string): boolean {
  const p = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  return p(a) === p(b);
}

type Ctx = { tr: Tr; code: string };
const UiCtx = createContext<Ctx>({ tr: fill, code: "en" });

export function UiTextProvider({ children }: { children: React.ReactNode }) {
  const { language, provider } = useMedLens();
  const code = language.code;
  const [dict, setDict] = useState<Record<string, string>>({});
  const pending = useRef(new Set<string>());
  const attempts = useRef(new Map<string, number>());
  const timer = useRef<number | null>(null);
  const busy = useRef(false);
  const current = useRef({ code, name: language.name, dict, enabled: false });
  const enabled = !!provider?.configured;
  current.current = { code, name: language.name, dict, enabled };

  useEffect(() => {
    setDict(code === "en" ? {} : load(code));
    pending.current.clear();
    attempts.current.clear();
  }, [code]);

  const flush = useCallback(async () => {
    timer.current = null;
    const { code: lang, name, enabled: on } = current.current;
    if (lang === "en" || !on || busy.current) return;
    const batch = [...pending.current].slice(0, BATCH);
    if (!batch.length) return;
    batch.forEach((s) => pending.current.delete(s));
    busy.current = true;
    try {
      const entries = Object.fromEntries(batch.map((s, i) => [`u${i}`, s]));
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: { code: lang, name }, entries, protected: ["MedLens", "911", "988"], shared: true }),
      });
      const body = await res.json().catch(() => null);
      const got: Record<string, string> = {};
      if (res.ok && body?.translations) {
        batch.forEach((s, i) => {
          const v = body.translations[`u${i}`];
          if (typeof v === "string" && v.trim() && samePlaceholders(s, v)) got[s] = v;
        });
      }
      for (const s of batch) {
        if (s in got) continue;
        const n = (attempts.current.get(s) ?? 0) + 1;
        attempts.current.set(s, n);
        if (n < 3) pending.current.add(s);
      }
      if (current.current.code === lang && Object.keys(got).length) {
        setDict((d) => {
          const next = { ...d, ...got };
          save(lang, next);
          return next;
        });
      }
      const failed = !res.ok;
      busy.current = false;
      if (pending.current.size && current.current.code === lang) {
        timer.current = window.setTimeout(() => void flush(), failed ? 8000 : 100);
      }
    } catch {
      busy.current = false;
      batch.forEach((s) => pending.current.add(s));
      timer.current = window.setTimeout(() => void flush(), 8000);
    }
  }, []);

  const tr = useCallback<Tr>(
    (english, vars) => {
      if (code === "en" || !english) return fill(english, vars);
      const hit = dict[english];
      if (hit) return fill(hit, vars);
      if (enabled && (attempts.current.get(english) ?? 0) < 3 && !pending.current.has(english)) {
        pending.current.add(english);
        if (timer.current == null && typeof window !== "undefined") timer.current = window.setTimeout(() => void flush(), 250);
      }
      return fill(english, vars);
    },
    [code, dict, enabled, flush],
  );

  // Strings seen before the provider status loaded.
  useEffect(() => {
    if (enabled && pending.current.size && timer.current == null) timer.current = window.setTimeout(() => void flush(), 250);
  }, [enabled, flush]);

  const value = useMemo(() => ({ tr, code }), [tr, code]);
  return <UiCtx.Provider value={value}>{children}</UiCtx.Provider>;
}

export function useTr(): Tr {
  return useContext(UiCtx).tr;
}
