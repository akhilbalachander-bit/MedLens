import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTtsConfig, pcmToWav, synthesize } from "../tts/server";

const KEYS = ["TTS_PROVIDER", "GOOGLE_TTS_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY", "OPENAI_API_KEY", "GOOGLE_TTS_VOICE"];
let saved: Record<string, string | undefined>;
beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
});
afterEach(() => {
  for (const k of KEYS) (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]));
  vi.unstubAllGlobals();
});

describe("getTtsConfig", () => {
  it("is off without any key", () => expect(getTtsConfig()).toBeNull());
  it("prefers Google Cloud TTS, then Gemini, then OpenAI", () => {
    process.env.OPENAI_API_KEY = "o";
    expect(getTtsConfig()?.provider).toBe("openai");
    process.env.GEMINI_API_KEY = "g";
    expect(getTtsConfig()?.provider).toBe("gemini");
    process.env.GOOGLE_TTS_API_KEY = "t";
    expect(getTtsConfig()?.provider).toBe("google");
  });
  it("can be forced or turned off", () => {
    process.env.GEMINI_API_KEY = "g";
    process.env.GOOGLE_TTS_API_KEY = "t";
    process.env.TTS_PROVIDER = "gemini";
    expect(getTtsConfig()?.provider).toBe("gemini");
    process.env.TTS_PROVIDER = "browser";
    expect(getTtsConfig()).toBeNull();
  });
});

describe("pcmToWav", () => {
  it("writes a valid 16-bit mono WAV header", () => {
    const wav = pcmToWav(Buffer.alloc(100), 24000);
    expect(wav.length).toBe(144);
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
    expect(wav.readUInt32LE(24)).toBe(24000);
    expect(wav.readUInt32LE(40)).toBe(100);
  });
});

describe("synthesize", () => {
  it("Google: retries with the locale's default voice when the preferred voice does not exist", async () => {
    process.env.GOOGLE_TTS_API_KEY = "t";
    const calls: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body));
        calls.push(body.voice);
        if (body.voice.name) return new Response(JSON.stringify({ error: { message: "no such voice" } }), { status: 400 });
        return Response.json({ audioContent: Buffer.from("mp3data").toString("base64") });
      }),
    );
    const out = await synthesize(getTtsConfig()!, "வணக்கம் unique-1", "ta-IN", "Tamil");
    expect(calls).toEqual([{ languageCode: "ta-IN", name: "ta-IN-Chirp3-HD-Kore" }, { languageCode: "ta-IN" }]);
    expect(out.mimeType).toBe("audio/mpeg");
    expect(out.audio.toString()).toBe("mp3data");
  });

  it("Gemini: wraps returned PCM as WAV and names the language", async () => {
    process.env.GEMINI_API_KEY = "g";
    let prompt = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        prompt = JSON.parse(String(init.body)).contents[0].parts[0].text;
        return Response.json({
          candidates: [{ content: { parts: [{ inlineData: { mimeType: "audio/L16;codec=pcm;rate=24000", data: Buffer.alloc(10).toString("base64") } }] } }],
        });
      }),
    );
    const out = await synthesize(getTtsConfig()!, "Hallo unique-2", "de-DE", "German");
    expect(prompt).toContain("German");
    expect(prompt).toContain("Hallo unique-2");
    expect(out.mimeType).toBe("audio/wav");
    expect(out.audio.length).toBe(54);
  });

  it("caches repeated text", async () => {
    process.env.GOOGLE_TTS_API_KEY = "t";
    process.env.GOOGLE_TTS_VOICE = "";
    const f = vi.fn(async () => Response.json({ audioContent: "AAAA" }));
    vi.stubGlobal("fetch", f);
    const cfg = getTtsConfig()!;
    await synthesize(cfg, "same text unique-3", "hi-IN", "Hindi");
    await synthesize(cfg, "same text unique-3", "hi-IN", "Hindi");
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("reports provider errors", async () => {
    process.env.OPENAI_API_KEY = "o";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: { message: "quota" } }), { status: 429 })));
    await expect(synthesize(getTtsConfig()!, "x unique-4", "en-US", "English")).rejects.toMatchObject({ status: 429 });
  });
});

describe("packChunks", async () => {
  const { packChunks } = await import("../speech/cloud");
  it("keeps the first chunk short and packs the rest, without losing text", () => {
    const sentences = Array.from({ length: 30 }, (_, i) => `Sentence number ${i} is here.`);
    const out = packChunks(sentences);
    expect(out[0].length).toBeLessThanOrEqual(160);
    expect(out.length).toBeLessThan(10);
    for (const c of out.slice(1)) expect(c.length).toBeLessThanOrEqual(600);
    expect(out.join(" ")).toBe(sentences.join(" "));
  });
});
