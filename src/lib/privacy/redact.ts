/**
 * Finds personal information on a scanned page so it can be covered BEFORE
 * the page leaves the patient's device. Works on the words the on-device
 * reader (OCR) found, with their positions. Pure functions: no browser APIs,
 * fully unit-tested.
 *
 * Covered: patient and other people's names, birth dates (turned into an age
 * range), ages, street addresses, personal phone numbers, emails, Social
 * Security numbers, and record / account / member / prescription ID numbers.
 * Kept: medicines, doses, instructions, dates of care, and the clinic's or
 * pharmacy's own phone number (the patient needs it to call).
 */

export type Box = { x0: number; y0: number; x1: number; y1: number };
export type OcrWord = { text: string; bbox: Box };
export type OcrLine = { words: OcrWord[] };

export type RedactionKind = "name" | "birth" | "age" | "address" | "phone" | "email" | "ssn" | "id" | "other";
export type Redaction = {
  id: string;
  kind: RedactionKind;
  /** what the AI sees instead, e.g. "NAME" or "AGE 60–69" */
  label: string;
  boxes: Box[];
  /** the covered words (kept only on the device, for the review screen) */
  text: string;
  /** true = found automatically; false = added by the patient */
  auto: boolean;
};

const LABEL_TEXT: Record<RedactionKind, string> = {
  name: "NAME",
  birth: "BIRTH DATE",
  age: "AGE",
  address: "ADDRESS",
  phone: "PHONE",
  email: "EMAIL",
  ssn: "SSN",
  id: "ID NUMBER",
  other: "HIDDEN",
};

// ---------------------------------------------------------------- ages

/** HIPAA-style age bands: decades, with children grouped and 90+ aggregated. */
export function ageBand(age: number): string {
  if (!Number.isFinite(age) || age < 0) return "AGE";
  if (age < 1) return "AGE UNDER 1";
  if (age < 5) return "AGE 1–4";
  if (age < 12) return "AGE 5–11";
  if (age < 18) return "AGE 12–17";
  if (age >= 90) return "AGE 90+";
  const d = Math.floor(age / 10) * 10;
  return `AGE ${d}–${d + 9}`;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Parses the common ways a birth date is printed. */
export function parseDate(s: string, today = new Date()): Date | null {
  const t = s.trim();
  // Year first (1961-03-14) is checked before month/day/year so it isn't misread.
  let m = /(?<!\d)(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)/.exec(t);
  if (m) return valid(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = /(?<!\d)(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?!\d)/.exec(t);
  if (m) {
    let y = Number(m[3]);
    if (y < 100) y += y > today.getFullYear() % 100 ? 1900 : 2000;
    return valid(y, Number(m[1]) - 1, Number(m[2]));
  }
  m = /([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})/.exec(t);
  if (m && MONTHS.includes(m[1].slice(0, 3).toLowerCase())) return valid(Number(m[3]), MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()), Number(m[2]));
  m = /(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})/.exec(t);
  if (m && MONTHS.includes(m[2].slice(0, 3).toLowerCase())) return valid(Number(m[3]), MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()), Number(m[1]));
  return null;
}
function valid(y: number, mo: number, d: number): Date | null {
  if (mo < 0 || mo > 11 || d < 1 || d > 31 || y < 1880 || y > 2100) return null;
  return new Date(y, mo, d);
}
export function ageOn(dob: Date, today = new Date()): number {
  let a = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) a--;
  return a;
}

// ---------------------------------------------------------------- labels

