import { describe, expect, it } from "vitest";
import { AnalysisSchema, MedicationSchema, normalizeAnalysis, nstr } from "../schema";
import { SAMPLE_ANALYSIS } from "../sample/discharge";

const parse = (patch: Record<string, unknown>) => normalizeAnalysis(AnalysisSchema.parse({ ...SAMPLE_ANALYSIS, ...patch }));

describe("nstr", () => {
  it.each([undefined, null, "", "   ", "N/A", "n/a", "none", "Unknown", "not listed", "Not provided."])(
    "turns %j into null",
    (v) => expect(nstr.parse(v)).toBeNull(),
  );
  it("keeps real text and coerces numbers", () => {
    expect(nstr.parse("  10 mg ")).toBe("10 mg");
    expect(nstr.parse(500)).toBe("500");
  });
});

describe("AnalysisSchema", () => {
  it("accepts the sample analysis unchanged in shape", () => {
    const a = AnalysisSchema.parse(SAMPLE_ANALYSIS);
    expect(a.medications).toHaveLength(SAMPLE_ANALYSIS.medications.length);
    expect(a.recovery_guidance.emergency.length).toBeGreaterThan(0);
  });

  it("drops malformed list items instead of failing the whole response", () => {
    const a = AnalysisSchema.parse({
      ...SAMPLE_ANALYSIS,
      medications: [{ name: "Ibuprofen", strength: "200 mg" }, { strength: "no name" }, "garbage", null],
    });
    expect(a.medications.map((m) => m.name)).toEqual(["Ibuprofen"]);
  });

  it("never invents missing medication details", () => {
    const m = MedicationSchema.parse({ name: "Amoxicillin" });
    expect(m.dose).toBeNull();
    expect(m.strength).toBeNull();
    expect(m.frequency).toBeNull();
    expect(m.warnings).toEqual([]);
  });

  it("falls back safely on unknown enum values", () => {
    const m = MedicationSchema.parse({ name: "X", confidence: "very sure", status: "??" });
    expect(m.confidence).toBe("medium");
    expect(m.status).toBe("unknown");
  });

  it("survives a missing recovery_guidance block", () => {
    const a = AnalysisSchema.parse({ ...SAMPLE_ANALYSIS, recovery_guidance: "oops" });
    expect(a.recovery_guidance).toMatchObject({ expected: [], emergency: [], document_has_guidance: false });
  });
});

describe("normalizeAnalysis safety flags", () => {
  const base = { uncertain_fields: [], verification_required: false };

  it("flags a low-confidence medication for verification", () => {
    const a = parse({ ...base, medications: [{ name: "Metformin", strength: "500 mg", confidence: "low" }] });
    expect(a.medications[0].needs_verification).toBe(true);
    expect(a.medications[0].verification_reason).toMatch(/hard to read/);
    expect(a.verification_required).toBe(true);
    expect(a.uncertain_fields.some((u) => u.field.includes("Metformin"))).toBe(true);
  });

  it("flags a medication with no dose or strength even when the model was confident", () => {
    const a = parse({
      ...base,
      medications: [{ name: "Prednisone", confidence: "high", needs_verification: false }],
    });
    expect(a.medications[0].needs_verification).toBe(true);
    expect(a.medications[0].verification_reason).toMatch(/dose or strength/);
  });

  it("does not flag a clear, complete medication", () => {
    const a = parse({ ...base, medications: [{ name: "Lisinopril", strength: "10 mg", confidence: "high" }] });
    expect(a.medications[0].needs_verification).toBe(false);
    expect(a.verification_required).toBe(false);
  });

  it("assigns unique, prefixed ids even when the model repeats or omits them", () => {
    const a = parse({
      ...base,
      medications: [
        { id: "x", name: "A", strength: "1 mg" },
        { id: "x", name: "B", strength: "1 mg" },
        { name: "C", strength: "1 mg" },
        { id: "bad id with spaces", name: "D", strength: "1 mg" },
      ],
    });
    const ids = a.medications.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^med-/);
  });
});
