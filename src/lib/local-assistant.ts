import type { AnalysisResult } from "./schema";
import { detectEmergency, EMERGENCY_MESSAGE } from "./emergency";

type T = (key: string, fallback?: string | null) => string;

/**
 * Offline fallback for the voice assistant when no AI provider is configured.
 * Answers only by looking things up in the scanned document — it never
 * generates medical advice.
 */
export function localAnswer(q: string, a: AnalysisResult | null, t: T): { answer: string; urgent: boolean; sources: string[] } {
  const text = q.toLowerCase();
  const urgent = detectEmergency(q);
  const parts: string[] = [];
  const sources: string[] = [];
  if (urgent) parts.push(EMERGENCY_MESSAGE);

  if (!a) {
    parts.push("I can answer questions about your paperwork once you scan a document or load the sample. For medical questions, please contact your doctor, nurse line or pharmacist.");
    return { answer: parts.join(" "), urgent, sources };
  }

  const has = (re: RegExp) => re.test(text);
  const add = (label: string, lines: (string | null | undefined)[]) => {
    const clean = lines.filter((l): l is string => !!l && !!l.trim());
    if (clean.length) {
      parts.push(clean.join(" "));
      sources.push(label);
    }
  };

  // Specific medication mentioned
  const meds = a.medications.filter((m) =>
    [m.name, m.generic_name, m.brand_name].some((n) => n && text.includes(n.toLowerCase().split(" ")[0])),
  );
  for (const m of meds) {
    add(`Medication: ${m.name}`, [
      `${m.name}${m.strength ? ` ${m.strength}` : ""}:`,
      t(`med.${m.id}.simple`, m.instructions_simple ?? m.instructions_original),
      ...m.warnings.map((w, i) => t(`med.${m.id}.warn.${i}`, w)),
      m.needs_verification ? t(`med.${m.id}.verify`, m.verification_reason) : null,
    ]);
  }

  // Glossary term mentioned
  for (const g of a.glossary) {
    const term = g.term.toLowerCase().split(/[ (/]/)[0];
    if (term.length > 2 && text.includes(term)) add(`Glossary: ${g.term}`, [`${g.term}: ${t(`gl.${g.id}`, g.simple_definition)}`]);
  }

  if (!meds.length && has(/medic|medicine|pill|tablet|dose|take|drug|prescri/))
    add(
      "Medications",
      a.medications.map((m) => `${m.name}${m.strength ? ` ${m.strength}` : ""}: ${t(`med.${m.id}.simple`, m.instructions_simple ?? m.instructions_original)}`),
    );
  if (has(/follow|appointment|doctor|clinic|phone|call|schedule|see /))
    add(
      "Follow-up",
      a.follow_up.map((f) =>
        [f.provider_name, f.clinic_name, f.phone, f.timeframe && t(`fu.${f.id}.timeframe`, f.timeframe), f.reason && t(`fu.${f.id}.reason`, f.reason)].filter(Boolean).join(", "),
      ),
    );
  if (has(/test|lab|blood|x-?ray|mri|scan|imaging|ct\b/))
    add("Ordered tests", a.ordered_tests.map((ts) => `${ts.name}: ${t(`ts.${ts.id}.explain`, ts.simple_explanation)} ${ts.timing ? t(`ts.${ts.id}.timing`, ts.timing) : ""}`));
  const byCat = (cats: string[]) => a.instructions.filter((i) => cats.includes(i.category)).map((i) => t(`ins.${i.id}.simple`, i.simple ?? i.original));
  if (has(/eat|food|diet|drink|fluid|water/)) add("Food & drink", byCat(["diet"]));
  if (has(/activit|exercise|drive|driving|work|walk|sport|lift/)) add("Activity", byCat(["activity"]));
  if (has(/wound|bruise|ice|swell|cut|stitch|bandage|arm/)) add("Wound care", byCat(["wound_care"]));
  if (has(/symptom|normal|expect|worr|warning|sign|fever|pain|vomit|diarr|when should|er\b|emergency|911/)) {
    const g = a.recovery_guidance;
    const list = (items: typeof g.expected) => items.map((i) => t(`g.${i.id}`, i.text));
    // Safety first: emergency signs lead; an urgent question never gets "expected" symptoms.
    if (g.emergency.length) add(t("ui.emergency"), [`${t("ui.emergency")}:`, ...list(g.emergency)]);
    if (!urgent) {
      if (g.contact_provider.length) add(t("ui.contact"), [`${t("ui.contact")}:`, ...list(g.contact_provider)]);
      if (g.expected.length) add(t("ui.expected"), [`${t("ui.expected")}:`, ...list(g.expected)]);
    }
  }
  if (has(/what happened|why|diagnos|summary|wrong with|visit|hospital/))
    add(t("ui.whatHappened"), [t("summary.simple", a.patient_summary.simple_english)]);
  if (has(/bill|cost|price|pay|afford|money|insurance|charge/))
    add("Wallet", ["Open the Wallet & Bill Shield tab on your results page to see medicine price tools, review a hospital bill and make financial assistance letters."]);

  if (parts.length === (urgent ? 1 : 0)) {
    parts.push(
      "I could not find that in your document. Please ask your doctor, nurse line or pharmacist. You can also try asking about your medicines, warning signs, follow-up, tests, food or activity.",
    );
  }
  return { answer: parts.join(" "), urgent, sources };
}
