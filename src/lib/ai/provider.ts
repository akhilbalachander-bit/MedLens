import "server-only";

/**
 * Reusable AI service layer. Provider and model come from environment
 * variables; nothing here is hardcoded to one vendor. Both providers are
 * called over plain HTTPS (no SDK) so swapping or adding a provider is a
 * single function.
 */

export type ProviderName = "gemini" | "openai" | "mock";

export type ProviderConfig = {
  provider: ProviderName;
  model: string;
  textModel: string;
  apiKey: string | null;
  baseUrl: string | null;
};

export type InputFile = { name: string; mimeType: string; base64: string };

export class AIError extends Error {
  constructor(
    public code:
      | "provider_not_configured"
      | "provider_error"
      | "invalid_response"
      | "unsupported_file"
      | "timeout",
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}

/**
 * Gemini models tried in order when Google reports one as not found or
 * retired (404). The first one that works is remembered.
 */
export const GEMINI_MODELS = ["gemini-3.8-flash", "gemini-3.8-flash-lite", "gemini-2.5-flash"];
let workingGeminiModel: string | null = null;

export function getProviderConfig(): ProviderConfig | null {
  const env = process.env;
  const requested = (env.AI_PROVIDER ?? "").trim().toLowerCase();
  const gemini = env.GEMINI_API_KEY?.trim() || env.GOOGLE_API_KEY?.trim() || null;
  const openai = env.OPENAI_API_KEY?.trim() || null;

  const pick: ProviderName | null =
    requested === "gemini" || requested === "openai" || requested === "mock"
      ? (requested as ProviderName)
      : gemini
        ? "gemini"
        : openai
          ? "openai"
          : null;

  if (pick === "mock") return { provider: "mock", model: "mock", textModel: "mock", apiKey: null, baseUrl: null };
  if (pick === "gemini" && gemini) {
    const model = env.GEMINI_MODEL?.trim() || workingGeminiModel || GEMINI_MODELS[0];
    return { provider: "gemini", model, textModel: env.GEMINI_TEXT_MODEL?.trim() || model, apiKey: gemini, baseUrl: null };
  }
  if (pick === "openai" && openai) {
    const model = env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
    return {
      provider: "openai",
      model,
      textModel: env.OPENAI_TEXT_MODEL?.trim() || model,
      apiKey: openai,
      baseUrl: (env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, ""),
    };
  }
  return null;
}

export function requireProvider(): ProviderConfig {
  const cfg = getProviderConfig();
  if (!cfg) {
    throw new AIError(
      "provider_not_configured",
      "No AI provider is configured. Add GEMINI_API_KEY or OPENAI_API_KEY to .env.local, or try the sample document.",
      503,
    );
  }
  return cfg;
}

/** Pull the JSON object out of a model response (tolerates code fences / preamble). */
export function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    throw new AIError("invalid_response", "The AI model returned a response that was not valid JSON.");
  }
}

type GenerateOptions = {
  system: string;
  prompt: string;
  files?: InputFile[];
  /** Use the text model (translation, assistant) instead of the vision model. */
  textOnly?: boolean;
  timeoutMs?: number;
  temperature?: number;
};

