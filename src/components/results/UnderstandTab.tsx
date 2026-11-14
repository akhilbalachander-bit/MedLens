"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronDown, FileText, MessageSquareText, Pill, Sparkles, Stethoscope, AlertTriangle } from "lucide-react";
import { useMedLens } from "@/lib/store";
import { ListenBar, SpeakButton } from "../speech/ListenControls";
import { Badge, Card, cx, Notice, SectionTitle } from "../ui";
import { joinSpeech, Localized } from "./shared";

const CATEGORY_LABEL: Record<string, string> = {
  activity: "Activity",
  diet: "Food & drink",
  wound_care: "Wound care",
  medication: "Medication",
  symptoms: "Symptoms",
  follow_up: "Follow-up",
  general: "General",
  other: "Other",
};

export function UnderstandTab() {
  const { analysis, t, language } = useMedLens();
  const a = analysis!;
  const nonEn = language.code !== "en";

  const summaryText = joinSpeech([t("ui.whatHappened"), t("summary.simple", a.patient_summary.simple_english)]);
  const diagnosesText = joinSpeech([t("ui.diagnoses"), ...a.diagnoses.map((d) => `${d.original_term}: ${t(`dx.${d.id}`, d.simple_explanation)}`)]);
  const instructionsText = joinSpeech([t("ui.simpleWords"), ...a.instructions.map((i) => t(`ins.${i.id}.simple`, i.simple ?? i.original))]);
  const medsText = joinSpeech([
    t("ui.medications"),
    ...a.medications.map((m) => joinSpeech([`${m.name} ${m.strength ?? ""}`, t(`med.${m.id}.simple`, m.instructions_simple ?? m.instructions_original)])),
  ]);
  const glossaryText = joinSpeech([t("ui.glossary"), ...a.glossary.map((g) => `${g.term}: ${t(`gl.${g.id}`, g.simple_definition)}`)]);
  const fullText = joinSpeech([summaryText, diagnosesText, medsText, instructionsText, glossaryText, t("ui.notDiagnosis")]);

  return (
    <div className="space-y-5">
      <ListenBar full={{ id: "understand-all", label: "Understand your health (everything)", text: fullText }} sticky={false} />

      {/* A. What happened */}
      <Card id="what-happened">
        <SectionTitle
          icon={<Sparkles className="h-5 w-5" />}
          action={<SpeakButton req={{ id: "summary", label: t("ui.whatHappened"), text: summaryText }} />}
        >
          <Localized as="span">{t("ui.whatHappened")}</Localized>
        </SectionTitle>
        {a.patient_summary.simple_english ? (
          <Localized as="p" className="text-xl leading-relaxed text-ink">
            {t("summary.simple", a.patient_summary.simple_english)}
          </Localized>
        ) : (
          <Notice tone="info">Your document does not include a visit summary, so MedLens did not write one. See the instructions below.</Notice>
        )}
        {a.patient_summary.original && (
          <OriginalToggle label={t("ui.docSays")} text={a.patient_summary.original} />
        )}
        {a.diagnoses.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-semibold text-ink">
                <Stethoscope className="h-4 w-4 text-brand-700" /> <Localized as="span">{t("ui.diagnoses")}</Localized>
              </h3>
              <SpeakButton req={{ id: "diagnoses", label: t("ui.diagnoses"), text: diagnosesText }} />
            </div>
            <ul className="space-y-2">
              {a.diagnoses.map((d) => (
                <li key={d.id} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-sm font-medium text-ink-soft">{d.original_term}</p>
                  {d.simple_explanation && <Localized as="p" className="mt-0.5 text-ink">{t(`dx.${d.id}`, d.simple_explanation)}</Localized>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Medications snapshot */}
      {a.medications.length > 0 && (
        <Card>
          <SectionTitle
            icon={<Pill className="h-5 w-5" />}
            action={<SpeakButton req={{ id: "meds", label: t("ui.medications"), text: medsText }} />}
          >
            <Localized as="span">{t("ui.medications")}</Localized>
          </SectionTitle>
          <ul className="divide-y divide-slate-100">
            {a.medications.map((m) => (
              <li key={m.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink">
                    {m.name} {m.strength}
                  </span>
                  {m.status !== "unknown" && (
                    <Badge tone={m.status === "stop" ? "red" : m.status === "changed" ? "amber" : m.status === "new" ? "blue" : "slate"}>
                      {m.status === "continue" ? "Keep taking" : m.status === "stop" ? "Stop" : m.status === "changed" ? "Changed" : "New"}
                    </Badge>
                  )}
                  {m.needs_verification && (
                    <Badge tone="amber">
                      <AlertTriangle className="h-3 w-3" /> Check with pharmacist
                    </Badge>
                  )}
                </div>
                {(m.instructions_simple || m.instructions_original) && (
                  <Localized as="p" className="mt-1 text-ink">
                    {t(`med.${m.id}.simple`, m.instructions_simple ?? m.instructions_original)}
                  </Localized>
                )}
              </li>
            ))}
          </ul>
          <Link href="/medications" className="mt-3 inline-block text-sm font-semibold text-brand-800 underline">
            See full medication details
          </Link>
        </Card>
      )}

      {/* B. Original vs simplified */}
      <Card id="instructions">
        <SectionTitle
          icon={<MessageSquareText className="h-5 w-5" />}
          action={<SpeakButton req={{ id: "instructions", label: "Instructions", text: instructionsText }} label="Listen to all" />}
        >
          Your instructions
        </SectionTitle>
        {a.instructions.length === 0 ? (
          <Notice tone="info">No care instructions were found in your document.</Notice>
        ) : (
          <>
            <div className="mb-2 hidden grid-cols-2 gap-4 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted md:grid">
              <Localized as="span">{t("ui.docSays")}</Localized>
              <Localized as="span">{t("ui.simpleWords")}</Localized>
            </div>
            <ul className="space-y-3">
              {a.instructions.map((ins) => (
                <li key={ins.id} className="grid gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-2 md:gap-4">
                  <div>
                    <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-ink-muted md:hidden">
                      <FileText className="h-3.5 w-3.5" /> <Localized as="span">{t("ui.docSays")}</Localized>
                    </p>
                    <Badge>{CATEGORY_LABEL[ins.category]}</Badge>
                    <p className="mt-1 font-mono text-sm text-ink-soft">{ins.original}</p>
                    {nonEn && t(`ins.${ins.id}.orig`) !== ins.original && (
                      <Localized as="p" className="mt-1 text-xs text-ink-muted">
                        {t("ui.directTranslation")}: {t(`ins.${ins.id}.orig`)}
                      </Localized>
                    )}
                  </div>
                  <div className="rounded-lg bg-brand-50/70 p-2.5">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-800 md:hidden">
                      <Localized as="span">{t("ui.simpleWords")}</Localized>
                    </p>
                    <Localized as="p" className="text-lg leading-snug text-ink">
                      {t(`ins.${ins.id}.simple`, ins.simple ?? ins.original)}
                    </Localized>
                    <SpeakButton
                      className="mt-2"
                      req={{ id: `ins-${ins.id}`, label: CATEGORY_LABEL[ins.category], text: t(`ins.${ins.id}.simple`, ins.simple ?? ins.original) }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {/* E. Glossary */}
      <Glossary />

      <p className="text-center text-sm text-ink-muted">
        <Localized as="span">{t("ui.notDiagnosis")}</Localized>
      </p>
    </div>
  );
}

function OriginalToggle({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-sm font-medium text-brand-800" aria-expanded={open}>
        <ChevronDown className={cx("h-4 w-4 transition", open && "rotate-180")} /> <Localized as="span">{label}</Localized>
      </button>
      {open && <p className="mt-2 rounded-lg bg-slate-50 p-3 font-mono text-sm text-ink-soft">{text}</p>}
    </div>
  );
}

function Glossary() {
  const { analysis, t, language } = useMedLens();
  const items = useMemo(
    () => [...analysis!.glossary].sort((x, y) => Number(y.appears_in_document) - Number(x.appears_in_document)),
    [analysis],
  );
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const allOpen = items.length > 0 && items.every((g) => open[g.id!]);
  if (items.length === 0)
    return (
      <Card>
        <SectionTitle icon={<BookOpen className="h-5 w-5" />}>{t("ui.glossary")}</SectionTitle>
        <p className="text-ink-muted">No confusing medical terms were found in your document.</p>
      </Card>
    );
  return (
    <Card id="glossary">
      <SectionTitle
        icon={<BookOpen className="h-5 w-5" />}
        action={
          <button
            className="text-sm font-medium text-brand-800 underline"
            onClick={() => setOpen(allOpen ? {} : Object.fromEntries(items.map((g) => [g.id!, true])))}
          >
            {allOpen ? "Hide all" : "Show all"}
          </button>
        }
      >
        <Localized as="span">{t("ui.glossary")}</Localized>
      </SectionTitle>
      <p className="mb-3 text-sm text-ink-muted">Tap a word to see what it means.</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((g) => {
          const isOpen = !!open[g.id!];
          const def = t(`gl.${g.id}`, g.simple_definition);
          return (
            <li key={g.id} className={cx("rounded-2xl border transition", isOpen ? "border-brand-300 bg-brand-50/60" : "border-slate-200 bg-white")}>
              <button
                className="flex w-full items-center justify-between gap-2 p-3 text-left"
                onClick={() => setOpen((o) => ({ ...o, [g.id!]: !o[g.id!] }))}
                aria-expanded={isOpen}
              >
                <span className="font-semibold text-ink">{g.term}</span>
                <ChevronDown className={cx("h-4 w-4 shrink-0 text-ink-muted transition", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <div className="px-3 pb-3">
                  <Localized as="p" className="text-ink">{def}</Localized>
                  {language.code !== "en" && def !== g.simple_definition && (
                    <p className="mt-1 text-xs text-ink-muted">English: {g.simple_definition}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <SpeakButton req={{ id: `gl-${g.id}`, label: g.term, text: `${g.term}. ${def}` }} />
                    {!g.appears_in_document && <Badge>Related term</Badge>}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
