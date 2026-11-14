"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createSpeechEngine, voicesForLanguage, type SpeechEngine, type SpeechVoice } from "@/lib/speech/engine";
import { useMedLens } from "@/lib/store";
import type { Language } from "@/lib/languages";

export type SpeakRequest = { id: string; label: string; text: string; lang?: Language };
type Status = "idle" | "speaking" | "paused";

type SpeechCtx = {
  supported: boolean;
  status: Status;
  currentId: string | null;
  currentLabel: string | null;
  voices: SpeechVoice[];
  /** voices matching the selected language */
  languageVoices: SpeechVoice[];
  selectedVoiceId: string | null;
  setVoice: (id: string | null) => void;
  error: string | null;
  speak: (req: SpeakRequest) => void;
  toggle: (req: SpeakRequest) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  replay: () => void;
  hasLast: boolean;
};

const Ctx = createContext<SpeechCtx | null>(null);

export function SpeechProvider({ children }: { children: React.ReactNode }) {
  const { language, prefs, setPrefs } = useMedLens();
  const engineRef = useRef<SpeechEngine | null>(null);
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechVoice[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [current, setCurrent] = useState<SpeakRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const last = useRef<SpeakRequest | null>(null);

  useEffect(() => {
    const engine = createSpeechEngine();
    engineRef.current = engine;
    setSupported(engine.isSupported());
    const load = () => setVoices(engine.getVoices());
    load();
    const off = engine.onVoicesChanged(load);
    return () => {
      off();
      engine.cancel();
    };
  }, []);

  // Stop speaking when the language changes (text would no longer match).
  useEffect(() => {
    engineRef.current?.cancel();
    setStatus("idle");
    setCurrent(null);
  }, [language.code]);

  const languageVoices = useMemo(() => voicesForLanguage(voices, language), [voices, language]);
  const savedVoice = prefs.voiceByLang[language.code] ?? null;
  const selectedVoiceId = savedVoice && voices.some((v) => v.id === savedVoice) ? savedVoice : (languageVoices[0]?.id ?? null);

  const speak = useCallback(
    (req: SpeakRequest) => {
      const engine = engineRef.current;
      if (!engine || !engine.isSupported()) {
        setError("Read-aloud is not supported in this browser. Try Chrome, Edge or Safari.");
        return;
      }
      const lang = req.lang ?? language;
      const voiceId = lang.code === language.code ? selectedVoiceId : null;
      setError(null);
      last.current = req;
      setCurrent(req);
      engine.speak(req.text, {
        lang,
        voiceId,
        rate: prefs.speechRate === "slow" ? 0.72 : 1,
        onStart: () => setStatus("speaking"),
        onEnd: () => {
          setStatus("idle");
          setCurrent(null);
        },
        onError: (m) => {
          setError(m);
          setStatus("idle");
          setCurrent(null);
        },
      });
    },
    [language, selectedVoiceId, prefs.speechRate],
  );

  const pause = useCallback(() => {
    engineRef.current?.pause();
    setStatus("paused");
  }, []);
  const resume = useCallback(() => {
    engineRef.current?.resume();
    setStatus("speaking");
  }, []);
  const stop = useCallback(() => {
    engineRef.current?.cancel();
    setStatus("idle");
    setCurrent(null);
  }, []);

  const value: SpeechCtx = {
    supported,
    status,
    currentId: current?.id ?? null,
    currentLabel: current?.label ?? null,
    voices,
    languageVoices,
    selectedVoiceId,
    setVoice: (id) => setPrefs({ voiceByLang: { ...prefs.voiceByLang, [language.code]: id ?? "" } }),
    error,
    speak,
    toggle: (req) => {
      if (current?.id === req.id) {
        if (status === "speaking") pause();
        else if (status === "paused") resume();
        else speak(req);
      } else speak(req);
    },
    pause,
    resume,
    stop,
    replay: () => last.current && speak(last.current),
    hasLast: !!last.current,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSpeech() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSpeech must be used inside SpeechProvider");
  return c;
}
