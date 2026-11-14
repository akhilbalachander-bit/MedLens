"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardList, Mic, Pill, ShieldCheck, Volume2, Wallet, Languages } from "lucide-react";
import { useMedLens } from "@/lib/store";
import { ScanFlow } from "@/components/scan/ScanFlow";
import { Card } from "@/components/ui";

export default function HomePage() {
  const { analysis, hydrated, provider } = useMedLens();
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Understand your medical paperwork.</h1>
        <p className="mt-2 max-w-2xl text-lg text-ink-soft">
          Scan a prescription label or hospital discharge papers. MedLens explains it in simple words, in your language, and reads it out loud.
        </p>
      </section>

      {hydrated && analysis && (
        <Link
          href="/results"
          className="flex items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 hover:bg-brand-100"
        >
          <span>
            <span className="block text-sm font-medium text-brand-800">Continue where you left off</span>
            <span className="block font-semibold text-ink">
              {analysis.facility_name ?? "Your scanned document"}
              {analysis.meta.source === "sample" && " (sample)"}
            </span>
          </span>
          <ArrowRight className="h-5 w-5 text-brand-800" />
        </Link>
      )}

      <section aria-label="Scan a document">
        <ScanFlow variant="hero" />
        {provider && !provider.configured && (
          <p className="mt-3 text-sm text-ink-muted">
            Tip: this server has no AI key configured yet, so scanning your own documents is turned off. The sample document works fully.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">After you scan</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Feature icon={<BookOpen />} title="Understand your health" text="A simple summary, plain-language instructions and a jargon glossary." />
          <Feature icon={<ClipboardList />} title="Recovery & safety" text="Warning signs sorted green, yellow and red, plus a recovery checklist." />
          <Feature icon={<Wallet />} title="Wallet & Bill Shield" text="Medicine savings, test price tools, bill review and assistance letters." />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink href="/medications" icon={<Pill />} label="My Medications" />
        <QuickLink href="/instructions" icon={<ClipboardList />} label="Health Instructions" />
        <QuickLink href="/assistant" icon={<Mic />} label="Ask the Voice Assistant" />
        <QuickLink href="/settings" icon={<Languages />} label="Language & voice settings" />
      </section>

      <Card className="bg-white">
        <div className="flex gap-3">
          <ShieldCheck className="h-6 w-6 shrink-0 text-brand-700" />
          <div className="text-sm text-ink-soft">
            <p className="font-semibold text-ink">Private by design</p>
            <p>
              No account needed. Your document is analyzed once and not stored by MedLens. Results stay in this browser tab and are cleared when you close it.
              MedLens explains your paperwork; it does not diagnose or replace your care team. <strong>In an emergency, call 911.</strong>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <Card>
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 [&>svg]:h-5 [&>svg]:w-5">{icon}</div>
      <h3 className="font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-ink-soft">{text}</p>
      <p className="mt-2 flex items-center gap-1 text-xs font-medium text-brand-800">
        <Volume2 className="h-3.5 w-3.5" /> Listen in 13+ languages
      </p>
    </Card>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 font-medium text-ink shadow-card hover:border-brand-300 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-brand-700">
      {icon}
      <span className="flex-1">{label}</span>
      <ArrowRight className="h-4 w-4 text-ink-muted" />
    </Link>
  );
}
