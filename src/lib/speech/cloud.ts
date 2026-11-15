import type { Language } from "../languages";
import { chunkText, voicesForLanguage, type SpeakOptions, type SpeechEngine, type SpeechVoice } from "./engine";

/** Locale sent to the cloud voice service. */
export function ttsLocale(lang: Language): string {
  return lang.ttsLocale ?? lang.speech;
}

/**
 * Group sentences into voice requests that grow: the first is short so audio
 * starts quickly, and each later one is larger than the one before, so it is
 * ready (fetched while the earlier ones play) before it is needed. A short
 * heading never stands alone: it would play in a second and leave a gap.
 */
export const CHUNK_LIMITS = [200, 350, 600, 900, 1200];
const MIN_CHUNK = 90;
export function packChunks(sentences: string[], limits: number[] = CHUNK_LIMITS): string[] {
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    const limit = limits[Math.min(out.length, limits.length - 1)];
    if (cur && cur.length >= MIN_CHUNK && (cur + " " + s).length > limit) {
      out.push(cur);
      cur = s;
    } else cur = cur ? `${cur} ${s}` : s;
  }
  if (cur) out.push(cur);
  return out;
}

/** 0.1 s of silence, played synchronously on tap so iOS allows later audio. */
function silentWav(): string {
  const samples = 800;
  const buf = new ArrayBuffer(44 + samples * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF");
  v.setUint32(4, 36 + samples * 2, true);
  w(8, "WAVE");
  w(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true);
  v.setUint32(28, 16000, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, "data");
  v.setUint32(40, samples * 2, true);
  let bin = "";
  new Uint8Array(buf).forEach((b) => (bin += String.fromCharCode(b)));
  return `data:audio/wav;base64,${btoa(bin)}`;
}

/**
 * Natural online voices via /api/tts, so every language can be read aloud
 * even when the device has no voice installed for it. Text is split into
 * sentence-sized chunks; the next chunk is fetched while the current one
 * plays. If the service fails, the rest is read by the fallback (device)
 * engine.
 */
export class CloudSpeechEngine implements SpeechEngine {
  readonly id = "cloud";
  private token = 0;
  private audio: HTMLAudioElement | null = null;
  private silent: string | null = null;
  private cache = new Map<string, Promise<string>>();
  private failedLocales = new Map<string, number>();
  private usingFallback = false;
  /** Until when natural voices are skipped because their free limit was reached. */
  private limitUntil = 0;
  private paused = false;
  /** Set when the next piece arrived while paused: playing it is what Resume does. */
  private resumePending: (() => void) | null = null;
  /** Pieces requested ahead of playback (current + this many). */
  static readonly LOOKAHEAD = 2;

  constructor(private fallback: SpeechEngine) {}

  isSupported() {
    return typeof window !== "undefined" && typeof Audio !== "undefined";
  }
  getVoices(): SpeechVoice[] {
    return this.fallback.getVoices();
  }
  onVoicesChanged(cb: () => void) {
    return this.fallback.onVoicesChanged(cb);
  }

  private el(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = "auto";
      (this.audio as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
    }
    return this.audio;
  }

  private fetchChunk(text: string, lang: Language): Promise<string> {
    const locale = ttsLocale(lang);
    const key = `${locale}\u0000${text}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const once = () =>
      fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, locale, languageName: lang.name }),
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw Object.assign(new Error(body?.error?.message ?? `Voice service error ${res.status}`), { status: res.status });
        }
        return URL.createObjectURL(await res.blob());
      });
    // Busy or rate-limited: wait and try again (twice) before giving up.
    const p = (async () => {
      for (let attempt = 0; ; attempt++) {
        try {
          return await once();
        } catch (e) {
          const status = (e as { status?: number }).status ?? 0;
          // Overloaded or network hiccup: retry. Free limit reached (429): never
          // retry, it only uses up more of the allowance.
          const retryable = status === 0 || status >= 500;
          if (!retryable || attempt >= 2) throw e;
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        }
      }
    })();
    p.catch(() => this.cache.delete(key));
    this.cache.set(key, p);
    if (this.cache.size > 80) {
      const [oldKey, oldVal] = this.cache.entries().next().value as [string, Promise<string>];
      this.cache.delete(oldKey);
      oldVal.then((u) => URL.revokeObjectURL(u)).catch(() => {});
    }
    return p;
  }

  speak(text: string, opts: SpeakOptions) {
    this.cancel();
    const my = this.token;
    const locale = ttsLocale(opts.lang);
    const chunks = packChunks(chunkText(text, 400));
    const audio = this.el();

    // Only a language the voice service rejected outright is skipped for a while.
    const failedAt = this.failedLocales.get(locale);
    if (failedAt && Date.now() - failedAt < 10 * 60_000) {
      this.handOff(chunks.join(" "), opts, null);
      return;
    }
    // Natural voices hit their free limit recently: use the device voice right
    // away instead of making the patient wait for requests that will fail.
    if (Date.now() < this.limitUntil) {
      this.handOff(chunks.join(" "), opts, null, false, true);
      return;
    }

    // Unlock audio playback inside the tap that started it (iOS Safari).
    this.silent ??= silentWav();
    audio.src = this.silent;
    audio.play().catch(() => {});

    let started = false;
    // Request ahead so the next piece is ready before the current one ends.
    const prefetch = (from: number) => {
      for (let j = from; j < Math.min(chunks.length, from + CloudSpeechEngine.LOOKAHEAD); j++) {
        void this.fetchChunk(chunks[j], opts.lang).catch(() => {});
      }
    };
    prefetch(0);

    const start = async (i: number, url: string) => {
      if (my !== this.token) return;
      audio.src = url;
      audio.playbackRate = opts.rate;
      audio.onended = () => void playAt(i + 1);
      audio.onerror = () => {
        if (my !== this.token) return;
        this.handOff(chunks.slice(i).join(" "), opts, "The voice audio could not be played.", started);
      };
      try {
        await audio.play();
      } catch {
        if (my !== this.token) return;
        opts.onError?.("Your browser blocked audio playback. Tap Listen again.");
        return;
      }
      if (!started) {
        started = true;
        opts.onStart?.();
      }
    };

    const playAt = async (i: number) => {
      if (my !== this.token) return;
      if (i >= chunks.length) {
        opts.onEnd?.();
        return;
      }
      let url: string;
      try {
        url = await this.fetchChunk(chunks[i], opts.lang);
      } catch (e) {
        if (my !== this.token) return;
        const status = (e as { status?: number }).status;
        if (status === 400) this.failedLocales.set(locale, Date.now());
        if (status === 429) this.limitUntil = Date.now() + 5 * 60_000;
        this.handOff(chunks.slice(i).join(" "), opts, (e as Error).message, started, status === 429);
        return;
      }
      if (my !== this.token) return;
      // Request ahead only once the service is answering (no wasted requests when it is not).
      prefetch(i + 1);
      // Paused while this piece was loading: wait for Resume instead of playing.
      if (this.paused) {
        this.resumePending = () => void start(i, url);
        return;
      }
      await start(i, url);
    };
    void playAt(0);
  }

  private handOff(rest: string, opts: SpeakOptions, reason: string | null, started = false, limit = false) {
    if (reason) console.warn(`Online voice unavailable: ${reason}`);
    // Never read a language with a voice that does not speak it (that sounds
    // like English): only fall back when this device has a matching voice.
    if (!voicesForLanguage(this.fallback.getVoices(), opts.lang).length) {
      opts.onError?.(
        limit
          ? "Natural voices have reached their free limit for now, and this device has no voice for this language. Please try again later."
          : "The natural voice is busy right now. Please tap Listen again in a moment.",
      );
      return;
    }
    this.usingFallback = true;
    opts.onNotice?.(
      limit
        ? "Natural voices have reached their free limit for now. Using this device's voice instead."
        : "The online voice is unavailable right now. Using this device's voice instead.",
    );
    this.fallback.speak(rest, { ...opts, onStart: started ? undefined : opts.onStart, voiceId: null });
  }

  pause() {
    this.paused = true;
    if (this.usingFallback) this.fallback.pause();
    else this.audio?.pause();
  }
  resume() {
    this.paused = false;
    if (this.usingFallback) return this.fallback.resume();
    const pending = this.resumePending;
    this.resumePending = null;
    if (pending) pending();
    else void this.audio?.play().catch(() => {});
  }
  cancel() {
    this.token++;
    this.paused = false;
    this.resumePending = null;
    if (this.usingFallback) this.fallback.cancel();
    this.usingFallback = false;
    if (this.audio) {
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio.pause();
    }
  }
}
