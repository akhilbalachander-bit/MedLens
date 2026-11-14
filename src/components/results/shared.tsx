"use client";

import { useTr } from "@/lib/i18n";
import Link from "next/link";
import { ScanLine } from "lucide-react";
import { useMedLens } from "@/lib/store";
import { ScanFlow } from "../scan/ScanFlow";
import { Card } from "../ui";

/** Wraps translated content with the right lang/dir attributes (RTL for Arabic etc.). */
export function Localized({ children, className, as: Tag = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "span" | "p" }) {
  const { language } = useMedLens();
  return (
    <Tag lang={language.code} dir={language.rtl ? "rtl" : undefined} className={className}>
      {children}
    </Tag>
  );
}

export function NoAnalysis({ title = "No document scanned yet" }: { title?: string }) {
  const tr = useTr();
  return (
    <Card className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
          <ScanLine className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-ink">{tr(title)}</h1>
          <p className="text-ink-soft">
            {tr("Scan or upload your discharge papers or a medication label to see this page, or try the fictional sample document.")}
          </p>
        </div>
      </div>
      <ScanFlow variant="compact" />
      <p className="text-sm text-ink-muted">
        {tr("Or go to")} <Link className="font-medium text-brand-800 underline" href="/scan">{tr("Scan Documents")}</Link>.
      </p>
    </Card>
  );
}

export function joinSpeech(parts: (string | null | undefined | false)[]) {
  return parts
    .filter((p): p is string => !!p && !!p.trim())
    .map((p) => (/[.!?。！？؟।:]$/.test(p.trim()) ? p.trim() : `${p.trim()}.`))
    .join(" ");
}
