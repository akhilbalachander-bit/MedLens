import { z } from "zod";

/**
 * MedLens analysis schema.
 *
 * One multimodal model call returns ONE JSON object in this shape; it powers
 * all three results tabs, the medication dashboard, the instructions page and
 * the voice assistant. Validation is deliberately lenient about *shape*
 * (a malformed list item is dropped rather than failing the whole response)
 * but never fills in medical content: absent values become `null`.
 */

// ---------- lenient primitives ----------

/** Optional text: non-strings are coerced, blanks become null. */
export const nstr = z.preprocess((v) => {
  if (v === undefined || v === null) return null;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t || /^(n\/?a|null|none|unknown|not (listed|provided|specified|available))\.?$/i.test(t)) return null;
  return t;
}, z.string().nullable());

const reqStr = z.preprocess((v) => (typeof v === "number" ? String(v) : v), z.string().trim().min(1));

const bool = (fallback: boolean) =>
  z.preprocess((v) => {
    if (typeof v === "boolean") return v;
    if (v === "true") return true;
    if (v === "false") return false;
    return fallback;
  }, z.boolean());

const strList = z
  .array(z.unknown())
  .catch([])
  .transform((arr) => arr.map((x) => nstr.parse(x)).filter((x): x is string => !!x));

/** Array that keeps the valid items and silently drops invalid ones. */
function lenientArray<T extends z.ZodTypeAny>(item: T) {
  return z
    .unknown()
    .transform((v) => (Array.isArray(v) ? v : []))
    .transform((arr) =>
      arr.flatMap((x) => {
        const r = item.safeParse(x);
        return r.success ? [r.data as z.output<T>] : [];
      }),
    );
}

const enumCatch = <T extends [string, ...string[]]>(values: T, fallback: T[number]) =>
  z.preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase() : v), z.enum(values)).catch(fallback as never);

// ---------- sections ----------

export const Confidence = enumCatch(["high", "medium", "low"], "medium");

export const MedicationSchema = z.object({
  id: nstr,
  name: reqStr,
  brand_name: nstr,
  generic_name: nstr,
  strength: nstr,
  dose: nstr,
  route: nstr,
  frequency: nstr,
  duration: nstr,
  quantity: nstr,
  refills: nstr,
  purpose: nstr,
  instructions_original: nstr,
  instructions_simple: nstr,
  warnings: strList,
  status: enumCatch(["new", "continue", "changed", "stop", "unknown"], "unknown"),
  confidence: Confidence,
  needs_verification: bool(false),
  verification_reason: nstr,
});

export const InstructionSchema = z.object({
  id: nstr,
  category: enumCatch(
    ["activity", "diet", "wound_care", "medication", "symptoms", "follow_up", "general", "other"],
    "general",
  ),
  original: reqStr,
  simple: nstr,
});

export const DiagnosisSchema = z.object({
  id: nstr,
  original_term: reqStr,
  simple_explanation: nstr,
});

export const GlossarySchema = z.object({
  id: nstr,
  term: reqStr,
  simple_definition: reqStr,
  appears_in_document: bool(true),
});

export const GuidanceItemSchema = z.object({
  id: nstr,
  text: reqStr,
  source: enumCatch(["document", "general_reference"], "document"),
  source_quote: nstr,
});

export const RecoveryGuidanceSchema = z
  .object({
    expected: lenientArray(GuidanceItemSchema),
    contact_provider: lenientArray(GuidanceItemSchema),
    emergency: lenientArray(GuidanceItemSchema),
    document_has_guidance: bool(false),
    note: nstr,
  })
  .catch({ expected: [], contact_provider: [], emergency: [], document_has_guidance: false, note: null });

export const ChecklistItemSchema = z.object({
  id: nstr,
  task: reqStr,
  category: enumCatch(["medication", "appointment", "lab", "imaging", "activity", "wound_care", "diet", "other"], "other"),
  timeframe: nstr,
  due_date: nstr,
  source_quote: nstr,
});

export const FollowUpSchema = z.object({
  id: nstr,
  provider_name: nstr,
  specialty: nstr,
  clinic_name: nstr,
  phone: nstr,
  address: nstr,
  appointment_date: nstr,
  appointment_time: nstr,
  timeframe: nstr,
  reason: nstr,
});

