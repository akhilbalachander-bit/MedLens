"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Download, FileSignature, Printer, RefreshCw, ShieldCheck } from "lucide-react";
import { useMedLens } from "@/lib/store";
import { buildLetter, EMPTY_FIELDS, LETTER_TYPES, type LetterFields, type LetterType } from "@/lib/letters";
import { downloadText } from "@/lib/ics";
import { btn, Card, cx, SectionTitle } from "../ui";
import { useTr } from "@/lib/i18n";

const FIELD_DEFS: { key: keyof LetterFields; label: string; placeholder?: string; wide?: boolean; area?: boolean }[] = [
  { key: "patientName", label: "Your name" },
  { key: "patientPhone", label: "Phone" },
  { key: "patientEmail", label: "Email" },
  { key: "patientAddress", label: "Your mailing address", wide: true },
  { key: "facilityName", label: "Hospital name" },
  { key: "facilityAddress", label: "Hospital billing address" },
  { key: "accountNumber", label: "Account number" },
  { key: "serviceDates", label: "Date(s) of service" },
  { key: "amountDue", label: "Amount billed", placeholder: "$" },
  { key: "insuranceStatus", label: "Insurance status", placeholder: "e.g. Uninsured / Medicaid / Plan name" },
  { key: "householdSize", label: "Household size" },
  { key: "annualIncome", label: "Annual household income", placeholder: "Optional" },
  { key: "hardshipNote", label: "Anything else to explain (optional)", wide: true, area: true, placeholder: "e.g. I recently lost my job and cannot pay this bill in full." },
];

