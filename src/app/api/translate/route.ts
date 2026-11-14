import { z } from "zod";
import { AIError, generateJson, getProviderConfig } from "@/lib/ai/provider";
import { TRANSLATE_SYSTEM, translatePrompt } from "@/lib/ai/prompts";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { errorResponse } from "@/lib/server/uploads";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

const Body = z.object({
  language: z.object({ code: z.string().min(2).max(20), name: z.string().min(2).max(60) }),
  entries: z.record(z.string(), z.string().max(4000)),
  protected: z.array(z.string().max(200)).max(100).default([]),
  /** Interface text (not document content): may be cached and shared between visitors. */
  shared: z.boolean().default(false),
});

// Shared cache for interface text only. Document content is never cached here.
const uiCache = new Map<string, string>();
const cacheKey = (lang: string, text: string) => `${lang}\u0000${text}`;

const CHUNK = 20;
const PARALLEL = 3;

/**
 * Translate the already-extracted text map (never the original document).
 * The client caches results per language for the session.
 */
export async function POST(req: Request) {
  try {
    checkRateLimit(req, "translate");
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new AIError("unsupported_file", "Invalid translation request.", 400);
    const { language, entries } = parsed.data;
    const keys = Object.keys(entries);
    if (keys.length > 600) throw new AIError("unsupported_file", "Too much text to translate at once.", 413);

    const cfg = getProviderConfig();
    if (!cfg || cfg.provider === "mock") {
      throw new AIError("provider_not_configured", "Translation needs an AI provider (GEMINI_API_KEY or OPENAI_API_KEY).", 503);
    }

    const translations: Record<string, string> = {};
    if (parsed.data.shared) {
      for (const k of [...keys]) {
        const hit = uiCache.get(cacheKey(language.code, entries[k]));
        if (hit) translations[k] = hit;
      }
    }
    const todo = keys.filter((k) => !(k in translations));

    const chunks: string[][] = [];
    for (let i = 0; i < todo.length; i += CHUNK) chunks.push(todo.slice(i, i + CHUNK));

    // Small pieces, a few at a time. A piece that fails is reported as
    // missing (the browser retries it) instead of failing everything.
    let lastError: unknown = null;
    const queue = [...chunks];
    const worker = async () => {
      for (let ks = queue.shift(); ks; ks = queue.shift()) {
        const subset = Object.fromEntries(ks.map((k) => [k, entries[k]]));
        try {
          const raw = await generateJson(cfg, {
            system: TRANSLATE_SYSTEM,
            prompt: translatePrompt(language.name, parsed.data.protected, subset),
            textOnly: true,
            temperature: 0,
            timeoutMs: 100_000,
          });
          if (raw && typeof raw === "object") {
            for (const k of ks) {
              const val = (raw as Record<string, unknown>)[k];
              if (typeof val === "string" && val.trim()) {
                translations[k] = val.trim();
                if (parsed.data.shared && uiCache.size < 50_000) uiCache.set(cacheKey(language.code, entries[k]), val.trim());
              }
            }
          }
        } catch (e) {
          lastError = e;
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, chunks.length) }, worker));
    const missing = keys.filter((k) => !(k in translations));
    if (missing.length && missing.length === todo.length && lastError) throw lastError;
    return Response.json({ language: language.code, translations, missing });
  } catch (e) {
    return errorResponse(e);
  }
}
