import type { Analysis, AnalysisResult } from "../schema";

/**
 * FICTIONAL sample document. The patient, hospital, doctors and phone numbers
 * are invented (555-01xx numbers are reserved for fiction). It exists so
 * people can explore MedLens without uploading anything.
 */
export const SAMPLE_DOCUMENT = {
  facility: "Maple Valley General Hospital — Emergency Department",
  address: "1200 Orchard Way, Maple Valley (fictional)",
  title: "EMERGENCY DEPARTMENT DISCHARGE INSTRUCTIONS",
  patient: "Jordan Rivera (SAMPLE PATIENT)",
  mrn: "MV-SAMPLE-0042",
  account: "MV-0042-7781",
  visitDate: "11/10/2026",
  dischargeDate: "11/10/2026",
  attending: "Dr. Elena Park, MD (Emergency Medicine)",
  insurance: "Self-pay",
  sections: [
    {
      heading: "Diagnosis",
      lines: [
        "1. Acute gastroenteritis with mild dehydration",
        "2. Subcutaneous hematoma, left forearm (s/p mechanical fall). X-ray L forearm: no acute fracture.",
      ],
    },
    {
      heading: "Clinical Summary",
      lines: [
        "Pt presented with 2 days of N/V/D and presyncope at home resulting in a mechanical fall onto L forearm. Received 2L NS IV and ondansetron 4 mg IV with symptom improvement. Tolerating PO fluids prior to discharge. Labs notable for mild hypokalemia (K 3.3) and elevated BUN/Cr consistent with prerenal azotemia. Discharged in stable condition.",
      ],
    },
    {
      heading: "Medications",
      lines: [
        "NEW: Ondansetron ODT 4 mg — dissolve 1 tab on tongue q8h PRN nausea/vomiting. Disp #12, 0 refills.",
        "NEW: Acetaminophen 500 mg tab — take 1–2 tabs PO q6h PRN pain. Do not exceed 3,000 mg in 24 hrs.",
        "NEW: Oral rehydration solution — sip 8 oz after each loose stool.",
        "CHANGED: Lisinopril 10 mg tab — HOLD x 48 hrs. Resume when eating and drinking normally.",
        "AVOID: NSAIDs (ibuprofen, naproxen) until kidney function rechecked.",
      ],
    },
    {
      heading: "Instructions",
      lines: [
        "Advance diet as tolerated; start with clear liquids, then bland foods (BRAT).",
        "Maintain adequate PO hydration. Monitor urine output.",
        "Apply ice to L forearm 20 min q2–3h x 48 hrs; elevate extremity.",
        "Rise slowly from lying/sitting. Avoid driving while lightheaded.",
        "Hand hygiene; avoid preparing food for others until 48 hrs symptom-free.",
      ],
    },
    {
      heading: "Expected Course",
      lines: [
        "Loose stools may persist for several days. Mild fatigue and decreased appetite are expected.",
        "Bruising of the forearm may spread and change color (purple → green/yellow) over 1–2 weeks.",
      ],
    },
    {
      heading: "Call your doctor if",
      lines: [
        "Unable to keep down liquids for more than 12 hours; fever ≥ 101°F (38.3°C); diarrhea lasting more than 3 days; decreased urination; forearm swelling, numbness or pain that worsens.",
      ],
    },
    {
      heading: "Return to the ER / Call 911 if",
      lines: [
        "Fainting or passing out; blood in vomit or stool, or black tarry stools; severe or constant abdominal pain; confusion or extreme drowsiness; no urine for 8 hours or more; fingers on the L hand become cold, pale or blue.",
      ],
    },
    {
      heading: "Follow-up",
      lines: [
        "PCP: Dr. Priya Nair, Maple Valley Family Medicine — (555) 013-4422 — within 2–3 days.",
        "Labs: Basic metabolic panel (BMP) at PCP visit to recheck potassium and kidney function.",
        "Imaging: Repeat L forearm X-ray only if pain not improving in 7–10 days, per PCP.",
      ],
    },
  ],
  footer: "THIS IS A FICTIONAL SAMPLE DOCUMENT CREATED FOR THE MEDLENS DEMO. NOT A REAL PATIENT RECORD.",
};

