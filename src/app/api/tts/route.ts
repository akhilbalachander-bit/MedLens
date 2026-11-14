import { z } from "zod";
import { AIError } from "@/lib/ai/provider";
import { errorResponse } from "@/lib/server/uploads";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { getTtsConfig, synthesize } from "@/lib/tts/server";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const Body = z.object({
  text: z.string().trim().min(1).max(1500),
  locale: z.string().regex(/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/),
  languageName: z.string().min(2).max(60),
});

/** Turn one short passage into speech audio. The client splits long text. */
export async function POST(req: Request) {
  try {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new AIError("unsupported_file", "Invalid read-aloud request.", 400);
    const cfg = getTtsConfig();
    if (!cfg) throw new AIError("provider_not_configured", "No online voice service is configured.", 503);
    checkRateLimit(req, "tts");
    const { text, locale, languageName } = parsed.data;
    const { audio, mimeType } = await synthesize(cfg, text, locale, languageName);
    return new Response(new Uint8Array(audio), {
      headers: { "Content-Type": mimeType, "Cache-Control": "private, max-age=3600", "Content-Length": String(audio.length) },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
