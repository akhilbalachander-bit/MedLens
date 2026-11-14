import { afterEach, describe, expect, it } from "vitest";
import { checkRateLimit } from "../server/rate-limit";

const req = (ip: string) => new Request("http://x/api", { headers: { "x-forwarded-for": `${ip}, 10.0.0.1` } });
afterEach(() => delete process.env.RATE_LIMIT_MULTIPLIER);

describe("checkRateLimit", () => {
  it("blocks an IP after the hourly limit and lets others through", () => {
    const t = 1_000_000;
    for (let i = 0; i < 20; i++) checkRateLimit(req("1.1.1.1"), "analyze", t);
    expect(() => checkRateLimit(req("1.1.1.1"), "analyze", t)).toThrow(/limit/);
    expect(() => checkRateLimit(req("2.2.2.2"), "analyze", t)).not.toThrow();
    // window passes
    expect(() => checkRateLimit(req("1.1.1.1"), "analyze", t + 61 * 60_000)).not.toThrow();
  });
  it("can be disabled", () => {
    process.env.RATE_LIMIT_MULTIPLIER = "0";
    for (let i = 0; i < 100; i++) checkRateLimit(req("3.3.3.3"), "analyze");
  });
});
