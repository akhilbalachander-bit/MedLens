import type { Analysis } from "./schema";
import type { BillAnalysis } from "./bill-schema";

/** Fixed UI labels that are translated together with the document content. */
export const UI_LABELS = {
  "ui.whatHappened": "What happened?",
  "ui.docSays": "What your document says",
  "ui.simpleWords": "What this means in simple words",
  "ui.directTranslation": "Direct translation",
  "ui.diagnoses": "Your diagnosis",
  "ui.glossary": "Medical words explained",
  "ui.medications": "Your medications",
  "ui.expected": "Expected during recovery",
  "ui.contact": "Contact your healthcare provider",
  "ui.emergency": "Emergency — get help now",
  "ui.emergencyBanner":
    "If you think you are having a medical emergency, call 911 or go to the nearest emergency room now. Do not wait.",
  "ui.checklist": "Recovery checklist",
  "ui.followUp": "Follow-up care",
  "ui.tests": "Tests your doctor ordered",
  "ui.notInDoc": "Not listed in your document",
  "ui.fromDoc": "From your document",
  "ui.generalRef": "General safety guidance",
  "ui.noGuidance":
    "Your document does not list enough warning signs for us to sort symptoms. Call your doctor or nurse line if you are worried. Call 911 for an emergency.",
  "ui.notDiagnosis": "MedLens explains your paperwork. It does not diagnose and is not medical advice.",
} as const;

export type UiLabelKey = keyof typeof UI_LABELS;

/**
 * Flatten everything a patient reads into a { key: englishText } map.
 * The translation endpoint returns the same keys, so the original document is
 * analyzed once and only this small text map is re-sent per language.
 * Original document wording ("What your document says") is preserved, with a
 * separate direct translation key.
 */
export function buildTranslatable(a: Analysis): Record<string, string> {
  const out: Record<string, string> = { ...UI_LABELS };
  const put = (k: string, v: string | null | undefined) => {
    if (v && v.trim()) out[k] = v;
  };
  put("facility", a.facility_name);
  put("visit.reason", a.visit_reason);
  put("summary.simple", a.patient_summary.simple_english);
  put("summary.orig", a.patient_summary.original);
  for (const d of a.diagnoses) {
    put(`dx.${d.id}`, d.simple_explanation);
    put(`dx.${d.id}.term`, d.original_term);
  }
  for (const m of a.medications) {
    put(`med.${m.id}.name`, m.name);
    put(`med.${m.id}.brand`, m.brand_name);
    put(`med.${m.id}.generic`, m.generic_name);
    put(`med.${m.id}.orig`, m.instructions_original);
    put(`med.${m.id}.purpose`, m.purpose);
    put(`med.${m.id}.simple`, m.instructions_simple);
    put(`med.${m.id}.verify`, m.verification_reason);
    put(`med.${m.id}.dose`, m.dose);
    put(`med.${m.id}.route`, m.route);
    put(`med.${m.id}.frequency`, m.frequency);
    put(`med.${m.id}.duration`, m.duration);
    put(`med.${m.id}.quantity`, m.quantity);
    m.warnings.forEach((w, i) => put(`med.${m.id}.warn.${i}`, w));
  }
  for (const ins of a.instructions) {
    put(`ins.${ins.id}.simple`, ins.simple);
    put(`ins.${ins.id}.orig`, ins.original);
  }
  for (const g of a.glossary) {
    put(`gl.${g.id}`, g.simple_definition);
    put(`gl.${g.id}.term`, g.term);
  }
  const rg = a.recovery_guidance;
  for (const g of [...rg.expected, ...rg.contact_provider, ...rg.emergency]) {
    put(`g.${g.id}`, g.text);
    put(`g.${g.id}.quote`, g.source_quote);
  }
  put("note.guidance", rg.note);
  for (const c of a.recovery_checklist) {
    put(`ck.${c.id}`, c.task);
    put(`ck.${c.id}.timeframe`, c.timeframe);
  }
  for (const f of a.follow_up) {
    put(`fu.${f.id}.provider`, f.provider_name);
    put(`fu.${f.id}.clinic`, f.clinic_name);
    put(`fu.${f.id}.specialty`, f.specialty);
    put(`fu.${f.id}.timeframe`, f.timeframe);
    put(`fu.${f.id}.reason`, f.reason);
  }
  for (const t of a.ordered_tests) {
    put(`ts.${t.id}.name`, t.name);
    put(`ts.${t.id}.location`, t.location);
    put(`ts.${t.id}.explain`, t.simple_explanation);
    put(`ts.${t.id}.timing`, t.timing);
    put(`ts.${t.id}.instructions`, t.instructions);
  }
  a.uncertain_fields.forEach((u, i) => {
    put(`uf.${i}.field`, u.field);
    put(`uf.${i}.reason`, u.reason);
  });
  for (const f of a.financial_information) {
    put(`fi.${f.id}.label`, f.label);
    // Account numbers and other codes stay as printed; words are translated.
    if (f.value && /[a-z]{3,}/i.test(f.value) && !/\d{3,}/.test(f.value)) put(`fi.${f.id}.value`, f.value);
    put(`fi.${f.id}.note`, f.note);
  }
  return out;
}

/** Medication names and other strings the translator must leave untouched. */
export function protectedTerms(a: Analysis): string[] {
  // Everything is translated (names are written in the target script); only
  // doses and phone numbers must stay exactly as printed.
  const s = new Set<string>();
  for (const m of a.medications) if (m.strength) s.add(m.strength);
  for (const f of a.follow_up) if (f.phone) s.add(f.phone);
  return [...s];
}

/** Stable key for a piece of bill text (content-based, so a new bill never reuses an old bill's translation). */
export function billKey(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return `bill.${(h >>> 0).toString(36)}.${text.length}`;
}

/** Everything a patient reads in the bill auditor, keyed by billKey(). */
export function buildBillTranslatable(b: BillAnalysis): Record<string, string> {
  const out: Record<string, string> = {};
  const put = (v: string | null | undefined) => {
    if (v && v.trim()) out[billKey(v)] = v;
  };
  put(b.facility_name);
  put(b.plain_summary);
  for (const li of b.line_items) {
    put(li.description);
    put(li.plain_explanation);
  }
  for (const t of b.terminology) {
    put(t.term);
    put(t.explanation);
  }
  for (const d of b.possible_duplicates) put(d.reason);
  for (const c of b.needs_clarification) put(c.reason);
  return out;
}
