import { describe, expect, it } from "vitest";
import { ageBand, findRedactions, looksLikeId, parseDate, scrubText, type OcrLine } from "../privacy/redact";

const TODAY = new Date(2026, 10, 15);
/** Fake OCR: one line per string, words 10px wide each. */
const page = (...rows: string[]): OcrLine[] =>
  rows.map((row, y) => ({
    words: row.split(" ").filter(Boolean).map((text, x) => ({ text, bbox: { x0: x * 10, y0: y * 20, x1: x * 10 + 9, y1: y * 20 + 15 } })),
  }));
const hidden = (rows: string[]) => findRedactions(page(...rows), TODAY);
const hiddenText = (rows: string[]) => hidden(rows).map((r) => `${r.label}: ${r.text}`);

describe("findRedactions: personal details are hidden", () => {
  it("hides the patient's name but not the label", () => {
    expect(hiddenText(["Patient: Jordan Rivera (SAMPLE PATIENT)"])).toEqual(["NAME: Jordan Rivera (SAMPLE PATIENT)"]);
  });
  it("turns a birth date into an age range the AI can still use", () => {
    expect(hiddenText(["DOB: 03/14/1961"])).toEqual(["AGE 60–69: 03/14/1961"]);
    expect(hiddenText(["Date of Birth March 14, 1961"])).toEqual(["AGE 60–69: March 14, 1961"]);
    expect(hiddenText(["Age: 92"])).toEqual(["AGE 90+: 92"]);
    expect(hiddenText(["67 y/o male with chest pain"])[0]).toBe("AGE 60–69: 67 y/o");
  });
  it("hides record, account, member and prescription numbers", () => {
    expect(hiddenText(["MRN: MV-SAMPLE-0042"])).toEqual(["ID NUMBER: MV-SAMPLE-0042"]);
    expect(hiddenText(["Account #: 4455667788"])).toEqual(["ID NUMBER: 4455667788"]);
    expect(hiddenText(["Member ID W123456789"])).toEqual(["ID NUMBER: W123456789"]);
    expect(hiddenText(["Rx# 6012345"])).toEqual(["ID NUMBER: 6012345"]);
  });
  it("hides addresses, personal phones, emails and SSNs", () => {
    expect(hiddenText(["1200 Orchard Way, Apt 4B"])).toEqual(["ADDRESS: 1200 Orchard Way, Apt 4B"]);
    expect(hiddenText(["Maple Valley, WA 98038"])).toEqual(["ADDRESS: Maple Valley, WA 98038"]);
    expect(hiddenText(["Phone: (555) 201-7788"])).toEqual(["PHONE: (555) 201-7788"]);
    expect(hiddenText(["Contact jordan.r@example.com"])).toEqual(["EMAIL: jordan.r@example.com"]);
    expect(hiddenText(["SSN 123-45-6789"])).toEqual(["SSN: 123-45-6789"]);
  });
  it("hides names printed LAST, FIRST on a pharmacy label and with a title", () => {
    expect(hiddenText(["RIVERA, JORDAN"])).toEqual(["NAME: RIVERA, JORDAN"]);
    expect(hiddenText(["Mrs. Alvarez called back"])[0]).toBe("NAME: Mrs. Alvarez");
  });
  it("hides a value printed on the line after its label", () => {
    expect(hiddenText(["Patient Name:", "Jordan Rivera"])).toEqual(["NAME: Jordan Rivera"]);
  });
});

describe("findRedactions: medical content is kept", () => {
  it.each([
    "Take 1 tablet by mouth every 8 hours as needed",
    "Ondansetron ODT 4 mg dissolve on tongue q8h PRN",
    "Acetaminophen 1000mg max 3,000 mg in 24 hrs",
    "CPT 99284 J2405 ondansetron inj $95.00",
    "Visit: 11/10/2026 Discharged: 11/10/2026",
    "Brand name: Tylenol Generic name: acetaminophen",
    "Attending: Dr. Elena Park, MD",
    "Call Dr. Nair's office at (555) 014-2200 to schedule",
    "Clinic phone: (555) 014-2200",
    "Return to the ER if fever ≥ 101°F (38.3°C)",
    "Patient education: drink small sips often",
  ])("keeps %j", (row) => {
    expect(hiddenText([row])).toEqual([]);
  });
});

describe("helpers", () => {
  it("bands ages like HIPAA de-identification", () => {
    expect([0, 3, 9, 15, 34, 89, 90, 101].map(ageBand)).toEqual([
      "AGE UNDER 1", "AGE 1–4", "AGE 5–11", "AGE 12–17", "AGE 30–39", "AGE 80–89", "AGE 90+", "AGE 90+",
    ]);
  });
  it("parses common birth-date formats", () => {
    expect(parseDate("3/14/61", TODAY)?.getFullYear()).toBe(1961);
    expect(parseDate("1961-03-14")?.getMonth()).toBe(2);
    expect(parseDate("14 Mar 1961")?.getDate()).toBe(14);
    expect(parseDate("not a date")).toBeNull();
  });
  it("tells IDs from doses, dates, codes and prices", () => {
    expect(["MV-0042-7781", "4455667788", "W123456789"].every(looksLikeId)).toBe(true);
    expect(["1000mg", "11/10/2026", "J2405", "99284", "$7,548.00", "3,000", "10:30AM"].some(looksLikeId)).toBe(false);
  });
  it("scrubs typed text but can keep a clinic phone number", () => {
    const s = "I am Mr. Smith, DOB 3/14/1961, email a@b.com, SSN 123-45-6789, acct 4455667788, call (555) 014-2200";
    const out = scrubText(s);
    expect(out).not.toMatch(/Smith|1961|a@b\.com|6789|4455667788|014-2200/);
    expect(scrubText("Call (555) 014-2200", { keepPhones: true })).toBe("Call (555) 014-2200");
  });
});

describe("findRedactions: several fields on one line", () => {
  it("covers each value but leaves the labels readable", () => {
    expect(hiddenText(["Patient: Jordan Rivera DOB: 03/14/1961 MRN: MV-0042-7781"])).toEqual([
      "NAME: Jordan Rivera",
      "AGE 60–69: 03/14/1961",
      "ID NUMBER: MV-0042-7781",
    ]);
  });
  it("stops a birth date at the date even if the next label was misread", () => {
    expect(hiddenText(["DOB: 03/14/1961 MRNs MV-0042-7781"])).toEqual(["AGE 60–69: 03/14/1961", "ID NUMBER: MV-0042-7781"]);
  });
});
