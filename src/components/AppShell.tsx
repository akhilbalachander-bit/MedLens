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
  { href: "/scan", label: "Scan Documents", short: "Scan", icon: ScanLine },
  { href: "/medications", label: "My Medications", short: "Meds", icon: Pill },
  { href: "/instructions", label: "Health Instructions", short: "Care", icon: ClipboardList },
  { href: "/assistant", label: "Voice Assistant", short: "Ask", icon: Mic },
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
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">
        {tr("Skip to content")}
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-navy-900/95 px-4 py-5 backdrop-blur lg:flex">
        <Logo className="h-12" />
        <nav className="mt-8 flex flex-col gap-1" aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active(n.href) ? "page" : undefined}
              className={cx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium",
                active(n.href) ? "bg-brand-50 text-brand-800" : "text-ink-soft hover:bg-slate-50",
              )}
            >
              <n.icon className="h-5 w-5" aria-hidden />
              {tr(n.label)}
            </Link>
          ))}
          {hydrated && analysis && (
            <Link
              href="/results"
              aria-current={active("/results") ? "page" : undefined}
              className={cx(
                "mt-3 flex items-center gap-3 rounded-xl border px-3 py-2.5 text-[15px] font-semibold",
                active("/results") ? "border-brand-300 bg-brand-50 text-brand-800" : "border-brand-200 text-brand-800 hover:bg-brand-50",
              )}
            >
              <LayoutDashboard className="h-5 w-5" aria-hidden />
              {tr("My results")}
            </Link>
          )}
        </nav>
        <p className="mt-auto text-xs leading-relaxed text-ink-muted">
          {tr("MedLens explains your paperwork in plain language. It is not a doctor and does not give medical advice. In an emergency call 911.")}
        </p>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-navy-900/85 backdrop-blur lg:pl-64">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <div className="lg:hidden">
            <Logo className="h-8" />
          </div>
          <div className="hidden text-sm text-ink-muted lg:block">{tr("Scan → Understand → Listen → Act")}</div>
          <div className="flex items-center gap-2">
            {hydrated && analysis && (
              <Link href="/results" className="hidden rounded-lg px-2 py-1 text-sm font-semibold text-brand-800 hover:bg-brand-50 sm:block lg:hidden">
                {tr("My results")}
              </Link>
            )}
            <LanguageSelector compact />
          </div>
        </div>
      </header>

      <main id="main" className="pb-24 lg:pb-10 lg:pl-64">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:py-8">{children}</div>
      </main>

      {/* Mobile bottom navigation */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-navy-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="grid grid-cols-6">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={active(n.href) ? "page" : undefined}
                className={cx(
                  "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                  active(n.href) ? "text-brand-700" : "text-ink-muted",
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
