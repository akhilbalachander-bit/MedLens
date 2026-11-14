import type { BillAnalysis, BillAnalysisResult } from "../bill-schema";

/** FICTIONAL sample itemized bill matching the sample discharge visit. */
export const SAMPLE_BILL: BillAnalysis = {
  extraction_status: "success",
  is_itemized: true,
  facility_name: "Maple Valley General Hospital",
  facility_address: "1200 Orchard Way, Maple Valley (fictional)",
  facility_phone: "(555) 013-9000",
  patient_account_number: "MV-0042-7781",
  statement_date: "11/24/2026",
  service_dates: "11/10/2026",
  total_charges: 7548,
  insurance_payments: 0,
  adjustments: 0,
  amount_due: 7548,
  due_date: "12/24/2026",
  line_items: [
    { id: "li-1", service_date: "11/10/2026", code: "99284", description: "ED VISIT LEVEL 4 - PHYSICIAN", category: "physician_services", quantity: 1, amount: 1850, plain_explanation: "The emergency doctor's exam. Level 4 means a fairly complex visit." },
    { id: "li-2", service_date: "11/10/2026", code: "0450", description: "EMERGENCY ROOM - FACILITY LEVEL 4", category: "facility_fee", quantity: 1, amount: 2300, plain_explanation: "The hospital's charge for using the emergency room, separate from the doctor's fee." },
    { id: "li-3", service_date: "11/10/2026", code: "96360", description: "IV HYDRATION INITIAL 31-60 MIN", category: "procedures", quantity: 1, amount: 640, plain_explanation: "Giving you fluids through a vein for up to the first hour." },
    { id: "li-4", service_date: "11/10/2026", code: "96361", description: "IV HYDRATION EA ADDL HR", category: "procedures", quantity: 1, amount: 310, plain_explanation: "Each extra hour of IV fluids after the first hour." },
    { id: "li-5", service_date: "11/10/2026", code: "J7030", description: "NORMAL SALINE SOLUTION 1000 CC", category: "pharmacy", quantity: 2, amount: 170, plain_explanation: "Two 1-liter bags of salt-water IV fluid." },
    { id: "li-6", service_date: "11/10/2026", code: "J2405", description: "ONDANSETRON HCL INJ 1 MG", category: "pharmacy", quantity: 4, amount: 95, plain_explanation: "Anti-nausea medicine given through your IV (4 mg)." },
    { id: "li-7", service_date: "11/10/2026", code: "J2405", description: "ONDANSETRON HCL INJ 1 MG", category: "pharmacy", quantity: 4, amount: 95, plain_explanation: "The same anti-nausea medicine listed again." },
    { id: "li-8", service_date: "11/10/2026", code: "85025", description: "CBC W/AUTO DIFF", category: "laboratory", quantity: 1, amount: 120, plain_explanation: "Complete blood count — a test of your red cells, white cells and platelets." },
    { id: "li-9", service_date: "11/10/2026", code: "80048", description: "BASIC METABOLIC PANEL", category: "laboratory", quantity: 1, amount: 165, plain_explanation: "Blood test for kidneys, sugar and body salts like potassium." },
    { id: "li-10", service_date: "11/10/2026", code: "83690", description: "LIPASE", category: "laboratory", quantity: 1, amount: 140, plain_explanation: "Blood test that checks your pancreas." },
    { id: "li-11", service_date: "11/10/2026", code: "73090", description: "XR FOREARM 2 VIEWS", category: "imaging", quantity: 1, amount: 410, plain_explanation: "X-ray of your forearm, taken from two angles." },
    { id: "li-12", service_date: "11/10/2026", code: "73090-26", description: "XR FOREARM 2 VIEWS - PROF INTERP", category: "imaging", quantity: 1, amount: 95, plain_explanation: "The radiologist's fee for reading your X-ray. The -26 means the doctor's reading part only." },
    { id: "li-13", service_date: "11/10/2026", code: "0270", description: "MED/SURG SUPPLIES - MISC", category: "supplies", quantity: 1, amount: 260, plain_explanation: "General medical supplies. The bill does not say which ones." },
    { id: "li-14", service_date: null, code: "0250", description: "PHARMACY - GENERAL", category: "pharmacy", quantity: 1, amount: 48, plain_explanation: "A general pharmacy charge. The bill does not say what medicine it was." },
    { id: "li-15", service_date: "11/10/2026", code: "36415", description: "VENIPUNCTURE ROUTINE", category: "laboratory", quantity: 1, amount: 45, plain_explanation: "The fee for drawing your blood with a needle." },
    { id: "li-16", service_date: "11/10/2026", code: "Q4051", description: "SPLINT SUPPLIES", category: "supplies", quantity: 1, amount: 805, plain_explanation: "Supplies for a splint (a support to keep a body part still)." },
  ],
  terminology: [
    { term: "CPT / HCPCS code", explanation: "A standard code that names a medical service or supply. You can ask the hospital what any code means." },
    { term: "Revenue code (e.g. 0450, 0270)", explanation: "A 4-digit code hospitals use to group charges by department, like the ER or supplies." },
    { term: "Facility fee", explanation: "What the hospital charges for the room, staff and equipment. It is separate from the doctor's fee." },
    { term: "Professional interpretation (-26)", explanation: "The doctor's fee for reading a test, like an X-ray, separate from the cost of taking it." },
    { term: "Self-pay", explanation: "No insurance paid on this bill, so the full amount is billed to you. Many hospitals offer self-pay discounts." },
    { term: "Adjustment", explanation: "An amount taken off the bill, for example a discount or financial assistance." },
    { term: "Amount due / patient responsibility", explanation: "What the hospital says you owe right now." },
  ],
  possible_duplicates: [],
  needs_clarification: [
    { item_id: "li-13", reason: "\"Misc supplies\" does not say what was used. You can ask for a list of the supplies." },
    { item_id: "li-14", reason: "This pharmacy charge has no date or medicine name. Ask what it was for." },
    { item_id: "li-16", reason: "Your discharge papers do not mention a splint. Ask whether a splint was applied during your visit." },
  ],
  plain_summary:
    "This bill is for one emergency room visit on 11/10/2026. Most of the cost comes from the ER doctor and hospital ER fees, then IV fluids, lab tests and an arm X-ray. No insurance payment is shown, so the full $7,548 is listed as due. A few lines are vague or may be repeated, and it is reasonable to ask the billing office about them before paying. Because no insurance is listed, you may qualify for financial assistance or a self-pay discount.",
  uncertain_fields: [],
};

export function sampleBillResult(source: "sample" | "mock" = "sample"): BillAnalysisResult {
  return { ...SAMPLE_BILL, meta: { source, provider: source === "mock" ? "mock" : null, analyzed_at: new Date().toISOString() } };
}
