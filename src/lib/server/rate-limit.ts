import "server-only";
import { AIError } from "@/lib/ai/provider";

/**
 * Best-effort per-IP rate limit for the public site, so one visitor cannot
 * burn through the API budget. In-memory: each server instance counts on its
 * own, so also set a spending cap with your AI provider.
 *
 * Scale every limit with RATE_LIMIT_MULTIPLIER (e.g. 2 = twice as generous,
 * 0 = disabled).
 */
const LIMITS = {
  analyze: { max: 20, windowMs: 60 * 60_000 },
  bill: { max: 20, windowMs: 60 * 60_000 },
  translate: { max: 150, windowMs: 60 * 60_000 },
  assistant: { max: 60, windowMs: 60 * 60_000 },
  tts: { max: 400, windowMs: 60 * 60_000 },
} as const;
export type Bucket = keyof typeof LIMITS;

const hits = new Map<string, number[]>();

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "local").trim();
}

export function checkRateLimit(req: Request, bucket: Bucket, now = Date.now()): void {
  const mult = Number(process.env.RATE_LIMIT_MULTIPLIER ?? "1");
  if (!Number.isFinite(mult) || mult <= 0) return;
  const { max, windowMs } = LIMITS[bucket];
  const limit = Math.max(1, Math.round(max * mult));
  const key = `${bucket}:${clientIp(req)}`;
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    const waitMin = Math.ceil((windowMs - (now - recent[0])) / 60_000);
    hits.set(key, recent);
    throw new AIError(
      "provider_error",
      `You've reached the limit for this feature. Please try again in about ${waitMin} minute${waitMin === 1 ? "" : "s"}.`,
      429,
    );
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < 60 * 60_000)) hits.delete(k);
  }
}
