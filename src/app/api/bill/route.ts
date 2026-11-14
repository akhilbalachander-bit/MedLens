import { AIError, generateJson, getProviderConfig } from "@/lib/ai/provider";
import { BILL_SYSTEM, billPrompt } from "@/lib/ai/prompts";
import { BillAnalysisSchema, normalizeBill, type BillAnalysisResult } from "@/lib/bill-schema";
import { errorResponse, readUploads } from "@/lib/server/uploads";
import { sampleBillResult } from "@/lib/sample/bill";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Hospital Bill Auditor: one vision call per uploaded bill. Not stored. */
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
        "Bill analysis needs an AI provider. Add GEMINI_API_KEY or OPENAI_API_KEY, or try the sample bill.",
        503,
      );
    }
    if (cfg.provider === "mock") return Response.json(sampleBillResult("mock"));

    const raw = await generateJson(cfg, { system: BILL_SYSTEM, prompt: billPrompt(files.length), files });
    const parsed = BillAnalysisSchema.safeParse(raw);
    if (!parsed.success) throw new AIError("invalid_response", "The AI response did not match the expected bill format.");
    const result: BillAnalysisResult = {
      ...normalizeBill(parsed.data),
      meta: { source: "ai", provider: cfg.provider, analyzed_at: new Date().toISOString() },
    };
    return Response.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
