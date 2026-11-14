"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Pill, Plus, ScanLine, Trash2, Wallet } from "lucide-react";
import { useTr } from "@/lib/i18n";
import { useMedLens } from "@/lib/store";
import type { Medication } from "@/lib/schema";
import { SpeakButton } from "@/components/speech/ListenControls";
import { Badge, btn, Card, cx, Notice, SectionTitle, Unavailable } from "@/components/ui";
import { joinSpeech, Localized, OriginalText } from "@/components/results/shared";
import { ScanFlow } from "@/components/scan/ScanFlow";
import { TranslationStatus } from "@/components/LanguageSelector";

const STATUS: Record<string, { label: string; tone: "blue" | "amber" | "red" | "slate" }> = {
  new: { label: "New", tone: "blue" },
  changed: { label: "Changed", tone: "amber" },
  stop: { label: "Stop taking", tone: "red" },
  continue: { label: "Keep taking", tone: "slate" },
};

export default function MedicationsPage() {
  const { analysis, hydrated, manualMeds, addManualMed, removeManualMed } = useMedLens();
  const tr = useTr();
  const [form, setForm] = useState({ name: "", dose: "", notes: "" });
  const meds = analysis?.medications ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-4xl font-normal tracking-wide text-ink sm:text-5xl">
            <Pill className="h-7 w-7 text-brand-700" /> {tr("My Medications")}
          </h1>
          <p className="mt-1 text-ink-soft">{tr("Medicines from your scanned paperwork, explained simply.")}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/scan?mode=camera" className={btn.secondary}>
            <ScanLine className="h-4 w-4" /> {tr("Scan a label")}
          </Link>
          {meds.length > 0 && (
            <Link href="/results?tab=wallet" className={btn.secondary}>
              <Wallet className="h-4 w-4" /> {tr("Savings")}
            </Link>
          )}
        </div>
      </div>

      <TranslationStatus />

      {hydrated && !analysis && (
        <Card>
          <p className="mb-3 text-ink-soft">{tr("Scan a prescription bottle or your discharge papers to see your medications here.")}</p>
          <ScanFlow variant="compact" />
        </Card>
      )}
      {analysis && meds.length === 0 && <Notice tone="info">{tr("No medications were found in your scanned document.")}</Notice>}

      {meds.length > 0 && (
        <Notice tone="warning" icon={<AlertTriangle className="h-5 w-5" />}>
          {tr("Always follow the label on your medicine and your pharmacist's directions. Do not start, stop or change a medicine based on this app.")}
        </Notice>
      )}

      <ul className="space-y-4">
        {meds.map((m) => (
          <MedCard key={m.id} m={m} />
        ))}
      </ul>

      <Card>
        <SectionTitle icon={<Plus className="h-5 w-5" />}>{tr("Other medicines you take")}</SectionTitle>
        <p className="mb-3 text-sm text-ink-soft">
          {tr("Add medicines that are not on this document so you can show a full list to your doctor or pharmacist. Saved only in this browser session.")}
        </p>
        {manualMeds.length > 0 && (
          <ul className="mb-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {manualMeds.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-2 p-3">
                <div>
                  <p className="font-semibold text-ink">
                    {m.name} {m.dose && <span className="font-normal text-ink-soft">— {m.dose}</span>}
                  </p>
                  {m.notes && <p className="text-sm text-ink-soft">{m.notes}</p>}
                </div>
                <button onClick={() => removeManualMed(m.id)} className="rounded p-1.5 text-red-700 hover:bg-red-50" aria-label={tr("Remove {name}", { name: m.name })}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="grid gap-2 sm:grid-cols-[1fr_1fr_1.5fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name.trim()) return;
            addManualMed({ name: form.name.trim(), dose: form.dose.trim(), notes: form.notes.trim() });
            setForm({ name: "", dose: "", notes: "" });
          }}
        >
          <input aria-label={tr("Medicine name")} placeholder={tr("Medicine name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" required />
          <input aria-label={tr("Dose")} placeholder={tr("Dose (e.g. 10 mg daily)")} value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
          <input aria-label={tr("Notes")} placeholder={tr("Notes")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
          <button className={btn.primary} type="submit">
            {tr("Add")}
          </button>
        </form>
      </Card>
    </div>
  );
}

function MedCard({ m }: { m: Medication }) {
  const { t, medVerified, setMedVerified, language } = useMedLens();
  const tr = useTr();
  const verified = !!medVerified[m.id!];
  const na = <Unavailable label={t("ui.notInDoc")} />;
  const simple = t(`med.${m.id}.simple`, m.instructions_simple);
  const purpose = t(`med.${m.id}.purpose`, m.purpose);
  const name = t(`med.${m.id}.name`, m.name);
  const speech = joinSpeech([`${name} ${m.strength ?? ""}`, purpose, simple, ...m.warnings.map((w, i) => t(`med.${m.id}.warn.${i}`, w))]);
  const st = STATUS[m.status];
  return (
    <li>
      <Card className={cx(m.needs_verification && !verified && "border-amber-300")}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-ink">
              <Localized as="span">{name}</Localized> {m.strength && <span className="font-semibold text-ink-soft">{m.strength}</span>}
            </h2>
            <div className="mt-1 flex flex-wrap gap-2">
              {st && <Badge tone={st.tone}>{tr(st.label)}</Badge>}
              {m.brand_name && m.brand_name !== m.name && <Badge>{tr("Brand:")} {t(`med.${m.id}.brand`, m.brand_name)}</Badge>}
              {m.generic_name && m.generic_name.toLowerCase() !== m.name.toLowerCase() && <Badge>{tr("Generic:")} {t(`med.${m.id}.generic`, m.generic_name)}</Badge>}
              <Badge tone={m.confidence === "high" ? "green" : m.confidence === "low" ? "red" : "amber"}>{tr(m.confidence === "high" ? "Read confidence: high" : m.confidence === "low" ? "Read confidence: low" : "Read confidence: medium")}</Badge>
            </div>
          </div>
          <SpeakButton req={{ id: `medcard-${m.id}`, label: name, text: speech }} />
        </div>

        {m.needs_verification && (
          <div className={cx("mt-3 rounded-xl border p-3 text-sm", verified ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-950")}>
            <p className="flex items-center gap-2 font-semibold">
              {verified ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {tr(verified ? "You marked this as checked" : "Please verify this medication")}
            </p>
            {m.verification_reason && <Localized as="p" className="mt-1">{t(`med.${m.id}.verify`, m.verification_reason)}</Localized>}
            <label className="mt-2 flex items-center gap-2">
              <input type="checkbox" checked={verified} onChange={(e) => setMedVerified(m.id!, e.target.checked)} className="h-5 w-5 accent-brand-700" />
              {tr("I checked this with my pharmacist or doctor")}
            </label>
          </div>
        )}

        {simple && (
          <Localized as="p" className="mt-3 rounded-xl bg-brand-50/70 p-3 text-lg leading-snug text-ink">
            {simple}
          </Localized>
        )}

        <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-[15px] sm:grid-cols-2">
          {(
            [
              [tr("What it's for"), purpose || na],
              [tr("Dose"), m.dose ? t(`med.${m.id}.dose`, m.dose) : na],
              [tr("How"), m.route ? t(`med.${m.id}.route`, m.route) : na],
              [tr("How often"), m.frequency ? t(`med.${m.id}.frequency`, m.frequency) : na],
              [tr("How long"), m.duration ? t(`med.${m.id}.duration`, m.duration) : na],
              [tr("Quantity"), m.quantity ? t(`med.${m.id}.quantity`, m.quantity) : na],
              [tr("Refills"), m.refills ?? na],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-2">
              <dt className="text-ink-muted">{k}</dt>
              <dd className="text-ink">{typeof v === "string" ? <Localized as="span">{v}</Localized> : v}</dd>
            </div>
          ))}
        </dl>
        {m.instructions_original && (
          <div className="mt-3 text-sm text-ink-soft">
            <Localized as="p">
              <span className="font-medium">{t("ui.docSays")}: </span>
              <span className={language.code === "en" ? "font-mono" : undefined}>{t(`med.${m.id}.orig`, m.instructions_original)}</span>
            </Localized>
            {language.code !== "en" && <OriginalText text={`${m.name}${m.strength ? ` ${m.strength}` : ""}: ${m.instructions_original}`} />}
          </div>
        )}
        {m.warnings.length > 0 && (
          <ul className="mt-3 space-y-1">
            {m.warnings.map((w, i) => (
              <li key={i} className="flex gap-2 text-[15px] text-red-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> <Localized as="span">{t(`med.${m.id}.warn.${i}`, w)}</Localized>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </li>
  );
}