export const OrderedTestSchema = z.object({
  id: nstr,
  name: reqStr,
  type: enumCatch(["lab", "imaging", "other"], "other"),
  simple_explanation: nstr,
  timing: nstr,
  instructions: nstr,
  location: nstr,
});

export const FinancialInfoSchema = z.object({
  id: nstr,
  label: reqStr,
  value: nstr,
  note: nstr,
});

export const UncertainFieldSchema = z.object({
  field: reqStr,
  reason: nstr,
});

export const AnalysisSchema = z.object({
  document_type: enumCatch(
    [
      "discharge_summary",
      "after_visit_summary",
      "prescription_label",
      "medication_list",
      "lab_results",
      "hospital_bill",
      "other",
      "unreadable",
    ],
    "other",
  ),
  extraction_status: enumCatch(["success", "partial", "failed"], "partial"),
  document_language: nstr,
  facility_name: nstr,
  visit_date: nstr,
  discharge_date: nstr,
  visit_reason: nstr,
  patient_summary: z
    .object({ original: nstr, simple_english: nstr })
    .catch({ original: null, simple_english: null }),
  diagnoses: lenientArray(DiagnosisSchema),
  medications: lenientArray(MedicationSchema),
  instructions: lenientArray(InstructionSchema),
  glossary: lenientArray(GlossarySchema),
  recovery_guidance: RecoveryGuidanceSchema,
  recovery_checklist: lenientArray(ChecklistItemSchema),
  follow_up: lenientArray(FollowUpSchema),
  ordered_tests: lenientArray(OrderedTestSchema),
  financial_information: lenientArray(FinancialInfoSchema),
  uncertain_fields: lenientArray(UncertainFieldSchema),
  verification_required: bool(true),
  analysis_notes: nstr,
});

export type Analysis = z.output<typeof AnalysisSchema>;
export type Medication = Analysis["medications"][number];
export type Instruction = Analysis["instructions"][number];
export type GlossaryItem = Analysis["glossary"][number];
export type GuidanceItem = Analysis["recovery_guidance"]["expected"][number];
export type ChecklistItem = Analysis["recovery_checklist"][number];
export type FollowUp = Analysis["follow_up"][number];
export type OrderedTest = Analysis["ordered_tests"][number];

export type AnalysisMeta = {
  source: "ai" | "sample" | "mock";
  provider: string | null;
  model: string | null;
  analyzed_at: string;
  page_count: number;
  file_names: string[];
};

/** What the API returns and the client stores. Every list item has an id. */
export type AnalysisResult = Analysis & { meta: AnalysisMeta };

/**
 * Post-validation normalisation: stable ids, and safety flags that must hold
 * regardless of what the model said (e.g. a low-confidence medication field is
 * always flagged for manual verification).
 */
export function normalizeAnalysis(a: Analysis): Analysis {
  const used = new Set<string>();
  const ensureId = (prefix: string, i: number, id: string | null) => {
    let base = id && /^[\w-]{1,40}$/.test(id) ? id : `${prefix}-${i + 1}`;
    if (!base.startsWith(prefix)) base = `${prefix}-${base}`;
    let candidate = base;
    let n = 2;
    while (used.has(candidate)) candidate = `${base}-${n++}`;
    used.add(candidate);
    return candidate;
  };
  const withIds = <T extends { id: string | null }>(prefix: string, items: T[]) =>
    items.map((x, i) => ({ ...x, id: ensureId(prefix, i, x.id) }));

  const uncertain = [...a.uncertain_fields];
  const medications = withIds("med", a.medications).map((m) => {
    const missingCore = !m.strength && !m.dose;
    const needs = m.needs_verification || m.confidence === "low" || missingCore;
    const reason =
      m.verification_reason ??
      (m.confidence === "low"
        ? "Part of this medication label was hard to read."
        : missingCore
          ? "The dose or strength could not be found on the document."
          : null);
    if (needs && !uncertain.some((u) => u.field.toLowerCase().includes(m.name.toLowerCase()))) {
      uncertain.push({ field: `Medication: ${m.name}`, reason });
    }
    return { ...m, needs_verification: needs, verification_reason: needs ? reason : m.verification_reason };
  });

  const g = a.recovery_guidance;
  return {
    ...a,
    diagnoses: withIds("dx", a.diagnoses),
    medications,
    instructions: withIds("ins", a.instructions),
    glossary: withIds("gl", a.glossary),
    recovery_guidance: {
      ...g,
      expected: withIds("gx", g.expected),
      contact_provider: withIds("gc", g.contact_provider),
      emergency: withIds("ge", g.emergency),
    },
    recovery_checklist: withIds("ck", a.recovery_checklist),
    follow_up: withIds("fu", a.follow_up),
    ordered_tests: withIds("ts", a.ordered_tests),
    financial_information: withIds("fi", a.financial_information),
    uncertain_fields: uncertain,
    verification_required: a.verification_required || medications.some((m) => m.needs_verification) || uncertain.length > 0,
  };
}

