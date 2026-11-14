import { z } from "zod";
import { AIError, generateJson, getProviderConfig } from "@/lib/ai/provider";
import { ASSISTANT_SYSTEM } from "@/lib/ai/prompts";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { errorResponse } from "@/lib/server/uploads";
import { detectEmergency } from "@/lib/emergency";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

const Body = z.object({
  question: z.string().min(1).max(1000),
  language: z.object({ code: z.string(), name: z.string() }),
  context: z.unknown().optional(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(2000) }))
    .max(10)
    .default([]),
});

export async function POST(req: Request) {
  try {
    checkRateLimit(req, "assistant");
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new AIError("unsupported_file", "Invalid question.", 400);
    const { question, language, context, history } = parsed.data;
    const cfg = getProviderConfig();
    if (!cfg || cfg.provider === "mock") {
      throw new AIError("provider_not_configured", "The AI assistant needs an AI provider.", 503);
    }
    const ctx = JSON.stringify(context ?? null).slice(0, 40_000);
    const prompt = `Reply in: ${language.name}
Patient's document data (JSON, may be null if no document was scanned):
${ctx}

Recent conversation:
${history.map((h) => `${h.role}: ${h.text}`).join("\n") || "(none)"}

Patient's question: ${question}`;
    const raw = (await generateJson(cfg, { system: ASSISTANT_SYSTEM, prompt, textOnly: true, temperature: 0.2, timeoutMs: 25_000 })) as {
      answer?: unknown;
      urgent?: unknown;
      sources?: unknown;
    };
    const answer = typeof raw?.answer === "string" && raw.answer.trim() ? raw.answer.trim() : null;
    if (!answer) throw new AIError("invalid_response", "The assistant could not answer. Please try again.");
    return Response.json({
      answer,
      urgent: raw.urgent === true || detectEmergency(question),
      sources: Array.isArray(raw.sources) ? raw.sources.filter((s) => typeof s === "string").slice(0, 5) : [],
    });
  } catch (e) {
    return errorResponse(e);
  }
}
