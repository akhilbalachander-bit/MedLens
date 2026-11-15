"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  Home,
  ScanLine,
  Pill,
  ClipboardList,
  Mic,
  Settings,
  LayoutDashboard,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useMedLens } from "@/lib/store";
import { useTr } from "@/lib/i18n";
import { LanguageSelector } from "./LanguageSelector";
import { cx } from "./ui";

const NAV = [
  { href: "/", label: "Home", short: "Home", icon: Home },
  { href: "/scan", label: "Scan", short: "Scan", icon: ScanLine },
  { href: "/medications", label: "Medications", short: "Meds", icon: Pill },
  { href: "/instructions", label: "Instructions", short: "Care", icon: ClipboardList },
  { href: "/assistant", label: "Assistant", short: "Ask", icon: Mic },
  { href: "/settings", label: "Settings", short: "Settings", icon: Settings },
];

export function Logo({ className = "h-9" }: { className?: string }) {
  return (
    <Link href="/" className="inline-flex shrink-0 items-center" aria-label="MedLens home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/medlens-logo-dark.png" alt="MedLens — AI Prescription & Discharge Translator" className={cx("w-auto", className)} />
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { analysis, hydrated } = useMedLens();
  const tr = useTr();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  // The home page is a full-screen cinematic landing with its own header.
  if (pathname === "/") {
    return (
      <>
        {children}
        <Toasts />
        <ReminderWatcher />
      </>
    );
  }

  return (
    <div className="app-shell min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2 focus:text-black">
        {tr("Skip to content")}
      </a>

      {/* Editorial top bar, like the home page */}
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-navy-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-4 px-5">
          <Logo className="h-9 sm:h-10" />
          <nav className="hidden items-center gap-5 lg:flex" aria-label="Main">
            {NAV.map((n, i) => (
              <span key={n.href} className="flex items-center gap-5">
                {i > 0 && <span className="h-[3px] w-[3px] rounded-full bg-white/25" aria-hidden />}
                <Link
                  href={n.href}
                  aria-current={active(n.href) ? "page" : undefined}
                  className={cx(
                    "relative py-1 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors",
                    active(n.href)
                      ? "text-white after:absolute after:-bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-brand-500"
                      : "text-ink-soft hover:text-white",
                  )}
                >
                  {tr(n.label)}
                </Link>
              </span>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSelector compact />
            {hydrated && analysis && (
              <Link
                href="/results"
                aria-current={active("/results") ? "page" : undefined}
                className="hidden items-center gap-2 rounded-full bg-[#ffffff] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#04121a] transition hover:scale-[1.03] sm:inline-flex"
              >
                <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
                {tr("My results")}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="pb-32 lg:pb-12">
        <div className="mx-auto max-w-5xl px-5 py-8 sm:py-12">{children}</div>
        <footer className="mx-auto max-w-5xl px-5 pb-6 text-xs text-ink-muted">
          <div className="flex flex-col gap-2 border-t border-white/[0.08] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p>{tr("MedLens explains your paperwork in plain language. It is not a doctor and does not give medical advice. In an emergency call 911.")}</p>
            <p className="flex shrink-0 gap-4">
              <Link href="/privacy" className="hover:text-white">
                {tr("Privacy Policy")}
              </Link>
              <Link href="/terms" className="hover:text-white">
                {tr("Terms & Disclaimers")}
              </Link>
            </p>
          </div>
        </footer>
      </main>

      {/* Phone navigation: a floating glass bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 rounded-2xl border border-white/10 bg-navy-900/80 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl lg:hidden"
      >
        <ul className="grid grid-cols-6">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={active(n.href) ? "page" : undefined}
                className={cx(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
                  active(n.href) ? "text-brand-500" : "text-ink-muted",
                )}
              >
                <n.icon className="h-5 w-5" aria-hidden />
                {tr(n.short)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <Toasts />
      <ReminderWatcher />
    </div>
  );
}

function Toasts() {
  const { toasts, dismissToast } = useMedLens();
  const tr = useTr();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            "pointer-events-auto flex max-w-md items-start gap-2 rounded-xl px-4 py-3 text-sm text-white shadow-lg",
            t.tone === "success" ? "bg-[#0b6b4f]" : t.tone === "warning" ? "bg-[#8a5a00]" : "bg-[#1d2c44]",
          )}
        >
          {t.tone === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : t.tone === "warning" ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <Info className="h-4 w-4 shrink-0" />}
          <span className="flex-1">{t.translated ? t.message : tr(t.message)}</span>
          <button onClick={() => dismissToast(t.id)} aria-label={tr("Dismiss")} className="opacity-80 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

/** Fires in-app (and, if permitted, system) notifications for checklist reminders while MedLens is open. */
function ReminderWatcher() {
  const { reminders, markReminderFired, notify } = useMedLens();
  const tr = useTr();
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      for (const r of reminders) {
        if (!r.fired && new Date(r.at).getTime() <= now) {
          markReminderFired(r.id);
          notify(`${tr("Reminder")}: ${r.label}`, "info", true);
          try {
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification(tr("MedLens reminder"), { body: r.label });
            }
          } catch {
            /* ignore */
          }
        }
      }
    };
    check();
    const id = setInterval(check, 15_000);
    return () => clearInterval(id);
  }, [reminders, markReminderFired, notify, tr]);
  return null;
}
