import { afterEach, describe, expect, it, vi } from "vitest";
import { generateJson, getProviderConfig, rankGeminiModels, resetGeminiState } from "../ai/provider";

afterEach(() => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_MODEL;
  vi.unstubAllGlobals();
  resetGeminiState();
});

const ok = (json: unknown) => Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(json) }] } }] });
const err = (status: number, message: string) => new Response(JSON.stringify({ error: { message } }), { status });
const retired = (m = "gemini-2.5-flash") => err(404, `This model models/${m} is no longer available to new users.`);
const busy = () => err(503, "This model is currently experiencing high demand.");

/** Fake Google: `models` answers the model list, `gen` answers generateContent per model. */
function fakeGoogle(gen: (model: string, body: { generationConfig: { thinkingConfig?: unknown } }) => Response, models: string[] = []) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (/\/models\?/.test(url)) {
        calls.push("LIST");
        return Response.json({ models: models.map((m) => ({ name: `models/${m}`, supportedGenerationMethods: ["generateContent"] })) });
      }
      const model = /models\/([^:]+):/.exec(url)![1];
      calls.push(model);
      return gen(model, JSON.parse(String(init?.body)));
    }),
  );
  return calls;
}

describe("Gemini model choice", () => {
  it("defaults to a current model", () => {
    process.env.GEMINI_API_KEY = "k";
    expect(getProviderConfig()?.model).toBe("gemini-3.8-flash");
  });

  it("moves on when a configured model is retired (e.g. an old GEMINI_MODEL left in Vercel)", async () => {
    process.env.GEMINI_API_KEY = "k";
    process.env.GEMINI_MODEL = "gemini-2.5-flash";
    const calls = fakeGoogle((m) => (m.includes("2.5") ? retired() : ok({ hello: "world" })));
    expect(await generateJson(getProviderConfig()!, { system: "s", prompt: "p" })).toEqual({ hello: "world" });
    expect(calls).toEqual(["gemini-2.5-flash", "LIST", "gemini-3.8-flash"]);
  });

  it("asks Google which models the key has when the built-in names are not found, and remembers the one that works", async () => {
    process.env.GEMINI_API_KEY = "k";
    const calls = fakeGoogle(
      (m) => (m === "gemini-4.1-flash" ? ok({ found: true }) : retired(m)),
      ["gemini-2.0-flash", "gemini-4.1-flash-preview", "gemini-4.1-flash", "gemini-4.1-flash-lite", "gemini-4.1-flash-tts", "text-embedding-005"],
    );
    expect(await generateJson(getProviderConfig()!, { system: "s", prompt: "p" })).toEqual({ found: true });
    expect(calls).toEqual(["gemini-3.8-flash", "LIST", "gemini-3.8-flash-lite", "gemini-4.1-flash"]);
    expect(getProviderConfig()!.model).toBe("gemini-4.1-flash");
  });

  it("explains clearly when no usable model exists for the key", async () => {
    process.env.GEMINI_API_KEY = "k";
    fakeGoogle((m) => retired(m));
    await expect(generateJson(getProviderConfig()!, { system: "s", prompt: "p" })).rejects.toThrow(/No Gemini model that MedLens can use/);
  });
});

describe("rankGeminiModels", () => {
  it("prefers the newest full flash model, then lite, and skips voice/image/embedding models", () => {
    expect(
      rankGeminiModels(["gemini-2.0-flash", "gemini-3.8-flash-lite", "gemini-3.8-flash", "gemini-3.8-flash-tts", "gemini-3.8-pro", "gemini-3.9-flash-preview", "text-embedding-005"]),
    ).toEqual(["gemini-3.9-flash-preview", "gemini-3.8-flash", "gemini-3.8-flash-lite", "gemini-2.0-flash"]);
  });
});

describe("Gemini resilience", () => {
  it("retries a busy model once, then succeeds", async () => {
    process.env.GEMINI_API_KEY = "k";
    let n = 0;
    fakeGoogle(() => (++n === 1 ? busy() : ok({ fine: true })));
    expect(await generateJson(getProviderConfig()!, { system: "s", prompt: "p", timeoutMs: 120_000 })).toEqual({ fine: true });
    expect(n).toBe(2);
  });

  it("moves to a lighter model when one stays busy, without treating it as retired", async () => {
    process.env.GEMINI_API_KEY = "k";
    const calls = fakeGoogle((m) => (m.includes("lite") ? ok({ lite: true }) : busy()));
    expect(await generateJson(getProviderConfig()!, { system: "s", prompt: "p", timeoutMs: 120_000 })).toEqual({ lite: true });
    expect(calls).toEqual(["gemini-3.8-flash", "gemini-3.8-flash", "gemini-3.8-flash-lite"]);
    expect(getProviderConfig()!.model).toBe("gemini-3.8-flash");
  });

  it("reports 'busy', not a misleading 'not found', when the main model is busy and fallbacks are missing (bug 5)", async () => {
    process.env.GEMINI_API_KEY = "k";
    fakeGoogle((m) => (m === "gemini-3.8-flash" ? busy() : retired(m)));
    await expect(generateJson(getProviderConfig()!, { system: "s", prompt: "p", timeoutMs: 120_000 })).rejects.toMatchObject({
      status: 503,
      message: expect.stringMatching(/very busy/),
    });
  });

  it("asks Gemini 3 models to think less, and drops that if a model rejects it", async () => {
    process.env.GEMINI_API_KEY = "k";
    const seen: unknown[] = [];
    fakeGoogle((_m, body) => {
      seen.push(body.generationConfig.thinkingConfig);
      return body.generationConfig.thinkingConfig ? err(400, "Unknown field thinkingLevel") : ok({ ok: 1 });
    });
    expect(await generateJson(getProviderConfig()!, { system: "s", prompt: "p" })).toEqual({ ok: 1 });
    expect(seen).toEqual([{ thinkingLevel: "low" }, undefined]);
  });
});
