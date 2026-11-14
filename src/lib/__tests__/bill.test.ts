import { describe, expect, it } from "vitest";
import { BillAnalysisSchema, findPossibleDuplicates, normalizeBill } from "../bill-schema";
import { SAMPLE_BILL } from "../sample/bill";

const items = (rows: Record<string, unknown>[]) =>
  normalizeBill(BillAnalysisSchema.parse({ ...SAMPLE_BILL, line_items: rows })).line_items;

describe("bill auditor", () => {
  it("parses the sample bill", () => {
    expect(BillAnalysisSchema.parse(SAMPLE_BILL).line_items.length).toBeGreaterThan(0);
  });

  it("gives every line item a unique id", () => {
    const li = items([
      { id: "a", description: "X", amount: 1 },
      { id: "a", description: "Y", amount: 2 },
      { description: "Z", amount: 3 },
    ]);
    const ids = li.map((x) => x.id);
    expect(new Set(ids).size).toBe(3);
  });

  it("surfaces identical lines for review, worded as a question rather than an error", () => {
    const li = items([
      { code: "j2405", description: "Ondansetron  injection", service_date: "11/10/2026", amount: 18.5 },
      { code: "J2405", description: "ondansetron injection", service_date: "11/10/2026", amount: 18.5 },
      { code: "J2405", description: "ondansetron injection", service_date: "11/11/2026", amount: 18.5 },
    ]);
    const dups = findPossibleDuplicates(li);
    expect(dups).toHaveLength(1);
    expect(dups[0].item_ids).toHaveLength(2);
    expect(dups[0].reason).toMatch(/can be legitimate/);
    expect(dups[0].reason).not.toMatch(/error/i);
  });

  it("ignores lines with no amount", () => {
    const li = items([
      { description: "Room", amount: null },
      { description: "Room", amount: null },
    ]);
    expect(findPossibleDuplicates(li)).toEqual([]);
  });
});
