import type { ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Card({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cx("ml-panel p-5 sm:p-6", className)}>
      {children}
    </section>
  );
}

/**
 * Section heading in the editorial style: a large teal index (01, 02…, counted
 * automatically per page) and the title.
 */
export function SectionTitle({
  icon,
  children,
  action,
  as: Tag = "h2",
}: {
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  as?: "h2" | "h3";
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <Tag className={cx("sec-title flex items-center gap-2 font-semibold text-ink", Tag === "h2" ? "text-lg sm:text-xl" : "text-base")}>
        {icon && <span className="text-brand-500 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
        <span>{children}</span>
      </Tag>
      {action}
    </div>
  );
}

const badgeTones = {
  slate: "border-white/10 bg-white/[0.04] text-ink-soft",
  green: "border-emerald-300/40 bg-emerald-50 text-emerald-800",
  amber: "border-amber-300/50 bg-amber-50 text-amber-800",
  red: "border-red-300/50 bg-red-50 text-red-800",
  blue: "border-sky-200/60 bg-sky-50 text-sky-800",
  brand: "border-brand-300/60 bg-brand-50 text-brand-800",
};
export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: keyof typeof badgeTones }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em]", badgeTones[tone])}>
      {children}
    </span>
  );
}

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500";
export const btn = {
  primary: `inline-flex items-center justify-center gap-2 rounded-full bg-[#12b3bf] px-5 py-2.5 font-semibold text-[#021015] shadow-[0_10px_30px_-12px_rgba(18,179,191,0.9)] transition hover:bg-[#2fd0da] disabled:cursor-not-allowed disabled:opacity-50 ${focus}`,
  secondary: `inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.03] px-5 py-2.5 font-medium text-ink transition hover:border-brand-400 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50 ${focus}`,
  ghost: `inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-brand-800 transition hover:bg-white/[0.06] disabled:opacity-40 ${focus}`,
  danger: `inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-2.5 font-semibold text-white transition hover:bg-red-500 ${focus}`,
};

export function Notice({
  tone = "info",
  icon,
  children,
  className,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-sky-200 bg-sky-50/80 text-sky-900 [--accent:#5ab8ff]",
    warning: "border-amber-300 bg-amber-50/80 text-amber-950 [--accent:#f5b62e]",
    danger: "border-red-300 bg-red-50/80 text-red-900 [--accent:#f87171]",
    success: "border-emerald-200 bg-emerald-50/80 text-emerald-900 [--accent:#34d399]",
  };
  return (
    <div
      role={tone === "danger" ? "alert" : undefined}
      className={cx("flex gap-3 rounded-2xl border border-l-[3px] p-3.5 text-sm [border-left-color:var(--accent)]", tones[tone], className)}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Unavailable({ label = "Not listed in your document" }: { label?: string }) {
  return <span className="italic text-ink-muted">{label}</span>;
}
