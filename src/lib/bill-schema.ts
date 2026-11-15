import { z } from "zod";
import { nstr } from "./schema";

const num = z.preprocess((v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const cleaned = v.replace(/[$,\s]/g, "").replace(/^\((.*)\)$/, "-$1");
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}, z.number().nullable());

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

export const BILL_CATEGORIES = [
  "room_and_board",
  "emergency_services",
  "physician_services",
  "laboratory",
  "imaging",
  "pharmacy",
  "supplies",
  "procedures",
  "facility_fee",
  "other",
] as const;

export const BillLineItemSchema = z.object({
  id: nstr,
  service_date: nstr,
  code: nstr,
  description: z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().min(1)),
  category: z
    .preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase() : v), z.enum(BILL_CATEGORIES))
    .catch("other"),
  quantity: num,
  amount: num,
  plain_explanation: nstr,
});

export const BillAnalysisSchema = z.object({
  extraction_status: z
    .preprocess((v) => (typeof v === "string" ? v.toLowerCase() : v), z.enum(["success", "partial", "failed"]))
    .catch("partial"),
  is_itemized: z.boolean().catch(false),
  facility_name: nstr,
  facility_address: nstr,
  facility_phone: nstr,
  patient_account_number: nstr,
  statement_date: nstr,
  service_dates: nstr,
  total_charges: num,
  insurance_payments: num,
  adjustments: num,
  amount_due: num,
  due_date: nstr,
  line_items: lenientArray(BillLineItemSchema),
  terminology: lenientArray(
    z.object({
      term: z.string().min(1),
      explanation: z.string().min(1),
    }),
  ),
  possible_duplicates: lenientArray(
    z.object({
      item_ids: z.array(z.string()).catch([]),
      reason: z.string().min(1),
    }),
  ),
  needs_clarification: lenientArray(
    z.object({
      item_id: nstr,
      reason: z.string().min(1),
    }),
  ),
  plain_summary: nstr,
  uncertain_fields: lenientArray(z.object({ field: z.string().min(1), reason: nstr })),
});

export type BillAnalysis = z.output<typeof BillAnalysisSchema>;
export type BillLineItem = BillAnalysis["line_items"][number];
export type BillAnalysisResult = BillAnalysis & {
  meta: { source: "ai" | "sample" | "mock"; provider: string | null; analyzed_at: string };
};

export function normalizeBill(b: BillAnalysis): BillAnalysis {
  const items = b.line_items.map((li, i) => ({ ...li, id: li.id && /^[\w-]{1,40}$/.test(li.id) ? li.id : `li-${i + 1}` }));
  // enforce unique ids
  const seen = new Set<string>();
  for (const li of items) {
    let id = li.id!;
    let n = 2;
    while (seen.has(id)) id = `${li.id}-${n++}`;
    li.id = id;
    seen.add(id);
  }
  return { ...b, line_items: items };
}

/**
 * Deterministic duplicate detection, run in addition to the model's own
 * suggestions. Identical code/description + date + amount are surfaced
 * *for human review only* — repeated items are often legitimate
 * (e.g. two doses of the same drug).
 */
export function findPossibleDuplicates(items: BillLineItem[]): { item_ids: string[]; reason: string; local: true }[] {
  const groups = new Map<string, BillLineItem[]>();
  for (const li of items) {
    if (li.amount == null) continue;
    const key = [
      (li.code ?? "").toUpperCase(),
      li.description.toLowerCase().replace(/\s+/g, " "),
      li.service_date ?? "",
      li.amount.toFixed(2),
    ].join("|");
    groups.set(key, [...(groups.get(key) ?? []), li]);
  }
  return [...groups.values()]
    .filter((g) => g.length > 1)
    .map((g) => ({
      item_ids: g.map((x) => x.id!),
      // Fixed wording (translated in the UI); the lines themselves are listed under it.
      reason: "These lines have the same description, code, date and amount. This can be legitimate (for example, two doses), but it is worth asking about.",
      local: true as const,
    }));
}

export const BILL_JSON_SHAPE = `{
  "extraction_status": "success | partial | failed",
  "is_itemized": "boolean (does the bill list individual services/charges?)",
  "facility_name": "string | null", "facility_address": "string | null", "facility_phone": "string | null",
  "patient_account_number": "always null (never copy account numbers)", "statement_date": "string | null", "service_dates": "string | null",
  "total_charges": "number | null", "insurance_payments": "number | null", "adjustments": "number | null",
  "amount_due": "number | null", "due_date": "string | null",
  "line_items": [{ "id": "li-1", "service_date": "string | null", "code": "string | null (CPT/HCPCS/revenue code as printed)",
    "description": "string (as printed)", "category": "${BILL_CATEGORIES.join(" | ")}",
    "quantity": "number | null", "amount": "number | null", "plain_explanation": "string | null" }],
  "terminology": [{ "term": "string", "explanation": "string (plain words)" }],
  "possible_duplicates": [{ "item_ids": ["li-1", "li-2"], "reason": "string (neutral; for human review)" }],
  "needs_clarification": [{ "item_id": "string | null", "reason": "string (neutral question the patient could ask)" }],
  "plain_summary": "string | null (3-5 sentences, plain language)",
  "uncertain_fields": [{ "field": "string", "reason": "string | null" }]
}`;
