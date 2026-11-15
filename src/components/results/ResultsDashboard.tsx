"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, BookOpen, FileText, HeartPulse, Mic, ScanLine, Wallet, X } from "lucide-react";
import { useMedLens } from "@/lib/store";
import { LanguageSelector, TranslationStatus } from "../LanguageSelector";
import { Badge, btn, cx, Notice } from "../ui";
import { useTr } from "@/lib/i18n";
import { NoAnalysis } from "./shared";
import { UnderstandTab } from "./UnderstandTab";
import { RecoveryTab } from "./RecoveryTab";
import { WalletTab } from "./WalletTab";
import { SampleDocumentView } from "./SampleDocumentView";

const TABS = [
  { id: "understand", label: "Understand Your Health", short: "Understand", icon: BookOpen },
  { id: "recovery", label: "Recovery & Safety", short: "Recovery", icon: HeartPulse },
  { id: "wallet", label: "Wallet & Bill Shield", short: "Wallet", icon: Wallet },
] as const;
type TabId = (typeof TABS)[number]["id"];

const DOC_TYPE: Record<string, string> = {
  discharge_summary: "Discharge papers",
  after_visit_summary: "After-visit summary",
  prescription_label: "Prescription label",
  medication_list: "Medication list",
  lab_results: "Lab results",
  hospital_bill: "Hospital bill",
  other: "Medical document",
  unreadable: "Unreadable document",
};

export function ResultsDashboard() {
  const { analysis, hydrated, t } = useMedLens();
  const tr = useTr();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const fromUrl = params.get("tab") as TabId | null;
  const [tab, setTab] = useState<TabId>(TABS.some((t) => t.id === fromUrl) ? fromUrl! : "understand");
  const [showDoc, setShowDoc] = useState(false);

  useEffect(() => {
    if (fromUrl && TABS.some((t) => t.id === fromUrl)) setTab(fromUrl);
  }, [fromUrl]);

  const select = (id: TabId) => {
    setTab(id);
    router.replace(`${pathname}?tab=${id}`, { scroll: false });
  };

  if (!hydrated) return <div className="h-40 animate-pulse rounded-2xl bg-white" />;
  if (!analysis) return <NoAnalysis />;

  const date = analysis.discharge_date ?? analysis.visit_date;

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{tr(DOC_TYPE[analysis.document_type] ?? "Medical document")}</Badge>
              {analysis.meta.source === "sample" && <Badge tone="amber">{tr("Fictional sample")}</Badge>}
              {analysis.meta.source === "mock" && <Badge tone="amber">{tr("Mock AI — fictional data")}</Badge>}
              {analysis.meta.source === "ai" && analysis.meta.model && <Badge>{tr("Read by AI")}</Badge>}
              {analysis.extraction_status === "partial" && <Badge tone="amber">{tr("Partly readable")}</Badge>}
            </div>
            <h1 className="mt-2 font-display text-4xl font-normal tracking-wide text-ink sm:text-5xl">{analysis.facility_name ? t("facility", analysis.facility_name) : tr("Your document")}</h1>
            <p className="text-sm text-ink-muted">
              {date ? tr("Visit: {date}", { date }) : tr("Visit date not listed")} ·{" "}
              {analysis.meta.page_count === 1 ? tr("1 page") : tr("{count} pages", { count: analysis.meta.page_count })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.meta.source !== "ai" && (
              <button onClick={() => setShowDoc(true)} className={btn.secondary}>
                <FileText className="h-4 w-4" /> {tr("View document")}
              </button>
            )}
            <Link href="/scan" className={btn.secondary}>
              <ScanLine className="h-4 w-4" /> {tr("Scan another")}
            </Link>
            <Link href="/assistant" className={btn.secondary}>
              <Mic className="h-4 w-4" /> {tr("Ask a question")}
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-brand-100 bg-brand-50/60 p-3 sm:flex-row sm:items-center">
          <LanguageSelector />
          <div className="flex-1">
            <TranslationStatus />
            {/* English: explain what the selector does */}
          </div>
        </div>

        {analysis.verification_required && analysis.uncertain_fields.length > 0 && (
          <Notice tone="warning" icon={<AlertTriangle className="h-5 w-5" />}>
            <p className="font-semibold">
              {analysis.uncertain_fields.length === 1
                ? tr("Please double-check this item with your pharmacist or doctor")
                : tr("Please double-check these items with your pharmacist or doctor")}
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {analysis.uncertain_fields.map((u, i) => (
                <li key={i}>
                  <span className="font-medium">{t(`uf.${i}.field`, u.field)}</span>
                  {u.reason ? ` — ${t(`uf.${i}.reason`, u.reason)}` : ""}
                </li>
              ))}
            </ul>
          </Notice>
        )}
      </header>

      <div role="tablist" aria-label={tr("Results")} className="sticky top-[76px] z-20 grid grid-cols-3 gap-1 rounded-full border border-white/10 bg-navy-900/80 p-1 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => select(t.id)}
            className={cx(
              "flex flex-col items-center justify-center gap-1 rounded-full px-2 py-2 text-xs font-semibold transition sm:flex-row sm:gap-2 sm:text-sm",
              tab === t.id ? "bg-[#12b3bf] text-[#021015] shadow-[0_8px_24px_-10px_rgba(18,179,191,0.9)]" : "text-ink-soft hover:bg-white/[0.06] hover:text-white",
            )}
          >
            <t.icon className="h-5 w-5" aria-hidden />
            <span className="sm:hidden">{tr(t.short)}</span>
            <span className="hidden sm:inline">{tr(t.label)}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "understand" && <UnderstandTab />}
        {tab === "recovery" && <RecoveryTab />}
        {tab === "wallet" && <WalletTab />}
      </div>

      {showDoc && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={tr("Sample document")}>
          <div className="relative w-full max-w-2xl">
            <button onClick={() => setShowDoc(false)} className="absolute -top-2 right-0 rounded-full bg-white p-2 shadow" aria-label={tr("Close document")}>
              <X className="h-5 w-5" />
            </button>
            <div className="mt-8">
              <SampleDocumentView />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
