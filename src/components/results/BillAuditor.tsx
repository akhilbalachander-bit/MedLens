"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, BookOpen, CopyCheck, FileSearch, HelpCircle, Receipt, RotateCcw } from "lucide-react";
import { useMedLens } from "@/lib/store";
import { prepareImage } from "@/lib/image";
import { findPossibleDuplicates, type BillAnalysisResult, type BillLineItem } from "@/lib/bill-schema";
import { sampleBillResult } from "@/lib/sample/bill";
import { billKey } from "@/lib/translatable";
import { SpeakButton } from "../speech/ListenControls";
import { Badge, btn, Card, cx, Notice, SectionTitle } from "../ui";
import { DocumentCapture } from "../scan/DocumentCapture";
import { AnalysisProgress, BILL_STAGES } from "../scan/AnalysisProgress";
import { useTr } from "@/lib/i18n";

const CAT_LABEL: Record<string, string> = {
  room_and_board: "Room & board",
  emergency_services: "Emergency services",
  physician_services: "Doctor services",
  laboratory: "Lab tests",
  imaging: "Imaging (X-ray, CT, MRI)",
  pharmacy: "Medicines (pharmacy)",
  supplies: "Supplies",
  procedures: "Procedures & treatments",
  facility_fee: "Hospital facility fees",
  other: "Other",
};

const money = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: n % 1 ? 2 : 0 });

export function BillAuditor() {
  const { bill, setBill, notify } = useMedLens();
  const tr = useTr();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  const finish = (b: BillAnalysisResult) => {
    setDone(true);
    setTimeout(() => {
      setBill(b);
      setBusy(false);
    }, 400);
  };

  const analyze = async (files: File[]) => {
    setBusy(true);
    setDone(false);
    setError(null);
    try {
      const prepared = await Promise.all(files.map((f) => prepareImage(f)));
      const form = new FormData();
      prepared.forEach((f) => form.append("files", f, f.name));
      const res = await fetch("/api/bill", { method: "POST", body: form });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw Object.assign(new Error(body?.error?.message ?? "Bill analysis failed."), { code: body?.error?.code });
      if ((body as BillAnalysisResult).meta.source === "mock") notify("Mock AI provider — showing the fictional sample bill.", "warning");
      finish(body);
    } catch (e) {
      setBusy(false);
      setError({ code: (e as { code?: string }).code ?? "error", message: (e as Error).message });
    }
  };

  const loadSample = () => {
    setBusy(true);
    setDone(false);
    setError(null);
    setTimeout(() => finish(sampleBillResult()), 1800);
  };

  return (
    <Card id="bill">
      <SectionTitle
        icon={<Receipt className="h-5 w-5" />}
        action={
          bill && (
            <button className={btn.ghost} onClick={() => setBill(null)}>
              <RotateCcw className="h-4 w-4" /> {tr("Check another bill")}
            </button>
          )
        }
      >
        {tr("Hospital bill auditor")}
      </SectionTitle>
      {!bill && !busy && (
        <>
          <p className="mb-3 text-ink-soft">
            {tr("Photograph or upload your hospital bill. MedLens lists each charge, explains billing words, and points out items you may want to ask about. It never decides that a charge is wrong.")}
          </p>
          <DocumentCapture
            variant="compact"
            onAnalyze={analyze}
            onSample={loadSample}
            sampleLabel="Try a sample bill"
            analyzeLabel="Review bill"
            what="hospital bill"
          />
          {error && (
            <Notice tone={error.code === "provider_not_configured" ? "info" : "danger"} className="mt-3">
              <p>{tr(error.message)}</p>
              <button onClick={loadSample} className={cx(btn.secondary, "mt-2")}>
                {tr("Try a sample bill")}
              </button>
            </Notice>
          )}
        </>
      )}
      {busy && <AnalysisProgress stages={BILL_STAGES} done={done} stepMs={1800} />}
      {bill && !busy && <BillReport bill={bill} />}
    </Card>
  );
}

