"use client";

import { ExternalLink, FlaskConical, Info, Pill, Receipt, ShieldAlert, Tags } from "lucide-react";
import { useMedLens } from "@/lib/store";
import { DRUG_REFERENCE_REVIEWED, lookupDrug, priceLinks } from "@/lib/drug-reference";
import { lookupTest, PRICE_RESOURCES } from "@/lib/test-reference";
import type { Medication } from "@/lib/schema";
import { Badge, Card, Notice, SectionTitle } from "../ui";
import { BillAuditor } from "./BillAuditor";
import { LetterGenerator } from "./LetterGenerator";
import { Localized } from "./shared";
import { useTr } from "@/lib/i18n";

export function WalletTab() {
  const { analysis } = useMedLens();
  const tr = useTr();
  const fin = analysis!.financial_information;
  return (
    <div className="space-y-5">
      <Notice tone="info" icon={<Info className="h-5 w-5" />}>
        {tr("These tools help you understand costs and ask good questions. Prices are estimates, not guarantees. Never change or substitute a medicine without talking to your pharmacist or prescriber.")}
      </Notice>
      {fin.length > 0 && (
        <Card>
          <SectionTitle icon={<Receipt className="h-5 w-5" />}>{tr("Billing details on your document")}</SectionTitle>
          <dl className="grid gap-2 sm:grid-cols-2">
            {fin.map((f) => (
              <div key={f.id} className="rounded-xl bg-slate-50 p-3">
                <dt className="text-sm text-ink-muted">{f.label}</dt>
                <dd className="font-semibold text-ink">{f.value ?? tr("Not listed")}</dd>
                {f.note && <dd className="mt-1 text-sm text-ink-soft">{f.note}</dd>}
              </div>
            ))}
          </dl>
        </Card>
      )}
      <PrescriptionSavings />
      <ShoppableFollowUps />
      <BillAuditor />
      <LetterGenerator />
    </div>
  );
}

