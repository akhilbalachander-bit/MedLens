import { getProviderConfig } from "@/lib/ai/provider";
import { getTtsConfig } from "@/lib/tts/server";
import { maxFileBytes, maxFiles } from "@/lib/files";

export const dynamic = "force-dynamic";

/** Non-secret runtime configuration for the UI (never returns keys). */
export async function GET() {
  const cfg = getProviderConfig();
  const tts = getTtsConfig();
  return Response.json({
    configured: !!cfg && cfg.provider !== "mock",
    provider: cfg?.provider ?? null,
    model: cfg?.model ?? null,
    maxFileMb: Math.round(maxFileBytes() / 1048576),
    maxFiles: maxFiles(),
    tts: tts ? { provider: tts.provider } : null,
  });
}
