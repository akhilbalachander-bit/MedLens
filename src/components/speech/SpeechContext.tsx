"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BrowserSpeechEngine, voicesForLanguage, type SpeechEngine, type SpeechVoice } from "@/lib/speech/engine";
import { CloudSpeechEngine } from "@/lib/speech/cloud";
import { useMedLens } from "@/lib/store";
import type { Language } from "@/lib/languages";

export type SpeakRequest = { id: string; label: string; text: string; lang?: Language };
type Status = "idle" | "loading" | "speaking" | "paused";

type SpeechCtx = {
  supported: boolean;
  /** true when natural online voices are being used */
  cloud: boolean;
  /** true when the server offers online voices (whether or not the user chose them) */
  cloudAvailable: boolean;
  notice: string | null;
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
  const { language, prefs, setPrefs, provider } = useMedLens();
  const deviceRef = useRef<BrowserSpeechEngine | null>(null);
  const cloudRef = useRef<CloudSpeechEngine | null>(null);
  const engineRef = useRef<SpeechEngine | null>(null);
  const cloudAvailable = !!provider?.tts;
  const cloud = cloudAvailable && prefs.voiceSource !== "device";
  const [notice, setNotice] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechVoice[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [current, setCurrent] = useState<SpeakRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const last = useRef<SpeakRequest | null>(null);

  useEffect(() => {
    const device = new BrowserSpeechEngine();
    deviceRef.current = device;
    cloudRef.current = new CloudSpeechEngine(device);
    engineRef.current = device;
    setSupported(device.isSupported());
    const load = () => setVoices(device.getVoices());
    load();
    const off = device.onVoicesChanged(load);
    return () => {
      off();
      cloudRef.current?.cancel();
      device.cancel();
    };
  }, []);

  // Switch engine when online voices become available or the user changes source.
  useEffect(() => {
    const next = cloud ? cloudRef.current : deviceRef.current;
    if (!next || next === engineRef.current) return;
    engineRef.current?.cancel();
    engineRef.current = next;
    setSupported(next.isSupported());
    setStatus("idle");
    setCurrent(null);
  }, [cloud]);

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
      setNotice(null);
      last.current = req;
      setCurrent(req);
      setStatus("loading");
      engine.speak(req.text, {
        lang,
        voiceId,
        rate: prefs.speechRate === "slow" ? 0.72 : 1,
        onStart: () => setStatus("speaking"),
        onNotice: (m) => setNotice(m),
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
    cloud,
    cloudAvailable,
    notice,
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
        if (status === "loading") stop();
        else if (status === "speaking") pause();
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
