import { describe, expect, it } from "vitest";
import { localAnswer } from "../local-assistant";
import { sampleResult } from "../sample/discharge";
import { UI_LABELS } from "../translatable";

const t = (key: string, fallback?: string | null) =>
  fallback ?? (UI_LABELS as Record<string, string>)[key] ?? key;
const sample = sampleResult();

describe("offline voice assistant", () => {
  it("adds 911 guidance and never offers 'expected' symptoms for an urgent question", () => {
    const r = localAnswer("I can’t breathe and have chest pain, is that a normal symptom?", sample, t);
    expect(r.urgent).toBe(true);
    expect(r.answer).toMatch(/911/);
    expect(r.answer).not.toContain(UI_LABELS["ui.expected"]);
    expect(r.answer).not.toContain(UI_LABELS["ui.contact"]);
  });

  it("includes expected symptoms for a non-urgent symptom question", () => {
    const r = localAnswer("What symptoms are normal to expect?", sample, t);
    expect(r.urgent).toBe(false);
    expect(r.answer).toContain(UI_LABELS["ui.expected"]);
  });

  it("answers medication questions from the document", () => {
    const r = localAnswer("How do I take my medicines?", sample, t);
    for (const m of sample.medications) expect(r.answer).toContain(m.name);
  });

  it("says it could not find an answer rather than guessing", () => {
    const r = localAnswer("Tell me about quantum physics", sample, t);
    expect(r.answer).toMatch(/could not find that in your document/);
    expect(r.sources).toEqual([]);
  });

  it("still screens for emergencies with no document loaded", () => {
    const r = localAnswer("I took too many pills", null, t);
    expect(r.urgent).toBe(true);
    expect(r.answer).toMatch(/911/);
  });
});