/** Compact JSON description of the schema, embedded in the model prompt. */
export const ANALYSIS_JSON_SHAPE = `{
  "document_type": "discharge_summary | after_visit_summary | prescription_label | medication_list | lab_results | hospital_bill | other | unreadable",
  "extraction_status": "success | partial | failed",
  "document_language": "string | null (language the document is written in)",
  "facility_name": "string | null",
  "visit_date": "string | null (as written)",
  "discharge_date": "string | null (as written)",
  "visit_reason": "string | null (short, plain words)",
  "patient_summary": {
    "original": "string | null (the document's own summary/diagnosis wording, quoted)",
    "simple_english": "string | null (2-3 sentences, ~5th-grade reading level, ONLY facts in the document, second person 'You ...')"
  },
  "diagnoses": [{ "id": "dx-1", "original_term": "string", "simple_explanation": "string | null" }],
  "medications": [{
    "id": "med-1", "name": "string (exactly as printed)", "brand_name": "string | null", "generic_name": "string | null",
    "strength": "string | null", "dose": "string | null", "route": "string | null", "frequency": "string | null",
    "duration": "string | null", "quantity": "string | null", "refills": "string | null",
    "purpose": "string | null (only if stated or unambiguous)",
    "instructions_original": "string | null (quoted)", "instructions_simple": "string | null",
    "warnings": ["string"], "status": "new | continue | changed | stop | unknown",
    "confidence": "high | medium | low (how clearly you could read name, strength and dose)",
    "needs_verification": "boolean", "verification_reason": "string | null"
  }],
  "instructions": [{ "id": "ins-1", "category": "activity | diet | wound_care | medication | symptoms | follow_up | general | other", "original": "string (quoted exactly)", "simple": "string | null" }],
  "glossary": [{ "id": "gl-1", "term": "string", "simple_definition": "string", "appears_in_document": "boolean" }],
  "recovery_guidance": {
    "document_has_guidance": "boolean (does the document itself list symptoms / warning signs?)",
    "note": "string | null (say plainly if the document lacks enough information)",
    "expected": [{ "id": "gx-1", "text": "string", "source": "document | general_reference", "source_quote": "string | null" }],
    "contact_provider": [{ "id": "gc-1", "text": "string", "source": "document | general_reference", "source_quote": "string | null" }],
    "emergency": [{ "id": "ge-1", "text": "string", "source": "document | general_reference", "source_quote": "string | null" }]
  },
  "recovery_checklist": [{ "id": "ck-1", "task": "string (plain action)", "category": "medication | appointment | lab | imaging | activity | wound_care | diet | other", "timeframe": "string | null (exactly as the document states)", "due_date": "string | null (ONLY an explicit calendar date in the document, ISO YYYY-MM-DD)", "source_quote": "string | null" }],
  "follow_up": [{ "id": "fu-1", "provider_name": "string | null", "specialty": "string | null", "clinic_name": "string | null", "phone": "string | null", "address": "string | null", "appointment_date": "string | null", "appointment_time": "string | null", "timeframe": "string | null", "reason": "string | null" }],
  "ordered_tests": [{ "id": "ts-1", "name": "string", "type": "lab | imaging | other", "simple_explanation": "string | null", "timing": "string | null", "instructions": "string | null", "location": "string | null" }],
  "financial_information": [{ "id": "fi-1", "label": "string (e.g. Account number, Insurance, Copay, Amount due)", "value": "string | null", "note": "string | null" }],
  "uncertain_fields": [{ "field": "string", "reason": "string | null" }],
  "verification_required": "boolean",
  "analysis_notes": "string | null"
}`;
