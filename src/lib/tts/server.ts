import "server-only";
import { createHash } from "node:crypto";
import { AIError } from "@/lib/ai/provider";

/**
 * Cloud text-to-speech. Natural voices for every language, independent of
 * which voices the user's phone or browser happens to have installed.
 *
 *   google  Google Cloud Text-to-Speech (best language coverage, deterministic)
 *   gemini  Gemini TTS model (same key as document analysis)
 *   openai  OpenAI speech endpoint
 *
 * Picked by TTS_PROVIDER, or automatically from whichever key exists.
 */
export type TtsProvider = "google" | "gemini" | "openai";
export type TtsConfig = { provider: TtsProvider; apiKey: string; model: string | null; voice: string | null; baseUrl: string | null };

export function getTtsConfig(): TtsConfig | null {
  const env = process.env;
  const requested = (env.TTS_PROVIDER ?? "").trim().toLowerCase();
  if (requested === "browser" || requested === "none" || requested === "off") return null;

  const googleKey = env.GOOGLE_TTS_API_KEY?.trim() || null;
  const geminiKey = env.GEMINI_API_KEY?.trim() || env.GOOGLE_API_KEY?.trim() || null;
  const openaiKey = env.OPENAI_API_KEY?.trim() || null;
  const openaiBase = (env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");

  const google = (): TtsConfig | null =>
    googleKey ? { provider: "google", apiKey: googleKey, model: null, voice: env.GOOGLE_TTS_VOICE?.trim() ?? "Chirp3-HD-Kore", baseUrl: null } : null;
  const gemini = (): TtsConfig | null =>
    geminiKey
      ? { provider: "gemini", apiKey: geminiKey, model: env.GEMINI_TTS_MODEL?.trim() || workingGeminiModel || GEMINI_TTS_MODELS[0], voice: env.GEMINI_TTS_VOICE?.trim() || "Kore", baseUrl: null }
      : null;
  const openai = (): TtsConfig | null =>
    openaiKey
      ? { provider: "openai", apiKey: openaiKey, model: env.OPENAI_TTS_MODEL?.trim() || "gpt-4o-mini-tts", voice: env.OPENAI_TTS_VOICE?.trim() || "coral", baseUrl: openaiBase }
      : null;

  if (requested === "google") return google();
  if (requested === "gemini") return gemini();
  if (requested === "openai") return openai();
  return google() ?? gemini() ?? openai();
}

/** Tried in order when a model is not found (names change between releases). */
let workingGeminiModel: string | null = null;
export const GEMINI_TTS_MODELS = ["gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts", "gemini-2.5-flash-preview-tts"];

export type Synthesized = { audio: Buffer; mimeType: string };

// Small in-memory cache: the same instructions are often replayed.
const cache = new Map<string, Synthesized>();
let cacheBytes = 0;
const CACHE_LIMIT = 40 * 1024 * 1024;

export async function synthesize(cfg: TtsConfig, text: string, locale: string, languageName: string): Promise<Synthesized> {
  const key = createHash("sha256").update([cfg.provider, cfg.model, cfg.voice, locale, text].join("\u0000")).digest("hex");
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  let out: Synthesized;
  try {
    out =
      cfg.provider === "google"
        ? await googleTts(cfg, text, locale, controller.signal)
        : cfg.provider === "gemini"
          ? await geminiTts(cfg, text, languageName, controller.signal)
          : await openaiTts(cfg, text, languageName, controller.signal);
  } catch (e) {
    if (e instanceof AIError) throw e;
    if ((e as Error)?.name === "AbortError") throw new AIError("timeout", "The voice service took too long to respond.", 504);
    throw new AIError("provider_error", `Could not reach the voice service: ${(e as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
  cache.set(key, out);
  cacheBytes += out.audio.length;
  for (const [k, v] of cache) {
    if (cacheBytes <= CACHE_LIMIT) break;
    cache.delete(k);
    cacheBytes -= v.audio.length;
  }
  return out;
}

async function failure(res: Response, who: string): Promise<never> {
  const body = await res.json().catch(() => null);
  const msg = body?.error?.message ?? res.statusText;
  throw new AIError("provider_error", `${who} voice error (${res.status}): ${msg}`, res.status === 429 ? 429 : 502);
}

async function googleTts(cfg: TtsConfig, text: string, locale: string, signal: AbortSignal): Promise<Synthesized> {
  const call = (voice: Record<string, string>) =>
    fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": cfg.apiKey },
      body: JSON.stringify({ input: { text }, voice, audioConfig: { audioEncoding: "MP3" } }),
    });
  // Prefer the configured high-quality voice family; not every locale has
  // it, so fall back to Google's default voice for the locale.
  let res = cfg.voice ? await call({ languageCode: locale, name: `${locale}-${cfg.voice}` }) : null;
  if (!res || res.status === 400 || res.status === 404) res = await call({ languageCode: locale });
  if (!res.ok) await failure(res, "Google");
  const body = (await res.json()) as { audioContent?: string };
  if (!body.audioContent) throw new AIError("invalid_response", "Google returned no audio.");
  return { audio: Buffer.from(body.audioContent, "base64"), mimeType: "audio/mpeg" };
}

async function geminiTts(cfg: TtsConfig, text: string, languageName: string, signal: AbortSignal): Promise<Synthesized> {
  const call = (model: string) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": cfg.apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `Read aloud in ${languageName}, in a calm, clear and warm voice: ${text}` }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: cfg.voice } } },
        },
      }),
    });
  const models = [cfg.model!, ...GEMINI_TTS_MODELS.filter((m) => m !== cfg.model)];
  let res = await call(models[0]);
  for (let i = 1; i < models.length && res.status === 404; i++) {
    res = await call(models[i]);
    if (res.ok) cfg.model = workingGeminiModel = models[i]; // remember it for later requests
  }
  if (!res.ok) await failure(res, "Gemini");
  const body = await res.json();
  const part = body?.candidates?.[0]?.content?.parts?.find((p: { inlineData?: unknown }) => p.inlineData);
  const data: string | undefined = part?.inlineData?.data;
  if (!data) throw new AIError("invalid_response", "Gemini returned no audio.");
  const mime: string = part.inlineData.mimeType ?? "audio/L16;rate=24000";
  if (/wav|mpeg|mp3|ogg/.test(mime)) return { audio: Buffer.from(data, "base64"), mimeType: mime };
  const rate = Number(/rate=(\d+)/.exec(mime)?.[1] ?? 24000);
  return { audio: pcmToWav(Buffer.from(data, "base64"), rate), mimeType: "audio/wav" };
}

async function openaiTts(cfg: TtsConfig, text: string, languageName: string, signal: AbortSignal): Promise<Synthesized> {
  const res = await fetch(`${cfg.baseUrl}/audio/speech`, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({
      model: cfg.model,
      voice: cfg.voice,
      input: text,
      response_format: "mp3",
      instructions: `Speak in ${languageName} with native pronunciation, in a calm, clear and warm voice. Read the text exactly as written.`,
    }),
  });
  if (!res.ok) await failure(res, "OpenAI");
  return { audio: Buffer.from(await res.arrayBuffer()), mimeType: "audio/mpeg" };
}

/** Wrap raw 16-bit little-endian mono PCM in a WAV header. */
export function pcmToWav(pcm: Buffer, sampleRate: number, channels = 1): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * 2;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
