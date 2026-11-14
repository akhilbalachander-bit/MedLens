/** Plain-language reference for commonly ordered tests and how to shop for them. */
export type TestRef = { match: RegExp; explain: string; shoppable: boolean; typicalNote?: string };

const REF: TestRef[] = [
  { match: /\b(bmp|basic metabolic)\b/i, explain: "A blood test that checks your kidneys, blood sugar and body salts like potassium.", shoppable: true },
  { match: /\b(cmp|comprehensive metabolic)\b/i, explain: "A blood test that checks your kidneys, liver, blood sugar and body salts.", shoppable: true },
  { match: /\b(cbc|complete blood count)\b/i, explain: "A blood test that counts your red cells, white cells and platelets.", shoppable: true },
  { match: /\b(a1c|hba1c|hemoglobin a1c)\b/i, explain: "A blood test that shows your average blood sugar over about 3 months.", shoppable: true },
  { match: /\b(lipid|cholesterol)\b/i, explain: "A blood test that measures cholesterol and other fats in your blood.", shoppable: true },
  { match: /\b(tsh|thyroid)\b/i, explain: "A blood test that checks how your thyroid gland is working.", shoppable: true },
  { match: /\burinalysis|\bua\b/i, explain: "A test of your urine (pee) for signs of infection, kidney problems or sugar.", shoppable: true },
  { match: /\bx-?ray\b/i, explain: "A quick picture of the inside of your body, often of bones or lungs, using a small amount of radiation.", shoppable: true },
  { match: /\bmri\b/i, explain: "A detailed picture made with a strong magnet and radio waves. No radiation. It takes 20–60 minutes and you lie still inside a tube.", shoppable: true, typicalNote: "MRI prices often vary a lot between hospitals and independent imaging centers." },
  { match: /\b(ct|cat) ?scan\b|\bct\b/i, explain: "A detailed X-ray picture taken from many angles. It takes a few minutes.", shoppable: true, typicalNote: "CT prices can vary a lot between facilities." },
  { match: /\bultrasound|sonogram\b/i, explain: "A picture made with sound waves. No radiation.", shoppable: true },
  { match: /\b(ekg|ecg|electrocardiogram)\b/i, explain: "A quick test with stickers on your chest that records your heartbeat.", shoppable: true },
];

export function lookupTest(name: string): TestRef | null {
  return REF.find((r) => r.match.test(name)) ?? null;
}

export const PRICE_RESOURCES = [
  {
    name: "FAIR Health Consumer",
    url: "https://www.fairhealthconsumer.org/",
    description: "Independent, nonprofit estimates of what tests and procedures typically cost in your area.",
  },
  {
    name: "Hospital price transparency",
    url: "https://www.cms.gov/priceTransparency",
    description: "U.S. hospitals must publish prices for shoppable services. Search your hospital's website for its price estimator.",
  },
  {
    name: "Your insurance plan's cost estimator",
    url: null,
    description: "If you have insurance, log in to your plan's website or call the number on your card for in-network prices.",
  },
];