export function PrescriptionSavings({ meds: medsProp }: { meds?: Medication[] } = {}) {
  const { analysis } = useMedLens();
  const meds = medsProp ?? analysis?.medications ?? [];
  const tr = useTr();
  return (
    <Card id="savings">
      <SectionTitle icon={<Pill className="h-5 w-5" />}>{tr("Prescription savings")}</SectionTitle>
      {meds.length === 0 ? (
        <p className="text-ink-muted">{tr("No medications were found in your document.")}</p>
      ) : (
        <ul className="space-y-3">
          {meds.map((m) => (
            <SavingsRow key={m.id} m={m} />
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-ink-muted">
        {tr("Price ranges are rough estimates of typical U.S. cash prices with a free discount card (reference reviewed {date}). Your price depends on the pharmacy, dose, quantity and insurance. Always check live prices. Ask your pharmacist before switching to a generic or a different pharmacy.", { date: DRUG_REFERENCE_REVIEWED })}
      </p>
    </Card>
  );
}

function SavingsRow({ m }: { m: Medication }) {
  const ref = lookupDrug(m.generic_name, m.name, m.brand_name);
  const searchName = (ref?.generic ?? m.generic_name ?? m.name).replace(/\b(odt|tab|tablet|cap|capsule)s?\b/gi, "").trim();
  const links = priceLinks(searchName);
  const brands = ref?.brands.length ? ref.brands.join(", ") : (m.brand_name ?? null);
  const tr = useTr();
  return (
    <li className="rounded-xl border border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-lg font-semibold text-ink">
          {m.name} {m.strength}
        </span>
        {ref?.otc && <Badge tone="blue">{tr("Also sold over the counter")}</Badge>}
      </div>
      <dl className="mt-2 grid gap-x-4 gap-y-1 text-[15px] sm:grid-cols-2">
        <div>
          <dt className="inline text-ink-muted">{tr("Generic name:")} </dt>
          <dd className="inline text-ink">{ref?.generic ?? m.generic_name ?? tr("Not available in our reference")}</dd>
        </div>
        <div>
          <dt className="inline text-ink-muted">{tr("Brand name(s):")} </dt>
          <dd className="inline text-ink">{brands ?? tr("Not available in our reference")}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="inline text-ink-muted">{tr("Generic available?")} </dt>
          <dd className="inline font-medium text-ink">
            {tr(ref ? (ref.genericAvailable ? "Yes — a generic version exists." : "No generic version in our reference.") : "Unknown — ask your pharmacist.")}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="inline text-ink-muted">{tr("Typical price:")} </dt>
          <dd className="inline text-ink">
            {ref?.estimate ? (
              <>
                <strong>{tr("Estimate {range}", { range: `$${ref.estimate.low}–$${ref.estimate.high}` })}</strong>{" "}
                ({tr(ref.estimate.basis)}, {tr("generic, with discount card")})
              </>
            ) : (
              tr("No reliable price data in our reference — compare live prices below.")
            )}
          </dd>
        </div>
        {ref?.notes && <p className="text-sm text-amber-900 sm:col-span-2">{tr(ref.notes)}</p>}
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        <a href={links.goodrx} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50">
          {tr("Compare on GoodRx")} <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <a href={links.costplus} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50" title={links.costplusQuery}>
          {tr("Search “{query}” on Cost Plus Drugs", { query: links.costplusQuery })} <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </li>
  );
}

function ShoppableFollowUps() {
  const { analysis, t } = useMedLens();
  const tr = useTr();
  const tests = analysis!.ordered_tests;
  return (
    <Card id="shoppable">
      <SectionTitle icon={<FlaskConical className="h-5 w-5" />}>{tr("Shoppable follow-up tests")}</SectionTitle>
      {tests.length === 0 ? (
        <p className="text-ink-muted">{tr("No blood tests, lab work or imaging were ordered in your document.")}</p>
      ) : (
        <>
          <ul className="space-y-3">
            {tests.map((ts) => {
              const ref = lookupTest(ts.name);
              return (
                <li key={ts.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{ts.name}</span>
                    <Badge tone={ts.type === "lab" ? "blue" : "brand"}>{tr(ts.type === "lab" ? "Lab" : ts.type === "imaging" ? "Imaging" : "Test")}</Badge>
                  </div>
                  <Localized as="p" className="mt-1 text-ink">
                    {ts.simple_explanation
                      ? t(`ts.${ts.id}.explain`, ts.simple_explanation)
                      : ref?.explain
                        ? tr(ref.explain)
                        : tr("Ask your doctor what this test is for.")}
                  </Localized>
                  {ts.timing && (
                    <p className="mt-1 text-sm text-ink-soft">
                      {tr("When:")} <Localized as="span">{t(`ts.${ts.id}.timing`, ts.timing)}</Localized>
                    </p>
                  )}
                  {ref?.typicalNote && <p className="mt-1 text-sm text-ink-soft">{tr(ref.typicalNote)}</p>}
                </li>
              );
            })}
          </ul>
          <div className="mt-4 rounded-xl bg-slate-50 p-3">
            <h3 className="flex items-center gap-2 font-semibold text-ink">
              <Tags className="h-4 w-4 text-brand-700" /> {tr("Compare prices and places")}
            </h3>
            <ul className="mt-2 space-y-2 text-sm">
              {PRICE_RESOURCES.map((r) => (
                <li key={r.name}>
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-800 underline">
                      {r.name}
                    </a>
                  ) : (
                    <span className="font-semibold text-ink">{r.name}</span>
                  )}{" "}
                  — <span className="text-ink-soft">{tr(r.description)}</span>
                </li>
              ))}
            </ul>
            <h4 className="mt-3 text-sm font-semibold text-ink">{tr("Questions to ask before you book")}</h4>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-soft">
              <li>{tr("Can my doctor send the order to a different lab or imaging center?")}</li>
              <li>{tr("Is that location in my insurance network? What will I owe?")}</li>
              <li>{tr("Will my doctor get the results quickly enough there?")}</li>
              <li>{tr("Is there a cash or self-pay price?")}</li>
            </ul>
          </div>
          <Notice tone="warning" className="mt-3" icon={<ShieldAlert className="h-5 w-5" />}>
            {tr("A cheaper place is not always the right place. Some tests need to be done at a specific location, by a certain time, or with special equipment. Check with your doctor before moving a test, and make sure the results will reach them.")}
          </Notice>
        </>
      )}
    </Card>
  );
}