export function LetterGenerator() {
  const { analysis, bill, notify, language } = useMedLens();
  const tr = useTr();
  const [type, setType] = useState<LetterType>("itemized");
  const [fields, setFields] = useState<LetterFields>(EMPTY_FIELDS);
  const [text, setText] = useState("");
  const [edited, setEdited] = useState(false);
  const [letterLang, setLetterLang] = useState<"mine" | "en">("mine");
  const inEnglish = letterLang === "en" || language.code === "en";

  // Prefill from the scanned document / bill (only values actually found).
  useEffect(() => {
    const acct = bill?.patient_account_number ?? analysis?.financial_information.find((f) => /account/i.test(f.label))?.value ?? "";
    const ins = analysis?.financial_information.find((f) => /insur/i.test(f.label))?.value ?? "";
    setFields((f) => ({
      ...f,
      facilityName: f.facilityName || bill?.facility_name || analysis?.facility_name?.split(" — ")[0] || "",
      facilityAddress: f.facilityAddress || bill?.facility_address || "",
      accountNumber: f.accountNumber || acct || "",
      serviceDates: f.serviceDates || bill?.service_dates || analysis?.visit_date || "",
      amountDue:
        f.amountDue || (bill?.amount_due != null ? bill.amount_due.toLocaleString("en-US", { style: "currency", currency: "USD" }) : ""),
      insuranceStatus: f.insuranceStatus || ins || "",
    }));
  }, [analysis, bill]);

  const generated = useMemo(
    () => (inEnglish ? buildLetter(type, fields) : buildLetter(type, fields, new Date(), tr, language.speech)),
    [type, fields, inEnglish, tr, language.speech],
  );
  useEffect(() => {
    if (!edited) setText(generated.body);
  }, [generated, edited]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      notify("Letter copied. Paste it into an email or print it.", "success");
    } catch {
      notify("Could not copy automatically — select the text and copy it.", "warning");
    }
  };

  const print = () => {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    w.document.write(`<pre style="font:14px/1.5 system-ui,sans-serif;white-space:pre-wrap;padding:40px">${text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!)}</pre>`);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <Card id="letters">
      <SectionTitle icon={<FileSignature className="h-5 w-5" />}>{tr("Financial assistance letters")}</SectionTitle>
      <p className="mb-3 text-ink-soft">
        {tr("Make a letter to send to the hospital billing office. Fill in what you know, edit the text, then copy, download or print it.")}
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label={tr("Letter type")}>
        {LETTER_TYPES.map((l) => (
          <button
            key={l.id}
            role="radio"
            aria-checked={type === l.id}
            onClick={() => {
              if (edited && !confirm(tr("Switch letter type? Your edits to this letter will be replaced."))) return;
              setEdited(false);
              setType(l.id);
            }}
            className={cx("rounded-xl border p-3 text-left", type === l.id ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500" : "border-slate-200 hover:border-brand-300")}
          >
            <span className="block font-semibold text-ink">{tr(l.title)}</span>
            <span className="block text-xs text-ink-soft">{tr(l.description)}</span>
          </button>
        ))}
      </div>

      <details className="mt-4 rounded-xl border border-slate-200 p-3" open>
        <summary className="cursor-pointer font-semibold text-ink">{tr("Your details")}</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {FIELD_DEFS.map((d) => (
            <label key={d.key} className={cx("text-sm", d.wide && "sm:col-span-2")}>
              <span className="mb-1 block font-medium text-ink-soft">{tr(d.label)}</span>
              {d.area ? (
                <textarea
                  rows={2}
                  value={fields[d.key]}
                  placeholder={d.placeholder && tr(d.placeholder)}
                  onChange={(e) => {
                    setEdited(false);
                    setFields({ ...fields, [d.key]: e.target.value });
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              ) : (
                <input
                  value={fields[d.key]}
                  placeholder={d.placeholder && tr(d.placeholder)}
                  onChange={(e) => {
                    setEdited(false);
                    setFields({ ...fields, [d.key]: e.target.value });
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              )}
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-muted">{tr("Changing a detail rebuilds the letter (and replaces manual edits).")}</p>
      </details>

      {language.code !== "en" && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-ink">{tr("Letter language")}</span>
          <div className="inline-flex overflow-hidden rounded-xl border border-slate-300 text-sm" role="group" aria-label={tr("Letter language")}>
            {([
              ["mine", language.native],
              ["en", "English"],
            ] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => {
                  if (edited && !confirm(tr("Switch letter language? Your edits to this letter will be replaced."))) return;
                  setEdited(false);
                  setLetterLang(v);
                }}
                aria-pressed={letterLang === v}
                className={cx("px-3 py-1.5 font-medium", letterLang === v ? "bg-brand-700 text-white" : "hover:bg-slate-50")}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="w-full text-xs text-ink-muted">{tr("Most U.S. hospital billing offices read English. You can switch the letter to English before you send it.")}</span>
        </div>
      )}

      <label className="mt-4 block">
        <span className="mb-1 flex items-center justify-between text-sm font-semibold text-ink">
          {tr("Letter text")} {edited && <span className="font-normal text-ink-muted">({tr("edited")})</span>}
        </span>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setEdited(true);
          }}
          rows={18}
          lang={inEnglish ? "en" : language.code}
          dir={!inEnglish && language.rtl ? "rtl" : undefined}
          className="w-full rounded-xl border border-slate-300 p-3 font-mono text-sm leading-relaxed"
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={copy} className={btn.primary}>
          <Copy className="h-4 w-4" /> {tr("Copy letter")}
        </button>
        <button onClick={() => downloadText(`medlens-${type}-letter.txt`, text)} className={btn.secondary}>
          <Download className="h-4 w-4" /> {tr("Download")}
        </button>
        <button onClick={print} className={btn.secondary}>
          <Printer className="h-4 w-4" /> {tr("Print")}
        </button>
        {edited && (
          <button
            onClick={() => {
              setEdited(false);
              setText(generated.body);
            }}
            className={btn.ghost}
          >
            <RefreshCw className="h-4 w-4" /> {tr("Reset to template")}
          </button>
        )}
      </div>
      <p className="mt-3 flex items-start gap-2 text-xs text-ink-muted">
        <ShieldCheck className="h-4 w-4 shrink-0 text-brand-700" />
        {tr("MedLens never sends letters for you. Review the letter, keep a copy, and send it yourself by mail, email or the hospital's patient portal. This is not legal advice.")}
      </p>
    </Card>
  );
}
