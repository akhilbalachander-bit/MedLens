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
