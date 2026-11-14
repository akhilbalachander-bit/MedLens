import { z } from "zod";
import { AIError, generateJson, getProviderConfig } from "@/lib/ai/provider";
import { TRANSLATE_SYSTEM, translatePrompt } from "@/lib/ai/prompts";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { errorResponse } from "@/lib/server/uploads";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const Body = z.object({
  language: z.object({ code: z.string().min(2).max(20), name: z.string().min(2).max(60) }),
  entries: z.record(z.string(), z.string().max(4000)),
  protected: z.array(z.string().max(200)).max(100).default([]),
});

const CHUNK = 60;

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

    const chunks: string[][] = [];
    for (let i = 0; i < keys.length; i += CHUNK) chunks.push(keys.slice(i, i + CHUNK));

    const results = await Promise.all(
      chunks.map(async (ks) => {
        const subset = Object.fromEntries(ks.map((k) => [k, entries[k]]));
        const raw = await generateJson(cfg, {
          system: TRANSLATE_SYSTEM,
          prompt: translatePrompt(language.name, parsed.data.protected, subset),
          textOnly: true,
          temperature: 0,
        });
        const out: Record<string, string> = {};
        if (raw && typeof raw === "object") {
          for (const k of ks) {
            const val = (raw as Record<string, unknown>)[k];
            if (typeof val === "string" && val.trim()) out[k] = val.trim();
          }
        }
        return out;
      }),
    );
    const translations = Object.assign({}, ...results) as Record<string, string>;
    const missing = keys.filter((k) => !(k in translations));
    return Response.json({ language: language.code, translations, missing });
  } catch (e) {
    return errorResponse(e);
  }
}
