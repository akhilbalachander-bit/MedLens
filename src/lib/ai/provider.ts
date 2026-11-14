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
 * Gemini models tried in order. If one is not found (404), MedLens asks
 * Google which models this API key can use and tries the best "flash" ones,
 * so a renamed or retired model never breaks the site. The first model that
 * works after a 404 is remembered.
 */
export const GEMINI_MODELS = ["gemini-3.8-flash", "gemini-3.8-flash-lite"];
let workingGeminiModel: string | null = null;

/** Rank model ids for document work: newest version first, full before lite, stable before preview. */
export function rankGeminiModels(ids: string[]): string[] {
  const version = (id: string) => Number(/gemini-(\d+(?:\.\d+)?)/.exec(id)?.[1] ?? 0);
  return ids
    .filter((id) => /^gemini-\d/.test(id) && /flash/.test(id) && !/tts|image|audio|live|embed|native|robotics|computer|thinking-exp/.test(id))
    .sort(
      (a, b) =>
        version(b) - version(a) ||
        Number(/lite/.test(a)) - Number(/lite/.test(b)) ||
        Number(/preview|exp/.test(a)) - Number(/preview|exp/.test(b)) ||
        a.length - b.length,
    );
}

let modelList: { at: number; ids: string[] } | null = null;
/** Models this key can call with generateContent, best first (cached for an hour). */
export async function listGeminiModels(apiKey: string, signal?: AbortSignal): Promise<string[]> {
  if (modelList && Date.now() - modelList.at < 60 * 60_000) return modelList.ids;
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000", {
      headers: { "x-goog-api-key": apiKey },
      signal,
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { models?: { name?: string; supportedGenerationMethods?: string[] }[] };
    const ids = (body.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => (m.name ?? "").replace(/^models\//, ""));
    modelList = { at: Date.now(), ids: rankGeminiModels(ids) };
    return modelList.ids;
  } catch {
    return [];
  }
}

/** For tests. */
export function resetGeminiState() {
  workingGeminiModel = null;
  modelList = null;
  thinkingUnsupported = false;
}

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

  // Try the chosen model, then the others. A model that is not found (404)
  // is skipped at once, and the first 404 makes MedLens ask Google which
  // models this key has; an overloaded model gets one quick retry first.
  const queue = [model, ...GEMINI_MODELS.filter((m) => m !== model)];
  const tried = new Set<string>();
  let res: Response | null = null;
  let busy = false;
  let discovered = false;
  let onlyRetiredSkipped = true;
  while (queue.length) {
    const m = queue.shift()!;
    if (tried.has(m)) continue;
    tried.add(m);
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
      if (m !== model && onlyRetiredSkipped) workingGeminiModel = m;
      break;
    }
    if (res!.status === 404) {
      console.warn(`Gemini model ${m} is not available for this key (404)`);
      if (!discovered) {
        discovered = true;
        const available = await listGeminiModels(cfg.apiKey!, signal);
        queue.push(...available.filter((x) => !tried.has(x)).slice(0, 4));
      }
      continue;
    }
    if (transient(res!.status)) {
      busy = true;
      onlyRetiredSkipped = false;
      if (deadline - Date.now() > 20_000) continue;
    }
    break;
  }
  if (!res!.ok && busy) {
    // Report "busy" rather than a later "not found" from a fallback name.
    throw new AIError("provider_error", "The AI service is very busy right now. Please wait a moment and try again.", 503);
  }
  const body = await res!.json().catch(() => null);
  if (!res!.ok) {
    const status = res!.status;
    const msg = body?.error?.message ?? res!.statusText;
    throw new AIError(
      "provider_error",
      status === 503 || status === 429
        ? "The AI service is very busy right now. Please wait a moment and try again."
        : status === 404
          ? `No Gemini model that MedLens can use is available for this API key (tried: ${[...tried].join(", ")}). Google said: ${msg}`
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