function BillReport({ bill }: { bill: BillAnalysisResult }) {
  const [view, setView] = useState<"category" | "list">("category");
  const tr = useTr();
  const { t } = useMedLens();
  // Bill text is translated with the document, so it follows every language change.
  const c = (s: string | null | undefined) => (s ? t(billKey(s), s) : "");
  const items = bill.line_items;
  const byId = useMemo(() => new Map(items.map((i) => [i.id!, i])), [items]);

  const duplicates = useMemo(() => {
    const merged = [...bill.possible_duplicates.filter((d) => d.item_ids.length > 1), ...findPossibleDuplicates(items)];
    const seen = new Set<string>();
    return merged.filter((d) => {
      const key = [...d.item_ids].sort().join(",");
      if (seen.has(key)) return false;
      seen.add(key);
      return d.item_ids.every((id) => byId.has(id));
    });
  }, [bill.possible_duplicates, items, byId]);

  const flagged = useMemo(() => {
    const m = new Map<string, string[]>();
    duplicates.forEach((d) => d.item_ids.forEach((id) => m.set(id, [...(m.get(id) ?? []), "Possible duplicate"])));
    bill.needs_clarification.forEach((c) => c.item_id && m.set(c.item_id, [...(m.get(c.item_id) ?? []), "Ask about this"]));
    return m;
  }, [duplicates, bill.needs_clarification]);

  const groups = useMemo(() => {
    const g = new Map<string, BillLineItem[]>();
    for (const li of items) g.set(li.category, [...(g.get(li.category) ?? []), li]);
    return [...g.entries()]
      .map(([cat, list]) => ({ cat, list, total: list.reduce((s, x) => s + (x.amount ?? 0), 0) }))
      .sort((a, b) => b.total - a.total);
  }, [items]);
  const itemsTotal = groups.reduce((s, g) => s + g.total, 0);
  const totalMismatch = bill.total_charges != null && items.length > 0 && Math.abs(itemsTotal - bill.total_charges) > 1;

  const speech = [
    c(bill.plain_summary),
    duplicates.length ? tr("Possible duplicate charges to ask about: {count}.", { count: duplicates.length }) : "",
    bill.needs_clarification.length ? tr("Items that may need clarification: {count}.", { count: bill.needs_clarification.length }) : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-4">
      {bill.meta.source !== "ai" && <Badge tone="amber">{tr(bill.meta.source === "mock" ? "Mock AI — fictional bill" : "Fictional sample bill")}</Badge>}

      <div className="grid gap-2 sm:grid-cols-4">
        <Stat label={tr("Total charges")} value={money(bill.total_charges ?? (items.length ? itemsTotal : null))} />
        <Stat label={tr("Insurance paid")} value={money(bill.insurance_payments)} />
        <Stat label={tr("Adjustments")} value={money(bill.adjustments)} />
        <Stat label={tr("Amount due")} value={money(bill.amount_due)} strong />
      </div>
      <p className="text-sm text-ink-muted">
        {bill.facility_name ? c(bill.facility_name) : tr("Facility not listed")} · {tr("Account")} {bill.patient_account_number ?? tr("not listed")} · {tr("Service")}{" "}
        {bill.service_dates ?? tr("date not listed")}
        {bill.due_date ? ` · ${tr("Due {date}", { date: bill.due_date })}` : ""}
      </p>

      {bill.plain_summary && (
        <div className="rounded-xl bg-brand-50/70 p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-ink">{tr("Your bill in plain words")}</h3>
            <SpeakButton req={{ id: "bill-summary", label: tr("Bill summary"), text: speech }} />
          </div>
          <p className="mt-1 text-ink">{c(bill.plain_summary)}</p>
        </div>
      )}

      {!bill.is_itemized && (
        <Notice tone="warning" icon={<FileSearch className="h-5 w-5" />}>
          {tr("This looks like a summary bill, not an itemized one. You have the right to ask for an itemized bill — use the “Request an itemized bill” letter below.")}
        </Notice>
      )}
      {totalMismatch && (
        <Notice tone="warning" icon={<HelpCircle className="h-5 w-5" />}>
          {tr("The line items we could read add up to {sum}, but the bill total says {total}. Some lines may be on a page we did not see, or it may be worth asking the billing office to explain the difference.", { sum: money(itemsTotal), total: money(bill.total_charges) })}
        </Notice>
      )}

      {(duplicates.length > 0 || bill.needs_clarification.length > 0) && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
          <h3 className="flex items-center gap-2 font-semibold text-amber-950">
            <AlertTriangle className="h-5 w-5" /> {tr("Items to review with the billing office")}
          </h3>
          <p className="mt-1 text-sm text-amber-950">
            {tr("These are questions to ask, not mistakes. There may be a good reason for each charge. Only the hospital can confirm.")}
          </p>
          <ul className="mt-2 space-y-2">
            {duplicates.map((d, i) => (
              <li key={`d${i}`} className="rounded-lg bg-white p-2.5 text-sm">
                <p className="flex items-center gap-1.5 font-semibold text-ink">
                  <CopyCheck className="h-4 w-4 text-amber-700" /> {tr("Possible duplicate")}
                </p>
                <p className="text-ink-soft">{"local" in d ? tr(d.reason) : c(d.reason)}</p>
                <ul className="mt-1 text-ink">
                  {d.item_ids.map((id) => (
                    <li key={id}>
                      • {c(byId.get(id)?.description)} {byId.get(id)?.code ? `(${byId.get(id)?.code})` : ""} — {money(byId.get(id)?.amount)}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
            {bill.needs_clarification.map((q, i) => {
              const li = q.item_id ? byId.get(q.item_id) : undefined;
              return (
                <li key={`c${i}`} className="rounded-lg bg-white p-2.5 text-sm">
                  <p className="flex items-center gap-1.5 font-semibold text-ink">
                    <HelpCircle className="h-4 w-4 text-amber-700" /> {li ? `${c(li.description)} — ${money(li.amount)}` : tr("Question to ask")}
                  </p>
                  <p className="text-ink-soft">{c(q.reason)}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-ink">
            {tr("Charges")} ({items.length})
          </h3>
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 text-sm" role="group" aria-label={tr("View charges")}>
            {(["category", "list"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={cx("px-3 py-1.5 font-medium", view === v ? "bg-brand-700 text-white" : "hover:bg-slate-50")}>
                {tr(v === "category" ? "By category" : "All lines")}
              </button>
            ))}
          </div>
        </div>
        {items.length === 0 ? (
          <p className="text-ink-muted">{tr("No individual charges could be read from this bill.")}</p>
        ) : view === "category" ? (
          <div className="space-y-3">
            {groups.map((g) => (
              <details key={g.cat} className="rounded-xl border border-slate-200" open={groups.length <= 4}>
                <summary className="flex cursor-pointer items-center justify-between gap-2 p-3">
                  <span className="font-medium text-ink">{tr(CAT_LABEL[g.cat] ?? g.cat)}</span>
                  <span className="flex items-center gap-3">
                    <span className="hidden h-2 w-28 overflow-hidden rounded-full bg-slate-100 sm:block" aria-hidden>
                      <span className="block h-full bg-brand-600" style={{ width: `${itemsTotal ? (g.total / itemsTotal) * 100 : 0}%` }} />
                    </span>
                    <span className="font-semibold tabular-nums">{money(g.total)}</span>
                  </span>
                </summary>
                <LineTable items={g.list} flagged={flagged} c={c} />
              </details>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200">
            <LineTable items={items} flagged={flagged} c={c} />
          </div>
        )}
      </div>

      {bill.terminology.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-ink">
            <BookOpen className="h-4 w-4 text-brand-700" /> {tr("Billing words explained")}
          </h3>
          <dl className="grid gap-2 sm:grid-cols-2">
            {bill.terminology.map((t) => (
              <div key={t.term} className="rounded-xl bg-slate-50 p-3">
                <dt className="font-semibold text-ink">{c(t.term)}</dt>
                <dd className="text-sm text-ink-soft">{c(t.explanation)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      <p className="text-xs text-ink-muted">
        {tr("MedLens reads and explains your bill. It does not decide whether any charge is correct, fraudulent or coded properly. Contact the hospital billing office or your insurer with questions. Your bill is not stored by MedLens.")}
      </p>
    </div>
  );
}

function LineTable({ items, flagged, c }: { items: BillLineItem[]; flagged: Map<string, string[]>; c: (s: string | null | undefined) => string }) {
  const tr = useTr();
  return (
    <ul className="divide-y divide-slate-100 border-t border-slate-100">
      {items.map((li) => (
        <li key={li.id} className={cx("grid grid-cols-[1fr_auto] gap-2 p-3", flagged.has(li.id!) && "bg-amber-50/60")}>
          <div className="min-w-0">
            <p className="font-medium text-ink">{c(li.description)}</p>
            <p className="text-xs text-ink-muted">
              {[li.service_date, li.code && `${tr("Code")} ${li.code}`, li.quantity != null && li.quantity !== 1 && `${tr("Qty")} ${li.quantity}`]
                .filter(Boolean)
                .join(" · ") || tr("No date or code listed")}
            </p>
            {li.plain_explanation && <p className="mt-0.5 text-sm text-ink-soft">{c(li.plain_explanation)}</p>}
            {flagged.get(li.id!)?.map((f) => (
              <Badge key={f} tone="amber">
                {tr(f)}
              </Badge>
            ))}
          </div>
          <span className="font-semibold tabular-nums text-ink">{money(li.amount)}</span>
        </li>
      ))}
    </ul>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cx("rounded-xl p-3", strong ? "bg-brand-700 text-white" : "bg-slate-50")}>
      <p className={cx("text-xs", strong ? "text-white/70" : "text-ink-muted")}>{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
