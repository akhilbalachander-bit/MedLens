/**
 * Small curated drug reference used by the Prescription Savings panel.
 *
 * Brand/generic relationships are stable public facts. Price ranges are
 * deliberately broad, rounded, *illustrative* estimates of typical U.S. cash
 * prices with a discount card for a short course of the common generic; they
 * are NOT quotes. The UI always labels them as estimates and links to live
 * price-comparison services. Drugs not in this table show "no reference data"
 * rather than a guessed price.
 */
export type DrugRef = {
  generic: string;
  brands: string[];
  genericAvailable: boolean;
  otc?: boolean;
  /** rough typical cash price with a discount card, USD */
  estimate?: { low: number; high: number; basis: string };
  notes?: string;
};

export const DRUG_REFERENCE_REVIEWED = "2026-10";

const REF: DrugRef[] = [
  { generic: "ondansetron", brands: ["Zofran", "Zofran ODT"], genericAvailable: true, estimate: { low: 5, high: 25, basis: "about 12 tablets, 4 mg" } },
  { generic: "acetaminophen", brands: ["Tylenol"], genericAvailable: true, otc: true, estimate: { low: 3, high: 12, basis: "store-brand bottle, over the counter" } },
  { generic: "ibuprofen", brands: ["Advil", "Motrin"], genericAvailable: true, otc: true, estimate: { low: 3, high: 12, basis: "store-brand bottle, over the counter" } },
  { generic: "naproxen", brands: ["Aleve", "Naprosyn"], genericAvailable: true, otc: true },
  { generic: "lisinopril", brands: ["Prinivil", "Zestril"], genericAvailable: true, estimate: { low: 4, high: 15, basis: "30 tablets" } },
  { generic: "amoxicillin", brands: ["Amoxil"], genericAvailable: true, estimate: { low: 5, high: 20, basis: "one 10-day course" } },
  { generic: "amoxicillin-clavulanate", brands: ["Augmentin"], genericAvailable: true, estimate: { low: 10, high: 40, basis: "one 10-day course" } },
  { generic: "cephalexin", brands: ["Keflex"], genericAvailable: true, estimate: { low: 6, high: 25, basis: "one 7–10 day course" } },
  { generic: "azithromycin", brands: ["Zithromax", "Z-Pak"], genericAvailable: true, estimate: { low: 6, high: 25, basis: "one 5-day pack" } },
  { generic: "ciprofloxacin", brands: ["Cipro"], genericAvailable: true },
  { generic: "sulfamethoxazole-trimethoprim", brands: ["Bactrim", "Septra"], genericAvailable: true },
  { generic: "prednisone", brands: ["Deltasone"], genericAvailable: true, estimate: { low: 4, high: 15, basis: "short course" } },
  { generic: "metformin", brands: ["Glucophage"], genericAvailable: true, estimate: { low: 4, high: 15, basis: "30-day supply" } },
  { generic: "atorvastatin", brands: ["Lipitor"], genericAvailable: true, estimate: { low: 5, high: 20, basis: "30-day supply" } },
  { generic: "amlodipine", brands: ["Norvasc"], genericAvailable: true, estimate: { low: 4, high: 15, basis: "30-day supply" } },
  { generic: "omeprazole", brands: ["Prilosec"], genericAvailable: true, otc: true },
  { generic: "famotidine", brands: ["Pepcid"], genericAvailable: true, otc: true },
  { generic: "cyclobenzaprine", brands: ["Flexeril"], genericAvailable: true },
  { generic: "hydrocodone-acetaminophen", brands: ["Norco", "Vicodin"], genericAvailable: true, notes: "Controlled substance. Prices vary widely and some discount programs exclude it." },
  { generic: "oxycodone-acetaminophen", brands: ["Percocet"], genericAvailable: true, notes: "Controlled substance. Prices vary widely and some discount programs exclude it." },
  { generic: "apixaban", brands: ["Eliquis"], genericAvailable: false, notes: "Brand-name pricing is usually much higher. Ask about manufacturer assistance programs." },
  { generic: "albuterol", brands: ["ProAir", "Ventolin", "Proventil"], genericAvailable: true },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

export function lookupDrug(...names: (string | null | undefined)[]): DrugRef | null {
  const candidates = names.filter(Boolean).map((n) => norm(n!));
  for (const ref of REF) {
    const keys = [ref.generic, ...ref.brands].map(norm);
    for (const c of candidates) {
      if (keys.some((k) => c === k || c.startsWith(k) || (k.length > 5 && c.includes(k)))) return ref;
    }
  }
  return null;
}

export function priceLinks(drug: string) {
  const slug = drug.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    goodrx: `https://www.goodrx.com/${slug}`,
    costplus: `https://costplusdrugs.com/medications/`,
    costplusQuery: drug,
  };
}