export const SAMPLE_ANALYSIS: Analysis = {
  document_type: "discharge_summary",
  extraction_status: "success",
  document_language: "English",
  facility_name: "Maple Valley General Hospital — Emergency Department",
  visit_date: "11/10/2026",
  discharge_date: "11/10/2026",
  visit_reason: "Stomach illness with vomiting and diarrhea, and a fall that hurt your left arm.",
  patient_summary: {
    original:
      "Pt presented with 2 days of N/V/D and presyncope at home resulting in a mechanical fall onto L forearm. Received 2L NS IV and ondansetron 4 mg IV with symptom improvement. Tolerating PO fluids prior to discharge. Discharged in stable condition.",
    simple_english:
      "You went to the emergency room because you had been throwing up and had diarrhea for 2 days, and you felt faint and fell on your left arm. The doctors gave you fluids through a vein and medicine for nausea, and you felt better. Your arm X-ray showed no broken bone, and you were well enough to go home.",
  },
  diagnoses: [
    {
      id: "dx-1",
      original_term: "Acute gastroenteritis with mild dehydration",
      simple_explanation:
        "A sudden stomach and bowel illness (often called a stomach bug). It caused vomiting and diarrhea, and your body lost more water than it should.",
    },
    {
      id: "dx-2",
      original_term: "Subcutaneous hematoma, left forearm (s/p mechanical fall)",
      simple_explanation: "A deep bruise under the skin of your left forearm from your fall. The X-ray showed no broken bone.",
    },
  ],
  medications: [
    {
      id: "med-1",
      name: "Ondansetron ODT",
      brand_name: "Zofran ODT",
      generic_name: "ondansetron",
      strength: "4 mg",
      dose: "1 tablet",
      route: "Dissolve on tongue",
      frequency: "Every 8 hours as needed",
      duration: null,
      quantity: "12 tablets",
      refills: "0",
      purpose: "Nausea and vomiting",
      instructions_original: "Dissolve 1 tab on tongue q8h PRN nausea/vomiting. Disp #12, 0 refills.",
      instructions_simple:
        "If you feel sick to your stomach or throw up, let 1 tablet melt on your tongue. You can take it every 8 hours if you need it.",
      warnings: [],
      status: "new",
      confidence: "high",
      needs_verification: false,
      verification_reason: null,
    },
    {
      id: "med-2",
      name: "Acetaminophen",
      brand_name: "Tylenol",
      generic_name: "acetaminophen",
      strength: "500 mg",
      dose: "1–2 tablets",
      route: "By mouth",
      frequency: "Every 6 hours as needed",
      duration: null,
      quantity: null,
      refills: null,
      purpose: "Pain",
      instructions_original: "Take 1–2 tabs PO q6h PRN pain. Do not exceed 3,000 mg in 24 hrs.",
      instructions_simple:
        "For pain, take 1 or 2 tablets by mouth. Wait at least 6 hours between doses. Do not take more than 3,000 mg in 24 hours (that is 6 tablets).",
      warnings: [
        "Do not take more than 3,000 mg in 24 hours.",
        "Many cold and flu medicines also contain acetaminophen. Ask your pharmacist before taking them together.",
      ],
      status: "new",
      confidence: "high",
      needs_verification: false,
      verification_reason: null,
    },
    {
      id: "med-3",
      name: "Oral rehydration solution",
      brand_name: null,
      generic_name: null,
      strength: null,
      dose: "8 oz",
      route: "By mouth",
      frequency: "After each loose stool",
      duration: null,
      quantity: null,
      refills: null,
      purpose: "To replace water and salts lost from diarrhea",
      instructions_original: "Sip 8 oz after each loose stool.",
      instructions_simple: "Each time you have diarrhea, slowly drink 8 ounces (1 cup) of the rehydration drink.",
      warnings: [],
      status: "new",
      confidence: "high",
      needs_verification: false,
      verification_reason: null,
    },
    {
      id: "med-4",
      name: "Lisinopril",
      brand_name: null,
      generic_name: "lisinopril",
      strength: "10 mg",
      dose: "1 tablet",
      route: "By mouth",
      frequency: null,
      duration: "Hold for 48 hours",
      quantity: null,
      refills: null,
      purpose: null,
      instructions_original: "HOLD x 48 hrs. Resume when eating and drinking normally.",
      instructions_simple:
        "Do not take your lisinopril for the next 2 days (48 hours). Start taking it again when you are eating and drinking normally.",
      warnings: [],
      status: "changed",
      confidence: "high",
      needs_verification: true,
      verification_reason:
        "This changes a medicine you already take. Confirm exactly when to restart it with your doctor or pharmacist.",
    },
  ],
  instructions: [
    {
      id: "ins-1",
      category: "diet",
      original: "Advance diet as tolerated; start with clear liquids, then bland foods (BRAT).",
      simple:
        "Start with clear drinks like water or broth. When that stays down, slowly add plain foods like bananas, rice, applesauce and toast.",
    },
    {
      id: "ins-2",
      category: "diet",
      original: "Maintain adequate PO hydration. Monitor urine output.",
      simple: "Keep drinking fluids. Pay attention to how often you pee — peeing less can mean you need more fluids.",
    },
    {
      id: "ins-3",
      category: "wound_care",
      original: "Apply ice to L forearm 20 min q2–3h x 48 hrs; elevate extremity.",
      simple:
        "For the next 2 days, put ice on your left forearm for 20 minutes every 2 to 3 hours. Keep your arm raised up on a pillow when you can.",
    },
    {
      id: "ins-4",
      category: "activity",
      original: "Rise slowly from lying/sitting. Avoid driving while lightheaded.",
      simple: "Stand up slowly. Do not drive if you feel dizzy or lightheaded.",
    },
    {
      id: "ins-5",
      category: "general",
      original: "Hand hygiene; avoid preparing food for others until 48 hrs symptom-free.",
      simple:
        "Wash your hands often. Do not make food for other people until you have had no symptoms for 2 full days (48 hours).",
    },
    {
      id: "ins-6",
      category: "medication",
      original: "AVOID: NSAIDs (ibuprofen, naproxen) until kidney function rechecked.",
      simple:
        "Do not take ibuprofen (Advil, Motrin) or naproxen (Aleve) until your doctor rechecks your kidneys with a blood test.",
    },
  ],
  glossary: [
    { id: "gl-1", term: "Acute gastroenteritis", simple_definition: "A sudden illness of the stomach and bowels that causes vomiting and diarrhea. Often called a stomach bug.", appears_in_document: true },
    { id: "gl-2", term: "Subcutaneous hematoma", simple_definition: "A collection of blood under the skin, often called a deep bruise.", appears_in_document: true },
    { id: "gl-3", term: "Presyncope", simple_definition: "Feeling like you are about to faint — dizzy, lightheaded or weak.", appears_in_document: true },
    { id: "gl-4", term: "N/V/D", simple_definition: "Short for nausea, vomiting and diarrhea.", appears_in_document: true },
    { id: "gl-5", term: "PRN", simple_definition: "Only when you need it. Not on a fixed schedule.", appears_in_document: true },
    { id: "gl-6", term: "q8h / q6h", simple_definition: "Every 8 hours / every 6 hours.", appears_in_document: true },
    { id: "gl-7", term: "PO", simple_definition: "By mouth.", appears_in_document: true },
    { id: "gl-8", term: "ODT", simple_definition: "Orally disintegrating tablet — a pill that melts on your tongue without water.", appears_in_document: true },
    { id: "gl-9", term: "Hypokalemia", simple_definition: "Potassium in your blood is lower than normal. Potassium helps your muscles and heart work.", appears_in_document: true },
    { id: "gl-10", term: "Prerenal azotemia", simple_definition: "Blood tests show your kidneys are stressed because your body did not have enough fluid.", appears_in_document: true },
    { id: "gl-11", term: "NSAIDs", simple_definition: "A group of pain medicines that includes ibuprofen and naproxen.", appears_in_document: true },
    { id: "gl-12", term: "BMP (basic metabolic panel)", simple_definition: "A blood test that checks your kidneys, blood sugar and body salts like potassium.", appears_in_document: true },
  ],
  recovery_guidance: {
    document_has_guidance: true,
    note: null,
    expected: [
      { id: "gx-1", text: "Loose stools may continue for several days.", source: "document", source_quote: "Loose stools may persist for several days." },
      { id: "gx-2", text: "Feeling a little tired and not very hungry.", source: "document", source_quote: "Mild fatigue and decreased appetite are expected." },
      {
        id: "gx-3",
        text: "The bruise on your forearm may spread and change color from purple to green or yellow over 1 to 2 weeks.",
        source: "document",
        source_quote: "Bruising of the forearm may spread and change color (purple → green/yellow) over 1–2 weeks.",
      },
    ],
    contact_provider: [
      { id: "gc-1", text: "You cannot keep liquids down for more than 12 hours.", source: "document", source_quote: "Unable to keep down liquids for more than 12 hours" },
      { id: "gc-2", text: "You have a fever of 101°F (38.3°C) or higher.", source: "document", source_quote: "fever ≥ 101°F (38.3°C)" },
      { id: "gc-3", text: "Diarrhea lasts more than 3 days.", source: "document", source_quote: "diarrhea lasting more than 3 days" },
      { id: "gc-4", text: "You are peeing less than usual.", source: "document", source_quote: "decreased urination" },
      { id: "gc-5", text: "Swelling, numbness or pain in your forearm gets worse.", source: "document", source_quote: "forearm swelling, numbness or pain that worsens" },
    ],
    emergency: [
      { id: "ge-1", text: "You faint or pass out.", source: "document", source_quote: "Fainting or passing out" },
      { id: "ge-2", text: "Blood in your vomit or stool, or black, tar-like stool.", source: "document", source_quote: "blood in vomit or stool, or black tarry stools" },
      { id: "ge-3", text: "Severe or constant belly pain.", source: "document", source_quote: "severe or constant abdominal pain" },
      { id: "ge-4", text: "Confusion or being extremely sleepy.", source: "document", source_quote: "confusion or extreme drowsiness" },
      { id: "ge-5", text: "No pee for 8 hours or more.", source: "document", source_quote: "no urine for 8 hours or more" },
      { id: "ge-6", text: "Fingers on your left hand turn cold, pale or blue.", source: "document", source_quote: "fingers on the L hand become cold, pale or blue" },
      { id: "ge-7", text: "Trouble breathing, chest pain, or signs of a severe allergic reaction such as swelling of the face or throat.", source: "general_reference", source_quote: null },
    ],
  },
  recovery_checklist: [
    { id: "ck-1", task: "Pick up your new medicines (ondansetron ODT and acetaminophen) and oral rehydration solution.", category: "medication", timeframe: null, due_date: null, source_quote: null },
    { id: "ck-2", task: "Do not take lisinopril for 48 hours. Restart it when you are eating and drinking normally.", category: "medication", timeframe: "For 48 hours", due_date: null, source_quote: "HOLD x 48 hrs. Resume when eating and drinking normally." },
    { id: "ck-3", task: "Call Dr. Priya Nair at (555) 013-4422 to schedule your follow-up visit.", category: "appointment", timeframe: "Within 2–3 days", due_date: null, source_quote: "within 2–3 days" },
    { id: "ck-4", task: "Get your basic metabolic panel (BMP) blood test at your follow-up visit.", category: "lab", timeframe: "At your follow-up visit (within 2–3 days)", due_date: null, source_quote: "Labs: Basic metabolic panel (BMP) at PCP visit" },
    { id: "ck-5", task: "Ice your left forearm for 20 minutes every 2–3 hours and keep it raised.", category: "wound_care", timeframe: "For 48 hours", due_date: null, source_quote: "Apply ice to L forearm 20 min q2–3h x 48 hrs" },
    { id: "ck-6", task: "Drink 8 oz of oral rehydration solution after each loose stool, and keep drinking fluids.", category: "diet", timeframe: null, due_date: null, source_quote: null },
    { id: "ck-7", task: "Avoid ibuprofen and naproxen until your kidney blood test is rechecked.", category: "medication", timeframe: "Until kidney function is rechecked", due_date: null, source_quote: "AVOID: NSAIDs (ibuprofen, naproxen) until kidney function rechecked." },
    { id: "ck-8", task: "If your forearm pain is not getting better, ask Dr. Nair whether you need a repeat X-ray.", category: "imaging", timeframe: "If not improving in 7–10 days", due_date: null, source_quote: "Repeat L forearm X-ray only if pain not improving in 7–10 days, per PCP." },
  ],
  follow_up: [
    {
      id: "fu-1",
      provider_name: "Dr. Priya Nair",
      specialty: "Primary care (PCP)",
      clinic_name: "Maple Valley Family Medicine",
      phone: "(555) 013-4422",
      address: null,
      appointment_date: null,
      appointment_time: null,
      timeframe: "Within 2–3 days",
      reason: "Check how you are recovering and recheck your potassium and kidney blood tests.",
    },
  ],
  ordered_tests: [
    {
      id: "ts-1",
      name: "Basic metabolic panel (BMP)",
      type: "lab",
      simple_explanation:
        "A common blood test from one small tube of blood. It checks your kidneys, blood sugar and body salts like potassium, which were off during this visit.",
      timing: "At your follow-up visit within 2–3 days",
      instructions: null,
      location: "Primary care office (Dr. Nair)",
    },
    {
      id: "ts-2",
      name: "X-ray, left forearm (repeat — only if needed)",
      type: "imaging",
      simple_explanation:
        "A quick picture of the bones in your arm. Your first X-ray showed no broken bone. A second one is only needed if your pain does not improve.",
      timing: "Only if pain is not improving in 7–10 days, as decided by your doctor",
      instructions: null,
      location: null,
    },
  ],
  financial_information: [
    { id: "fi-1", label: "Account number", value: "MV-0042-7781", note: null },
    { id: "fi-2", label: "Insurance", value: "Self-pay", note: "No insurance was listed. You may qualify for financial assistance — see Bill Shield." },
  ],
  uncertain_fields: [
    { field: "Medication: Lisinopril", reason: "Restart timing depends on how you feel; confirm with your doctor or pharmacist." },
  ],
  verification_required: true,
  analysis_notes: "Fictional sample document.",
};

export function sampleResult(source: "sample" | "mock" = "sample", fileNames: string[] = ["sample-discharge.pdf"]): AnalysisResult {
  return {
    ...SAMPLE_ANALYSIS,
    meta: {
      source,
      provider: source === "mock" ? "mock" : null,
      model: null,
      analyzed_at: new Date().toISOString(),
      page_count: fileNames.length,
      file_names: fileNames,
    },
  };
}
