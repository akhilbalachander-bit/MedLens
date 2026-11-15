"use client";

import Link from "next/link";
import { useTr } from "@/lib/i18n";
import { useMedLens } from "@/lib/store";

export type LegalSection = { title: string; body: (string | string[])[] };

/** Shared layout for the Privacy Policy and Terms pages (editorial style, translated). */
export function LegalPage({
  eyebrow,
  title,
  lead,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  updated: string;
  sections: LegalSection[];
}) {
  const tr = useTr();
  const { language } = useMedLens();
  return (
    <article className="mx-auto max-w-3xl space-y-8 pb-10">
      <header className="space-y-3">
        <p className="eyebrow">{tr(eyebrow)}</p>
        <h1 className="font-display text-5xl font-normal tracking-wide text-ink sm:text-6xl">{tr(title)}</h1>
        <p className="text-lg text-ink-soft">{tr(lead)}</p>
        <p className="text-sm text-ink-muted">
          {tr("Last updated: {date}", { date: updated })}
          {language.code !== "en" && <> · {tr("Translated for convenience. The English version applies.")}</>}
        </p>
      </header>
      <nav aria-label={tr("On this page")} className="ml-panel p-4">
        <ol className="grid gap-1 text-sm sm:grid-cols-2">
          {sections.map((s, i) => (
            <li key={s.title}>
              <a href={`#s${i + 1}`} className="text-brand-800 hover:underline">
                {String(i + 1).padStart(2, "0")} — {tr(s.title)}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      {sections.map((s, i) => (
        <section key={s.title} id={`s${i + 1}`} className="scroll-mt-24 space-y-3">
          <h2 className="flex items-baseline gap-3 text-xl font-semibold text-ink">
            <span className="text-2xl font-light text-brand-500">{String(i + 1).padStart(2, "0")}</span>
            {tr(s.title)}
          </h2>
          {s.body.map((b, j) =>
            Array.isArray(b) ? (
              <ul key={j} className="list-disc space-y-1.5 pl-5 text-ink-soft">
                {b.map((li) => (
                  <li key={li}>{tr(li)}</li>
                ))}
              </ul>
            ) : (
              <p key={j} className="leading-relaxed text-ink-soft">
                {tr(b)}
              </p>
            ),
          )}
        </section>
      ))}
      <p className="border-t border-white/10 pt-6 text-sm text-ink-muted">
        <Link href="/privacy" className="text-brand-800 hover:underline">
          {tr("Privacy Policy")}
        </Link>{" "}
        ·{" "}
        <Link href="/terms" className="text-brand-800 hover:underline">
          {tr("Terms & Disclaimers")}
        </Link>
      </p>
    </article>
  );
}

export const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "";
