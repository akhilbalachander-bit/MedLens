import type { Language } from "../languages";
import { chunkText, type SpeakOptions, type SpeechEngine, type SpeechVoice } from "./engine";

/** Locale sent to the cloud voice service. */
export function ttsLocale(lang: Language): string {
  return lang.ttsLocale ?? lang.speech;
}

/**
 * Group sentences into fewer, larger requests. The first group stays short so
 * audio starts quickly; later ones are fetched while earlier ones play.
 */
export function packChunks(sentences: string[], first = 160, rest = 600): string[] {
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    const limit = out.length === 0 ? first : rest;
    if (cur && (cur + " " + s).length > limit) {
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
    const p = fetch("/api/tts", {
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

    const failedAt = this.failedLocales.get(locale);
    if (failedAt && Date.now() - failedAt < 5 * 60_000) {
      this.handOff(chunks.join(" "), opts, null);
      return;
    }

    // Unlock audio playback inside the tap that started it (iOS Safari).
    this.silent ??= silentWav();
    audio.src = this.silent;
    audio.play().catch(() => {});

    let started = false;
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
        if (status !== 429) this.failedLocales.set(locale, Date.now());
        this.handOff(chunks.slice(i).join(" "), opts, (e as Error).message, started);
        return;
      }
      if (my !== this.token) return;
      if (i + 1 < chunks.length) void this.fetchChunk(chunks[i + 1], opts.lang).catch(() => {});
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
    void playAt(0);
  }

  private handOff(rest: string, opts: SpeakOptions, reason: string | null, started = false) {
    this.usingFallback = true;
    if (reason) opts.onNotice?.(`Online ${opts.lang.name} voice unavailable (${reason}). Using this device's voice instead.`);
    else opts.onNotice?.(`Online ${opts.lang.name} voice is unavailable right now. Using this device's voice instead.`);
    this.fallback.speak(rest, { ...opts, onStart: started ? undefined : opts.onStart, voiceId: null });
  }

  pause() {
    if (this.usingFallback) this.fallback.pause();
    else this.audio?.pause();
  }
  resume() {
    if (this.usingFallback) this.fallback.resume();
    else void this.audio?.play().catch(() => {});
  }
  cancel() {
    this.token++;
    if (this.usingFallback) this.fallback.cancel();
    this.usingFallback = false;
    if (this.audio) {
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio.pause();
    }
  }
}
