import type { Analysis } from "./schema";

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
  put("visit.reason", a.visit_reason);
  put("summary.simple", a.patient_summary.simple_english);
  for (const d of a.diagnoses) put(`dx.${d.id}`, d.simple_explanation);
  for (const m of a.medications) {
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
  for (const g of a.glossary) put(`gl.${g.id}`, g.simple_definition);
  const rg = a.recovery_guidance;
  for (const g of [...rg.expected, ...rg.contact_provider, ...rg.emergency]) put(`g.${g.id}`, g.text);
  put("note.guidance", rg.note);
  for (const c of a.recovery_checklist) {
    put(`ck.${c.id}`, c.task);
    put(`ck.${c.id}.timeframe`, c.timeframe);
  }
  for (const f of a.follow_up) {
    put(`fu.${f.id}.timeframe`, f.timeframe);
    put(`fu.${f.id}.reason`, f.reason);
  }
  for (const t of a.ordered_tests) {
    put(`ts.${t.id}.explain`, t.simple_explanation);
    put(`ts.${t.id}.timing`, t.timing);
    put(`ts.${t.id}.instructions`, t.instructions);
  }
  a.uncertain_fields.forEach((u, i) => put(`uf.${i}.reason`, u.reason));
  return out;
}

/** Medication names and other strings the translator must leave untouched. */
export function protectedTerms(a: Analysis): string[] {
  const s = new Set<string>();
  for (const m of a.medications) {
    for (const v of [m.name, m.brand_name, m.generic_name, m.strength]) if (v) s.add(v);
  }
  for (const f of a.follow_up) for (const v of [f.phone, f.provider_name]) if (v) s.add(v);
  return [...s];
}
