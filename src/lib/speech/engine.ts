import type { Language } from "../languages";

/**
 * Speech engine abstraction. Two implementations: the device's own voices
 * (Web Speech API, below) and natural online voices (CloudSpeechEngine in
 * ./cloud), which falls back to the device engine when needed.
 */
export type SpeechVoice = { id: string; name: string; lang: string; local: boolean };

export type SpeakOptions = {
  lang: Language;
  voiceId?: string | null;
  rate: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
  /** Non-fatal information, e.g. falling back to a device voice. */
  onNotice?: (message: string) => void;
};

export interface SpeechEngine {
  readonly id: string;
  isSupported(): boolean;
  getVoices(): SpeechVoice[];
  onVoicesChanged(cb: () => void): () => void;
  speak(text: string, opts: SpeakOptions): void;
  pause(): void;
  resume(): void;
  cancel(): void;
}

/** Split into short chunks: long utterances get cut off in some browsers. */
export function chunkText(text: string, max = 180): string[] {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?。！？؟।])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const s of sentences) {
    if (s.length <= max) {
      out.push(s);
      continue;
    }
    let cur = "";
    for (const part of s.split(/(?<=[,;:，、])\s*|\s+/)) {
      if ((cur + " " + part).trim().length > max && cur) {
        out.push(cur.trim());
        cur = part;
      } else cur = `${cur} ${part}`;
    }
    if (cur.trim()) out.push(cur.trim());
  }
  return out;
}

export function voicesForLanguage(voices: SpeechVoice[], lang: Language): SpeechVoice[] {
  const exact = lang.speech.toLowerCase();
  const prefixes = [exact, ...(lang.voiceAliases ?? []).map((a) => a.toLowerCase()), lang.code.toLowerCase()];
  const matches = voices.filter((v) => {
    const vl = v.lang.replace("_", "-").toLowerCase();
    return prefixes.some((p) => vl === p || vl.startsWith(p + "-") || vl === p.split("-")[0]);
  });
  // exact locale first, then local voices
  return matches.sort((a, b) => {
    const ae = a.lang.replace("_", "-").toLowerCase() === exact ? 0 : 1;
    const be = b.lang.replace("_", "-").toLowerCase() === exact ? 0 : 1;
    return ae - be || Number(b.local) - Number(a.local);
  });
}

export class BrowserSpeechEngine implements SpeechEngine {
  readonly id = "browser";
  private token = 0;

  isSupported() {
    return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  }

  getVoices(): SpeechVoice[] {
    if (!this.isSupported()) return [];
    return window.speechSynthesis.getVoices().map((v) => ({ id: v.voiceURI, name: v.name, lang: v.lang, local: v.localService }));
  }

  onVoicesChanged(cb: () => void) {
    if (!this.isSupported()) return () => {};
    const synth = window.speechSynthesis;
    synth.addEventListener("voiceschanged", cb);
    return () => synth.removeEventListener("voiceschanged", cb);
  }

  speak(text: string, opts: SpeakOptions) {
    if (!this.isSupported()) {
      opts.onError?.("Read-aloud is not supported in this browser.");
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const my = ++this.token;
    const chunks = chunkText(text);
    const native = synth.getVoices();
    // Voices are loaded but none speaks this language: the browser would use
    // its default (usually English) voice, which is unintelligible. Say so.
    if (native.length > 0 && voicesForLanguage(this.getVoices(), opts.lang).length === 0) {
      opts.onError?.(
        "This device has no voice for this language. Turn on “Natural online voice” in Settings, or add the language in your device's speech settings.",
      );
      return;
    }
    const voice =
      (opts.voiceId && native.find((v) => v.voiceURI === opts.voiceId)) ||
      native.find((v) => v.voiceURI === voicesForLanguage(this.getVoices(), opts.lang)[0]?.id) ||
      null;
    let i = 0;
    const next = () => {
      if (my !== this.token) return;
      if (i >= chunks.length) {
        opts.onEnd?.();
        return;
      }
      const u = new SpeechSynthesisUtterance(chunks[i++]);
      u.lang = voice?.lang ?? opts.lang.speech;
      if (voice) u.voice = voice;
      u.rate = opts.rate;
      u.onend = next;
      u.onerror = (e) => {
        if (my !== this.token) return;
        if (e.error === "interrupted" || e.error === "canceled") return;
        opts.onError?.(`Speech error: ${e.error}`);
      };
      synth.speak(u);
    };
    opts.onStart?.();
    // Small delay: Chrome sometimes drops an utterance queued right after cancel().
    setTimeout(next, 60);
  }

  pause() {
    if (this.isSupported()) window.speechSynthesis.pause();
  }
  resume() {
    if (this.isSupported()) window.speechSynthesis.resume();
  }
  cancel() {
    this.token++;
    if (this.isSupported()) window.speechSynthesis.cancel();
  }
}

export function createSpeechEngine(): SpeechEngine {
  return new BrowserSpeechEngine();
}
