"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Minimal typings for the (still prefixed in Chrome/Safari) Web Speech recognition API. */
type RecognitionEvent = { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>; resultIndex: number };
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => Recognition) | null;
}

/** Browser speech recognition with graceful fallback (supported === false → show text input). */
export function useSpeechRecognition(locale: string) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);

  useEffect(() => {
    setSupported(!!getCtor());
  }, []);

  const start = useCallback(
    (onFinal: (text: string) => void) => {
      const C = getCtor();
      if (!C) return;
      rec.current?.abort();
      const r = new C();
      r.lang = locale;
      r.interimResults = true;
      r.continuous = false;
      let finalText = "";
      r.onresult = (e) => {
        let text = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) finalText += res[0].transcript;
          else text += res[0].transcript;
        }
        setInterim(finalText + text);
      };
      r.onerror = (e) => {
        setError(
          e.error === "not-allowed"
            ? "Microphone permission was denied. You can type your question instead."
            : e.error === "language-not-supported"
              ? "Speech recognition does not support this language in this browser. Please type instead."
              : e.error === "no-speech"
                ? "No speech was heard. Try again or type your question."
                : `Speech recognition error: ${e.error}`,
        );
      };
      r.onend = () => {
        setListening(false);
        setInterim("");
        if (finalText.trim()) onFinal(finalText.trim());
      };
      setError(null);
      setListening(true);
      rec.current = r;
      try {
        r.start();
      } catch {
        setListening(false);
      }
    },
    [locale],
  );

  const stop = useCallback(() => rec.current?.stop(), []);
  useEffect(
    () => () => {
      rec.current?.abort();
    },
    [],
  );

  return { supported, listening, interim, error, start, stop };
}
