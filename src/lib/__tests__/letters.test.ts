import { describe, expect, it } from "vitest";
import { buildLetter, EMPTY_FIELDS } from "../letters";

const fields = { ...EMPTY_FIELDS, patientName: "Ana Ruiz", accountNumber: "MV-0042", amountDue: "$1,234.00", householdSize: "3", annualIncome: "$30,000" };

describe("letters", () => {
  it("builds the English letter with the patient's details", () => {
    const { body } = buildLetter("assistance", fields, new Date(2026, 10, 14));
    expect(body).toContain("To whom it may concern:");
    expect(body).toContain("Account number: MV-0042");
    expect(body).toContain("My household size is 3 and our approximate annual household income is $30,000.");
    expect(body).toContain("Sincerely,\n\nAna Ruiz");
  });

  it("translates every sentence as a template and never sends personal details for translation", () => {
    const seen: string[] = [];
    const tr = (s: string, vars?: Record<string, string | number>) => {
      seen.push(s);
      const t = `«${s}»`;
      return vars ? t.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : t;
    };
    for (const type of ["itemized", "assistance", "charity", "501r"] as const) {
      const { body } = buildLetter(type, fields, new Date(2026, 10, 14), tr, "es-US");
      expect(body).toContain("Ana Ruiz");
      expect(body).toContain("MV-0042");
      // every line that is not a personal value or a date went through tr()
      for (const line of body.split("\n").map((l) => l.replace(/^• /, "").trim()).filter(Boolean)) {
        if (/^(Ana Ruiz|\[.*\]|.*2026.*)$/.test(line)) continue;
        expect(line, line).toMatch(/«/);
      }
    }
    expect(seen.join(" ")).not.toMatch(/Ana Ruiz|MV-0042|1,234|30,000/);
  });
});