export async function generateJson(cfg: ProviderConfig, opts: GenerateOptions): Promise<unknown> {
  const controller = new AbortController();
  const deadline = Date.now() + (opts.timeoutMs ?? 55_000);
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 55_000);
  try {
    for (let attempt = 0; ; attempt++) {
      const text =
        cfg.provider === "gemini"
          ? await callGemini(cfg, opts, controller.signal, deadline)
          : cfg.provider === "openai"
            ? await callOpenAI(cfg, opts, controller.signal)
            : (() => {
                throw new AIError("provider_error", "Mock provider has no generic generation.");
              })();
      try {
        return extractJson(text);
      } catch (e) {
        // A cut-off or malformed reply: ask once more if there is time.
        if (attempt >= 1 || deadline - Date.now() < 15_000) throw e;
      }
    }
  } catch (e) {
    if (e instanceof AIError) throw e;
    if ((e as Error)?.name === "AbortError") throw new AIError("timeout", "The AI model took too long to respond. Please try again.", 504);
    throw new AIError("provider_error", `Could not reach the AI provider: ${(e as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
    });
  });

/** Gemini 3 models think before answering; "low" is much faster and plenty for extraction. */
let thinkingUnsupported = false;
const thinkingConfig = (model: string) =>
  thinkingUnsupported ? undefined : /gemini-[3-9]/.test(model) ? { thinkingLevel: "low" } : /2\.5-flash/.test(model) ? { thinkingBudget: 0 } : undefined;

/** Overloaded (503), rate-limited (429) or server error: worth retrying or switching model. */
const transient = (status: number) => status === 429 || status === 500 || status === 502 || status === 503 || status === 504;

async function callGemini(cfg: ProviderConfig, opts: GenerateOptions, signal: AbortSignal, deadline: number) {
  const model = opts.textOnly ? cfg.textModel : cfg.model;
  const parts: unknown[] = (opts.files ?? []).map((f) => ({ inline_data: { mime_type: f.mimeType, data: f.base64 } }));
  parts.push({ text: opts.prompt });
  const call = (m: string) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": cfg.apiKey! },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: opts.temperature ?? 0.1,
          ...(thinkingConfig(m) ? { thinkingConfig: thinkingConfig(m) } : {}),
        },
      }),
    });

  // Try the chosen model, then the others. A retired model (404) is skipped
  // at once; an overloaded one gets one quick retry before moving on.
  const models = [model, ...GEMINI_MODELS.filter((m) => m !== model)];
  let res: Response | null = null;
  let onlyRetiredSkipped = true;
  for (let i = 0; i < models.length; i++) {
    const m = models[i];
    for (let attempt = 0; attempt < 2; attempt++) {
      res = await call(m);
      if (res.status === 400 && !thinkingUnsupported && thinkingConfig(m)) {
        const text = await res.clone().text();
        if (/thinking/i.test(text)) {
          thinkingUnsupported = true;
          res = await call(m);
        }
      }
      if (!transient(res.status)) break;
      const wait = 1500 * (attempt + 1);
      if (attempt === 0 && deadline - Date.now() > wait + 20_000) {
        console.warn(`Gemini ${m} returned ${res.status}; retrying in ${wait} ms`);
        await sleep(wait, signal);
      } else break;
    }
    if (res!.ok) {
      // Remember a replacement only when the earlier models are gone for good.
      if (i > 0 && onlyRetiredSkipped) workingGeminiModel = m;
      break;
    }
    if (res!.status === 404) {
      if (i + 1 < models.length) console.warn(`Gemini model ${m} unavailable (404); trying ${models[i + 1]}`);
      continue;
    }
    if (transient(res!.status) && i + 1 < models.length && deadline - Date.now() > 20_000) {
      onlyRetiredSkipped = false;
      console.warn(`Gemini ${m} still returning ${res!.status}; trying ${models[i + 1]}`);
      continue;
    }
    break;
  }
  const body = await res!.json().catch(() => null);
  if (!res!.ok) {
    const status = res!.status;
    const msg = body?.error?.message ?? res!.statusText;
    throw new AIError(
      "provider_error",
      status === 503 || status === 429
        ? "The AI service is very busy right now. Please wait a moment and try again."
        : `Gemini error (${status}): ${msg}`,
      status === 429 ? 429 : status === 503 ? 503 : 502,
    );
  }
  const candidate = body?.candidates?.[0];
  const text = candidate?.content?.parts?.filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  if (!text) {
    const reason = candidate?.finishReason ?? body?.promptFeedback?.blockReason ?? "empty response";
    throw new AIError("invalid_response", `Gemini returned no content (${reason}).`);
  }
  return text;
}

async function callOpenAI(cfg: ProviderConfig, opts: GenerateOptions, signal: AbortSignal) {
  const model = opts.textOnly ? cfg.textModel : cfg.model;
  const content: unknown[] = (opts.files ?? []).map((f) =>
    f.mimeType === "application/pdf"
      ? { type: "file", file: { filename: f.name || "document.pdf", file_data: `data:application/pdf;base64,${f.base64}` } }
      : { type: "image_url", image_url: { url: `data:${f.mimeType};base64,${f.base64}`, detail: "high" } },
  );
  content.push({ type: "text", text: opts.prompt });
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({
      model,
      temperature: opts.temperature ?? 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content },
      ],
    }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body?.error?.message ?? res.statusText;
    throw new AIError("provider_error", `OpenAI error (${res.status}): ${msg}`, res.status === 429 ? 429 : 502);
  }
  const text = body?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new AIError("invalid_response", "OpenAI returned no content.");
  return text;
}
