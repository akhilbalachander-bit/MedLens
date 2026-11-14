import { generateJson, getProviderConfig, listGeminiModels } from "@/lib/ai/provider";
import { getTtsConfig } from "@/lib/tts/server";
import { maxFileBytes, maxFiles } from "@/lib/files";
import { checkRateLimit } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Non-secret runtime configuration for the UI (never returns keys).
 * `?check=1` also runs one tiny test request and lists the Gemini models this
 * key can use, to diagnose setup problems from a browser.
 */
export async function GET(req: Request) {
  const cfg = getProviderConfig();
  const tts = getTtsConfig();
  const base = {
    configured: !!cfg && cfg.provider !== "mock",
    provider: cfg?.provider ?? null,
    model: cfg?.model ?? null,
    maxFileMb: Math.round(maxFileBytes() / 1048576),
    maxFiles: maxFiles(),
    tts: tts ? { provider: tts.provider } : null,
  };
  if (new URL(req.url).searchParams.get("check") !== "1" || !cfg || cfg.provider === "mock") return Response.json(base);

  try {
    checkRateLimit(req, "assistant");
  } catch {
    return Response.json({ ...base, check: { ok: false, error: "Too many checks. Try again later." } }, { status: 429 });
  }
  const availableModels = cfg.provider === "gemini" ? (await listGeminiModels(cfg.apiKey!)).slice(0, 12) : undefined;
  const started = Date.now();
  try {
    await generateJson(cfg, { system: 'Reply with the JSON {"ok": true}.', prompt: "ping", textOnly: true, timeoutMs: 45_000 });
    return Response.json({
      ...base,
      check: { ok: true, model: getProviderConfig()?.textModel ?? null, seconds: Math.round((Date.now() - started) / 100) / 10 },
      availableModels,
    });
  } catch (e) {
    return Response.json({ ...base, check: { ok: false, error: (e as Error).message }, availableModels });
  }
}
