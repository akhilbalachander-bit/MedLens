"use client";

import Link from "next/link";
import { ClipboardList, LayoutDashboard } from "lucide-react";
import { useMedLens } from "@/lib/store";
import { NoAnalysis, Localized, OriginalText } from "@/components/results/shared";
import { EmergencyBanner, FollowUpInfo, RecoveryChecklist, TrafficLight } from "@/components/results/RecoveryTab";
import { SpeakButton } from "@/components/speech/ListenControls";
import { TranslationStatus } from "@/components/LanguageSelector";
import { btn, Card, SectionTitle } from "@/components/ui";
import { useTr } from "@/lib/i18n";

export default function InstructionsPage() {
  const { analysis, hydrated, t, language } = useMedLens();
  const tr = useTr();
  if (!hydrated) return null;
  if (!analysis) return <NoAnalysis title="Health Instructions" />;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
            <ClipboardList className="h-7 w-7 text-brand-700" /> {tr("Health Instructions")}
          </h1>
          <p className="mt-1 text-ink-soft">
            {tr("Your care instructions, warning signs and next steps from {place}.", { place: analysis.facility_name ? t("facility", analysis.facility_name) : tr("your document") })}
          </p>
        </div>
        <Link href="/results" className={btn.secondary}>
          <LayoutDashboard className="h-4 w-4" /> {tr("Full results")}
        </Link>
      </div>
      <TranslationStatus />
      <EmergencyBanner />
      <Card>
        <SectionTitle icon={<ClipboardList className="h-5 w-5" />}>{tr("Care instructions")}</SectionTitle>
        {analysis.instructions.length === 0 ? (
          <p className="text-ink-muted">{tr("No care instructions were found in your document.")}</p>
        ) : (
          <ul className="space-y-2">
            {analysis.instructions.map((i) => {
              const simple = t(`ins.${i.id}.simple`, i.simple ?? i.original);
              return (
                <li key={i.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3">
                  <div>
                    <Localized as="p" className="text-lg text-ink">{simple}</Localized>
                    {language.code === "en" ? (
                      <p className="mt-1 font-mono text-xs text-ink-muted">
                        {t("ui.docSays")}: {i.original}
                      </p>
                    ) : (
                      <div className="mt-1 text-xs text-ink-muted">
                        <Localized as="p">
                          {t("ui.docSays")}: {t(`ins.${i.id}.orig`, i.original)}
                        </Localized>
                        <OriginalText text={i.original} />
                      </div>
                    )}
                  </div>
                  <SpeakButton req={{ id: `inst-${i.id}`, label: tr("Instruction"), text: simple }} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <TrafficLight />
      <RecoveryChecklist />
      <FollowUpInfo />
    </div>
  );
}