type Label = { re: RegExp; kind: RedactionKind; strong?: boolean };
// "strong" labels mark a value even without a colon ("DOB 03/04/1961");
// the others need a colon or # ("Phone: …", "Name: …") to avoid ordinary words.
const LABELS: Label[] = [
  { re: /date\s+of\s+birth|birth\s*date|d\.?\s?o\.?\s?b\.?(?![a-z])/i, kind: "birth", strong: true },
  { re: /social\s+security(\s+(number|no\.?))?|ssn/i, kind: "ssn", strong: true },
  { re: /patient\s+name|pt\.?\s+name/i, kind: "name", strong: true },
  { re: /mrn|medical\s+record(\s+(number|no\.?|#))?|med\.?\s+rec\.?(\s+(no\.?|#))?/i, kind: "id", strong: true },
  { re: /(member|subscriber|insurance|patient|policy|group)\s+(id|number|no\.?|#)/i, kind: "id", strong: true },
  { re: /acc(oun)?t\.?\s*(number|no\.?|#)?/i, kind: "id", strong: true },
  { re: /(rx|prescription)\s*(number|no\.?|#)/i, kind: "id", strong: true },
  { re: /(encounter|csn|fin|harn?)\s*(id|number|no\.?|#)?|visit\s*(id|number|no\.?|#)/i, kind: "id" },
  { re: /patient|pt|name|guarantor|insured|responsible\s+party|emergency\s+contact|next\s+of\s+kin|(patient\s+)?signature|parent|guardian/i, kind: "name" },
  { re: /age/i, kind: "age" },
  { re: /born/i, kind: "birth" },
  { re: /(home\s+|mailing\s+|street\s+)?address|addr\.?/i, kind: "address" },
  { re: /(home\s+|cell\s+|mobile\s+|patient\s+)?(phone|tel(ephone)?|cell|mobile)/i, kind: "phone" },
  { re: /e-?mail/i, kind: "email" },
  { re: /id|policy|group/i, kind: "id" },
];

// "Brand name:", "Clinic phone:", "Hospital address:" describe things, not the patient.
const ORG_WORDS =
  /^(brand|generic|drug|medication|medicine|product|clinic|hospital|facility|provider|doctor|physician|pharmacy|test|lab|plan|company|office|department|dept|practice|billing|center|centre|insurance|payer|surgeon|nurse|attending|referring|ordering|pcp)$/i;

// A line mentioning one of these is about the care team, so its phone number stays.
const CARE_CONTEXT =
  /\b(dr\.?|doctor|clinic|office|hospital|pharmacy|department|dept|center|centre|nurse|line|call|appointment|appt|follow[- ]?up|schedule|scheduling|questions|md|do|np|pa|urgent|poison|911|988)\b/i;

// ---------------------------------------------------------------- patterns

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const SSN = /\b\d{3}[- ]\d{2}[- ]\d{4}\b/g;
const PHONE = /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]\d{4}\b/g;
const STREET =
  /\b\d{1,6}\s+(?:[A-Za-z0-9.'-]+\s+){0,4}(?:st|street|ave|avenue|rd|road|blvd|boulevard|ln|lane|way|ct|court|pl|place|pkwy|parkway|hwy|highway|terrace|ter|cir|circle|dr|drive|trail|trl|loop|sq|square)\b\.?(?:\s*,?\s*(?:apt|unit|suite|ste|#)\s*[\w-]+)?/gi;
const CITY_STATE_ZIP = /\b[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3},?\s+[A-Z]{2}\.?\s+\d{5}(?:-\d{4})?\b/g;
const PO_BOX = /\bP\.?\s?O\.?\s+Box\s+\d+/gi;
const HONORIFIC_NAME = /\b(?:Mr|Mrs|Ms|Miss|Mx)\.?\s+[A-Z][a-z'-]+(?:\s+[A-Z][a-z'-]+)?/g;
const AGE_PHRASE = /\b(\d{1,3})\s*-?\s*(?:y\/?o|yo|years?[- ]old|yrs?[- ]old)\b/gi;
const CAPS_LAST_FIRST = /^([A-Z][A-Z'-]+),\s+([A-Z][A-Z'-]+)(?:\s+[A-Z]\.?)?/;

/** A token that is an identifier (record, account, member, Rx number), not a dose, date, code or price. */
export function looksLikeId(token: string): boolean {
  const t = token.replace(/^[#:(\[]+|[)\].,;:]+$/g, "");
  if (t.length < 6) return false; // CPT/HCPCS (99284, J2405) and short codes stay
  const digits = (t.match(/\d/g) ?? []).length;
  if (digits < 4) return false;
  if (/^\$|^\d{1,3}(,\d{3})+(\.\d+)?$|^\d+\.\d{2}$/.test(t)) return false; // money / amounts
  if (/^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$|^\d{4}-\d{2}-\d{2}$/.test(t)) return false; // dates
  if (/^\d+(\.\d+)?(mg|mcg|ml|g|kg|lb|lbs|units?|iu|meq|%|mmhg|bpm)$/i.test(t)) return false; // doses / vitals
  if (/^\d{1,2}:\d{2}/.test(t)) return false; // times
  if (/^\(?\d{3}\)?[-.]?\d{3}[-.]\d{4}$|^\d{3}[-.]\d{4}$/.test(t)) return false; // phone numbers (handled separately)
  return /^[A-Za-z0-9][A-Za-z0-9-]*$/.test(t);
}

// ---------------------------------------------------------------- detection

type Span = { start: number; end: number };
type Indexed = { text: string; spans: Span[] };

function indexLine(line: OcrLine): Indexed {
  let text = "";
  const spans: Span[] = [];
  line.words.forEach((w, i) => {
    if (i > 0) text += " ";
    spans.push({ start: text.length, end: text.length + w.text.length });
    text += w.text;
  });
  return { text, spans };
}

function wordsIn(ix: Indexed, start: number, end: number): number[] {
  const out: number[] = [];
  ix.spans.forEach((s, i) => {
    if (s.end > start && s.start < end) out.push(i);
  });
  return out;
}

function union(boxes: Box[]): Box {
  return {
    x0: Math.min(...boxes.map((b) => b.x0)),
    y0: Math.min(...boxes.map((b) => b.y0)),
    x1: Math.max(...boxes.map((b) => b.x1)),
    y1: Math.max(...boxes.map((b) => b.y1)),
  };
}

/** Find everything personal on a page. `today` is used to turn birth dates into age ranges. */
export function findRedactions(lines: OcrLine[], today = new Date()): Redaction[] {
  const found: Redaction[] = [];
  const covered = new Set<string>(); // "line:word" already hidden
  let n = 0;

  const add = (kind: RedactionKind, li: number, words: number[], label?: string) => {
    const fresh = words.filter((w) => !covered.has(`${li}:${w}`) && lines[li].words[w]);
    if (!fresh.length) return;
    fresh.forEach((w) => covered.add(`${li}:${w}`));
    const ws = fresh.map((w) => lines[li].words[w]);
    found.push({
      id: `r${++n}`,
      kind,
      label: label ?? LABEL_TEXT[kind],
      boxes: [union(ws.map((w) => w.bbox))],
      text: ws.map((w) => w.text).join(" "),
      auto: true,
    });
  };

  const valueLabel = (kind: RedactionKind, value: string): { kind: RedactionKind; label?: string } => {
    if (kind === "birth") {
      const d = parseDate(value, today);
      if (d) return { kind: "birth", label: ageBand(ageOn(d, today)) };
    }
    if (kind === "age") {
      const a = /(\d{1,3})/.exec(value);
      if (a) return { kind: "age", label: ageBand(Number(a[1])) };
    }
    return { kind };
  };

  lines.forEach((line, li) => {
    const ix = indexLine(line);
    const text = ix.text;

    // 1. Labelled values: "Patient: …", "DOB …", "MRN …"
    type Hit = { start: number; end: number; kind: RedactionKind };
    const hits: Hit[] = [];
    for (const L of LABELS) {
      const re = new RegExp(`(^|[^A-Za-z])(${L.re.source})(?![A-Za-z])\\s*(${L.strong ? "[:#.]?" : "[:#]"})`, "gi");
      for (let m = re.exec(text); m; m = re.exec(text)) {
        const start = m.index + m[1].length;
        const end = m.index + m[0].length;
        if (hits.some((h) => start < h.end && end > h.start)) continue;
        const before = text.slice(0, start).trim().split(/\s+/).pop() ?? "";
        if (ORG_WORDS.test(before.replace(/[^A-Za-z]/g, ""))) continue;
        hits.push({ start, end, kind: L.kind });
      }
    }
    hits.sort((a, b) => a.start - b.start);
    hits.forEach((h, k) => {
      const valueEnd = k + 1 < hits.length ? hits[k + 1].start : text.length;
      const value = text.slice(h.end, valueEnd);
      let words = wordsIn(ix, h.end, valueEnd).filter((w) => /[A-Za-z0-9]/.test(line.words[w].text));
      // A birth date or age covers only the date / number words, not a following label.
      if (h.kind === "birth" || h.kind === "age") {
        const isDatePart = (w: number) => {
          const t = line.words[w].text;
          return !looksLikeId(t) && /^[\d/.,-]+$|^\d{1,3}(y\/?o|yrs?)?$|^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?$/i.test(t);
        };
        const first = words.findIndex(isDatePart);
        if (first >= 0) {
          let last = first;
          while (last + 1 < words.length && isDatePart(words[last + 1])) last++;
          words = words.slice(first, last + 1);
        }
      }
      if (words.length) {
        const v = valueLabel(h.kind, value);
        add(v.kind, li, words, v.label);
      } else if (li + 1 < lines.length) {
        // "Patient:" at the end of a line: the value is on the next line.
        const next = lines[li + 1];
        const nextText = indexLine(next).text;
        if (!hits.length || !LABELS.some((L) => new RegExp(`^(${L.re.source})\\s*[:#]`, "i").test(nextText))) {
          const v = valueLabel(h.kind, nextText);
          add(v.kind, li + 1, next.words.slice(0, 6).map((_, i) => i), v.label);
        }
      }
    });

    // 2. Patterns anywhere on the line.
    const each = (re: RegExp, fn: (m: RegExpExecArray) => void) => {
      re.lastIndex = 0;
      for (let m = re.exec(text); m; m = re.exec(text)) fn(m);
    };
    each(EMAIL, (m) => add("email", li, wordsIn(ix, m.index, m.index + m[0].length)));
    each(SSN, (m) => add("ssn", li, wordsIn(ix, m.index, m.index + m[0].length)));
    each(PHONE, (m) => {
      if (CARE_CONTEXT.test(text) && !/\b(patient|home|cell|mobile|emergency\s+contact|guarantor)\b/i.test(text)) return;
      add("phone", li, wordsIn(ix, m.index, m.index + m[0].length));
    });
    each(STREET, (m) => add("address", li, wordsIn(ix, m.index, m.index + m[0].length)));
    each(CITY_STATE_ZIP, (m) => add("address", li, wordsIn(ix, m.index, m.index + m[0].length)));
    each(PO_BOX, (m) => add("address", li, wordsIn(ix, m.index, m.index + m[0].length)));
    each(HONORIFIC_NAME, (m) => add("name", li, wordsIn(ix, m.index, m.index + m[0].length)));
    each(AGE_PHRASE, (m) => add("age", li, wordsIn(ix, m.index, m.index + m[0].length), ageBand(Number(m[1]))));
    const caps = CAPS_LAST_FIRST.exec(text);
    if (caps && line.words.length <= 5) add("name", li, wordsIn(ix, 0, caps[0].length));
    line.words.forEach((w, wi) => {
      if (looksLikeId(w.text)) add("id", li, [wi]);
    });
  });

  return found;
}

// ---------------------------------------------------------------- free text

/**
 * Scrub personal details out of free text: what a patient types into the
 * assistant, and (as a second safety net) everything the AI sends back.
 * Phone numbers are kept only where `keepPhones` is true (a clinic's number).
 */
export function scrubText(s: string, { keepPhones = false }: { keepPhones?: boolean } = {}): string {
  let out = s
    .replace(EMAIL, "[EMAIL]")
    .replace(SSN, "[SSN]")
    .replace(HONORIFIC_NAME, "[NAME]")
    .replace(PO_BOX, "[ADDRESS]")
    .replace(STREET, "[ADDRESS]")
    .replace(CITY_STATE_ZIP, "[ADDRESS]");
  if (!keepPhones) out = out.replace(PHONE, "[PHONE]");
  out = out.replace(AGE_PHRASE, (_m, a: string) => `[${ageBand(Number(a))}]`);
  out = out.replace(/(date\s+of\s+birth|d\.?o\.?b\.?)\s*[:#]?\s*[A-Za-z0-9 ,./-]{6,20}?\d{2,4}/gi, "$1 [BIRTH DATE]");
  out = out.replace(/(^|[\s(:#])([A-Za-z0-9][A-Za-z0-9-]{5,})(?=[\s).,;:]|$)/g, (m, pre: string, tok: string) =>
    looksLikeId(tok) ? `${pre}[ID]` : m,
  );
  return out;
}

export const KIND_TEXT = LABEL_TEXT;
