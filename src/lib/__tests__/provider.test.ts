import { afterEach, describe, expect, it, vi } from "vitest";
import { generateJson, getProviderConfig } from "../ai/provider";

afterEach(() => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_MODEL;
  vi.unstubAllGlobals();
});

const ok = (json: unknown) => Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(json) }] } }] });
const retired = () =>
  new Response(JSON.stringify({ error: { message: "This model models/gemini-2.5-flash is no longer available to new users." } }), { status: 404 });

describe("Gemini provider", () => {
  it("defaults to a current model", () => {
    process.env.GEMINI_API_KEY = "k";
    expect(getProviderConfig()?.model).toBe("gemini-3.8-flash");
  });

  it("moves on to the next model when Google says one is retired", async () => {
    process.env.GEMINI_API_KEY = "k";
    process.env.GEMINI_MODEL = "gemini-2.5-flash"; // e.g. an old value left in Vercel settings
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        urls.push(/models\/([^:]+)/.exec(url)![1]);
        return url.includes("2.5") ? retired() : ok({ hello: "world" });
      }),
    );
    const out = await generateJson(getProviderConfig()!, { system: "s", prompt: "p" });
    expect(out).toEqual({ hello: "world" });
    expect(urls).toEqual(["gemini-2.5-flash", "gemini-3.8-flash"]);
  });

  it("still reports a clear error when every model fails", async () => {
    process.env.GEMINI_API_KEY = "k";
    vi.stubGlobal("fetch", vi.fn(async () => retired()));
    await expect(generateJson(getProviderConfig()!, { system: "s", prompt: "p" })).rejects.toThrow(/Gemini error \(404\)/);
  });
});

describe("Gemini resilience", () => {
  const busy = () => new Response(JSON.stringify({ error: { message: "This model is currently experiencing high demand." } }), { status: 503 });

  it("retries a busy model once, then succeeds", async () => {
    process.env.GEMINI_API_KEY = "k";
    let n = 0;
    vi.stubGlobal("fetch", vi.fn(async () => (++n === 1 ? busy() : ok({ fine: true }))));
    expect(await generateJson(getProviderConfig()!, { system: "s", prompt: "p", timeoutMs: 120_000 })).toEqual({ fine: true });
    expect(n).toBe(2);
  });

  it("moves to a lighter model when one stays busy", async () => {
    process.env.GEMINI_API_KEY = "k";
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        urls.push(/models\/([^:]+)/.exec(url)![1]);
        return url.includes("flash-lite") ? ok({ lite: true }) : busy();
      }),
    );
    expect(await generateJson(getProviderConfig()!, { system: "s", prompt: "p", timeoutMs: 120_000 })).toEqual({ lite: true });
    expect(urls).toEqual(["gemini-3.8-flash", "gemini-3.8-flash", "gemini-3.8-flash-lite"]);
    // a busy model is not "retired": the next request starts with the preferred model again
    expect(getProviderConfig()!.model).toBe("gemini-3.8-flash");
  });

  it("gives a plain-language message when everything is busy", async () => {
    process.env.GEMINI_API_KEY = "k";
    vi.stubGlobal("fetch", vi.fn(async () => busy()));
    await expect(generateJson(getProviderConfig()!, { system: "s", prompt: "p", timeoutMs: 60_000 })).rejects.toMatchObject({
      status: 503,
      message: expect.stringMatching(/very busy/),
    });
  });

  it("asks Gemini 3 models to think less, and drops that if a model rejects it", async () => {
    process.env.GEMINI_API_KEY = "k";
    const bodies: { generationConfig: { thinkingConfig?: unknown } }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: string, init: RequestInit) => {
        const b = JSON.parse(String(init.body));
        bodies.push(b);
        return b.generationConfig.thinkingConfig
          ? new Response(JSON.stringify({ error: { message: "Unknown field thinkingLevel" } }), { status: 400 })
          : ok({ ok: 1 });
      }),
    );
    expect(await generateJson(getProviderConfig()!, { system: "s", prompt: "p" })).toEqual({ ok: 1 });
    expect(bodies[0].generationConfig.thinkingConfig).toEqual({ thinkingLevel: "low" });
    expect(bodies[1].generationConfig.thinkingConfig).toBeUndefined();
  });
});
