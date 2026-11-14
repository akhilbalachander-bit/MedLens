import { AIError, generateJson, getProviderConfig } from "@/lib/ai/provider";
import { ANALYSIS_SYSTEM, analysisPrompt } from "@/lib/ai/prompts";
import { AnalysisSchema, normalizeAnalysis, type AnalysisResult } from "@/lib/schema";
import { errorResponse, readUploads } from "@/lib/server/uploads";
import { sampleResult } from "@/lib/sample/discharge";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * The ONE primary analysis request. Receives the document pages, validates
 * them, sends them to the configured vision model in a single call, validates
 * the JSON against the schema and returns it. Uploaded files are processed in
 * memory only and are not stored.
 */
export async function POST(req: Request) {
  try {
    const cfg = getProviderConfig();
    const form = await req.formData().catch(() => {
      throw new AIError("unsupported_file", "Upload could not be read. Please try again.", 400);
    });
    const files = await readUploads(form, cfg?.provider ?? null);

    if (!cfg) {
      throw new AIError(
        "provider_not_configured",
        "Document analysis needs an AI provider. Add GEMINI_API_KEY or OPENAI_API_KEY to .env.local and restart, or try the sample document.",
        503,
      );
    }
    if (cfg.provider === "mock") {
      return Response.json(sampleResult("mock", files.map((f) => f.name)));
    }

    const raw = await generateJson(cfg, {
      system: ANALYSIS_SYSTEM,
      prompt: analysisPrompt(files.length),
      files,
      timeoutMs: 55_000,
    });
    const parsed = AnalysisSchema.safeParse(raw);
    if (!parsed.success) {
      throw new AIError("invalid_response", "The AI response did not match the expected format. Please try again.");
    }
    const result: AnalysisResult = {
      ...normalizeAnalysis(parsed.data),
      meta: {
        source: "ai",
        provider: cfg.provider,
        model: cfg.model,
        analyzed_at: new Date().toISOString(),
        page_count: files.length,
        file_names: files.map((f) => f.name),
      },
    };
    return Response.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
