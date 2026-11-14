"use client";

import { useState } from "react";
import {
  AlertOctagon,
  Bell,
  BellOff,
  CalendarPlus,
  CheckCircle2,
  ClipboardCheck,
  FlaskConical,
  Phone,
  PhoneCall,
  ScanSearch,
  Stethoscope,
  CircleAlert,
  Leaf,
  Quote,
  Info,
} from "lucide-react";
import { useMedLens } from "@/lib/store";
import type { GuidanceItem } from "@/lib/schema";
import { downloadIcs } from "@/lib/ics";
import { SpeakButton } from "../speech/ListenControls";
import { Badge, btn, Card, cx, Notice, SectionTitle, Unavailable } from "../ui";
import { joinSpeech, Localized } from "./shared";
import { useTr } from "@/lib/i18n";

export function RecoveryTab() {
  return (
    <div className="space-y-5">
      <EmergencyBanner />
      <TrafficLight />
      <RecoveryChecklist />
      <FollowUpInfo />
    </div>
  );
}

export function EmergencyBanner() {
  const { t } = useMedLens();
  const tr = useTr();
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-2xl bg-red-700 p-4 text-white shadow-card sm:flex-row sm:items-center">
      <AlertOctagon className="h-8 w-8 shrink-0" aria-hidden />
      <Localized as="p" className="flex-1 text-lg font-semibold leading-snug">
        {t("ui.emergencyBanner")}
      </Localized>
      <a href="tel:911" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-lg font-bold text-red-700 hover:bg-red-50">
        <PhoneCall className="h-5 w-5" /> {tr("Call 911")}
      </a>
    </div>
  );
}

const LIGHTS = [
  {
    key: "emergency" as const,
    labelKey: "ui.emergency",
    icon: AlertOctagon,
    ring: "border-red-300",
    head: "bg-red-600 text-white",
    dot: "bg-red-600",
    empty: "Your document does not list emergency warning signs. If you think you are having an emergency, call 911.",
  },
  {
    key: "contact_provider" as const,
    labelKey: "ui.contact",
    icon: CircleAlert,
    ring: "border-amber-300",
    head: "bg-amber-400 text-amber-950",
    dot: "bg-amber-500",
    empty: "Your document does not list when to call your doctor. If you are worried about a symptom, call your doctor or nurse line.",
  },
  {
    key: "expected" as const,
    labelKey: "ui.expected",
    icon: Leaf,
    ring: "border-emerald-300",
    head: "bg-emerald-600 text-white",
    dot: "bg-emerald-600",
    empty: "Your document does not say which symptoms are expected. MedLens will not guess which symptoms are normal.",
  },
];

export function TrafficLight() {
  const { analysis, t } = useMedLens();
  const tr = useTr();
  const g = analysis!.recovery_guidance;
  const anyItems = g.expected.length + g.contact_provider.length + g.emergency.length > 0;

  return (
    <Card>
      <SectionTitle icon={<Stethoscope className="h-5 w-5" />}>{tr("Symptom traffic light")}</SectionTitle>
      <p className="mb-3 text-sm text-ink-soft">
        {tr("These come from your discharge paperwork. They are not a diagnosis. If you are unsure, contact your care team — and for an emergency, call 911.")}
      </p>
      {(!g.document_has_guidance || !anyItems) && (
        <Notice tone="warning" className="mb-3" icon={<Info className="h-5 w-5" />}>
          <Localized as="p">{t("ui.noGuidance")}</Localized>
          {g.note && <Localized as="p" className="mt-1">{t("note.guidance", g.note)}</Localized>}
        </Notice>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        {LIGHTS.map((L) => {
          const items = g[L.key];
          const label = t(L.labelKey);
          const speech = joinSpeech([label, ...(items.length ? items.map((i) => t(`g.${i.id}`, i.text)) : [tr(L.empty)])]);
          return (
            <section key={L.key} className={cx("overflow-hidden rounded-2xl border-2", L.ring)} aria-label={label}>
              <div className={cx("flex items-center justify-between gap-2 px-3 py-2.5", L.head)}>
                <h3 className="flex items-center gap-2 font-bold">
                  <L.icon className="h-5 w-5" aria-hidden />
                  <Localized as="span">{label}</Localized>
                </h3>
                <SpeakButton req={{ id: `light-${L.key}`, label, text: speech }} className="border-white/40 bg-white/90 text-ink hover:bg-white" />
              </div>
              <div className="p-3">
                {items.length === 0 ? (
                  <p className="text-sm italic text-ink-muted">{tr(L.empty)}</p>
                ) : (
                  <ul className="space-y-2">
                    {items.map((i) => (
                      <GuidanceRow key={i.id} item={i} dot={L.dot} />
                    ))}
                  </ul>
                )}
                {L.key === "expected" && items.length > 0 && (
                  <p className="mt-3 text-xs text-ink-muted">
                    {tr("Even expected symptoms can become a problem. If they get worse, last longer than your paperwork says, or worry you, contact your care team.")}
                  </p>
                )}
                {L.key === "emergency" && (
                  <a href="tel:911" className={cx(btn.danger, "mt-3 w-full")}>
                    <PhoneCall className="h-4 w-4" /> {tr("Call 911")}
                  </a>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </Card>
  );
}

function GuidanceRow({ item, dot }: { item: GuidanceItem; dot: string }) {
  const { t } = useMedLens();
  const tr = useTr();
  const [quote, setQuote] = useState(false);
  return (
    <li className="flex gap-2">
      <span className={cx("mt-2 h-2.5 w-2.5 shrink-0 rounded-full", dot)} aria-hidden />
      <div className="min-w-0">
        <Localized as="p" className="text-ink">{t(`g.${item.id}`, item.text)}</Localized>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge tone={item.source === "document" ? "slate" : "blue"}>
            <Localized as="span">{item.source === "document" ? t("ui.fromDoc") : t("ui.generalRef")}</Localized>
          </Badge>
          {item.source_quote && (
            <button onClick={() => setQuote((q) => !q)} className="inline-flex items-center gap-1 text-xs font-medium text-brand-800 underline" aria-expanded={quote}>
              <Quote className="h-3 w-3" /> {tr(quote ? "Hide exact words" : "Show exact words")}
            </button>
          )}
        </div>
        {quote && item.source_quote && <p className="mt-1 rounded bg-slate-50 p-2 font-mono text-xs text-ink-soft">“{item.source_quote}”</p>}
      </div>
    </li>
  );
}

const CK_ICON: Record<string, typeof Bell> = {
  appointment: Phone,
  lab: FlaskConical,
  imaging: ScanSearch,
};

export function RecoveryChecklist() {
  const { analysis, t, checklist, toggleChecklist, reminders, addReminder, removeReminder, notify } = useMedLens();
  const tr = useTr();
  const items = analysis!.recovery_checklist;
  const [editing, setEditing] = useState<string | null>(null);
  const [when, setWhen] = useState("");
  const done = items.filter((i) => checklist[i.id!]).length;

  const defaultWhen = () => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setSeconds(0, 0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const save = async (id: string, label: string) => {
    const at = new Date(when);
    if (Number.isNaN(at.getTime())) return;
    if ("Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        /* ignore */
      }
    }
    addReminder({ itemId: id, label, at: at.toISOString() });
    setEditing(null);
    notify("Reminder set. Keep MedLens open, or add it to your calendar.", "success");
  };

  const speech = joinSpeech([t("ui.checklist"), ...items.map((i) => joinSpeech([t(`ck.${i.id}`, i.task), i.timeframe && t(`ck.${i.id}.timeframe`, i.timeframe)]))]);

  return (
    <Card id="checklist">
      <SectionTitle icon={<ClipboardCheck className="h-5 w-5" />} action={<SpeakButton req={{ id: "checklist", label: t("ui.checklist"), text: speech }} />}>
        <Localized as="span">{t("ui.checklist")}</Localized>
      </SectionTitle>
      {items.length === 0 ? (
        <Notice tone="info">{tr("Your document does not list specific recovery tasks. Ask your care team what you should do in the next few days.")}</Notice>
      ) : (
        <>
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-soft">{tr("Your first days at home — timelines come from your paperwork.")}</span>
              <span className="font-semibold text-ink">
                {tr("{done}/{total} done", { done, total: items.length })}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
              <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${(done / items.length) * 100}%` }} />
            </div>
          </div>
          <ul className="space-y-2">
            {items.map((i) => {
              const id = i.id!;
              const checked = !!checklist[id];
              const label = t(`ck.${id}`, i.task);
              const rem = reminders.find((r) => r.itemId === id);
              const Icon = CK_ICON[i.category] ?? CheckCircle2;
              return (
                <li key={id} className={cx("rounded-xl border p-3", checked ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200")}>
                  <div className="flex items-start gap-3">
                    <input
                      id={`ck-${id}`}
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleChecklist(id)}
                      className="mt-1 h-6 w-6 shrink-0 cursor-pointer accent-brand-700"
                    />
                    <label htmlFor={`ck-${id}`} className="min-w-0 flex-1 cursor-pointer">
                      <Localized as="span" className={cx("block text-[17px]", checked ? "text-ink-muted line-through" : "text-ink")}>
                        {label}
                      </Localized>
                      <span className="mt-1 flex flex-wrap items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-ink-muted" aria-hidden />
                        {i.timeframe && (
                          <Badge tone="blue">
                            <Localized as="span">{t(`ck.${id}.timeframe`, i.timeframe)}</Localized>
                          </Badge>
                        )}
                        {i.due_date && <Badge tone="amber">{tr("Due {date}", { date: i.due_date })}</Badge>}
                        {rem && <Badge tone={rem.fired ? "slate" : "green"}>
                          <Bell className="h-3 w-3" /> {rem.fired ? tr("Reminded") : new Date(rem.at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                        </Badge>}
                      </span>
                    </label>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1 pl-9">
                    <SpeakButton req={{ id: `ck-speak-${id}`, label, text: joinSpeech([label, i.timeframe && t(`ck.${id}.timeframe`, i.timeframe)]) }} />
                    {rem ? (
                      <button className={btn.ghost} onClick={() => removeReminder(rem.id)}>
                        <BellOff className="h-4 w-4" /> {tr("Remove reminder")}
                      </button>
                    ) : (
                      <button
                        className={btn.ghost}
                        onClick={() => {
                          setEditing(editing === id ? null : id);
                          setWhen(i.due_date ? `${i.due_date}T09:00` : defaultWhen());
                        }}
                        aria-expanded={editing === id}
                      >
                        <Bell className="h-4 w-4" /> {tr("Remind me")}
                      </button>
                    )}
                  </div>
                  {editing === id && (
                    <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3 sm:ml-9">
                      <label className="text-sm">
                        <span className="mb-1 block font-medium">{tr("Remind me on")}</span>
                        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" />
                      </label>
                      <button className={btn.primary} onClick={() => save(id, label)}>
                        {tr("Save reminder")}
                      </button>
                      <button
                        className={btn.secondary}
                        onClick={() => {
                          const at = new Date(when);
                          if (!Number.isNaN(at.getTime())) downloadIcs(`MedLens: ${i.task}`, i.timeframe ? `Timeline from your paperwork: ${i.timeframe}` : "From your MedLens recovery checklist", at);
                        }}
                      >
                        <CalendarPlus className="h-4 w-4" /> {tr("Add to calendar")}
                      </button>
                      <p className="w-full text-xs text-ink-muted">
                        {tr("In-app reminders work while MedLens is open in this browser. Use “Add to calendar” for a reminder on your phone.")}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
}

export function FollowUpInfo() {
  const { analysis, t } = useMedLens();
  const tr = useTr();
  const a = analysis!;
  const na = <Unavailable label={t("ui.notInDoc")} />;
  return (
    <Card id="follow-up">
      <SectionTitle icon={<Phone className="h-5 w-5" />}>
        <Localized as="span">{t("ui.followUp")}</Localized>
      </SectionTitle>
      {a.follow_up.length === 0 ? (
        <Notice tone="info">
          {tr("No follow-up appointment was found in your document. Call the clinic or hospital that treated you to ask whether you need one.")}
        </Notice>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {a.follow_up.map((f) => (
            <li key={f.id} className="rounded-xl border border-slate-200 p-3">
              <p className="text-lg font-semibold text-ink">{f.provider_name ?? f.clinic_name ?? tr("Follow-up visit")}</p>
              <dl className="mt-2 space-y-1.5 text-[15px]">
                <Row label={tr("Specialty")}>{f.specialty ?? na}</Row>
                <Row label={tr("Clinic")}>{f.clinic_name ?? na}</Row>
                <Row label={tr("Phone")}>
                  {f.phone ? (
                    <a href={`tel:${f.phone.replace(/[^\d+]/g, "")}`} className="font-semibold text-brand-800 underline">
                      {f.phone}
                    </a>
                  ) : (
                    na
                  )}
                </Row>
                <Row label={tr("Address")}>{f.address ?? na}</Row>
                <Row label={tr("Appointment")}>
                  {f.appointment_date || f.appointment_time ? `${f.appointment_date ?? ""} ${f.appointment_time ?? ""}`.trim() : <span>{tr("Not scheduled in your document")}</span>}
                </Row>
                <Row label={tr("When")}>{f.timeframe ? <Localized as="span">{t(`fu.${f.id}.timeframe`, f.timeframe)}</Localized> : na}</Row>
                <Row label={tr("Why")}>{f.reason ? <Localized as="span">{t(`fu.${f.id}.reason`, f.reason)}</Localized> : na}</Row>
              </dl>
              <div className="mt-2">
                <SpeakButton
                  req={{
                    id: `fu-${f.id}`,
                    label: t("ui.followUp"),
                    text: joinSpeech([f.provider_name, f.clinic_name, f.phone && `${tr("Phone")} ${f.phone}`, f.timeframe && t(`fu.${f.id}.timeframe`, f.timeframe), f.reason && t(`fu.${f.id}.reason`, f.reason)]),
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mb-2 mt-5 flex items-center gap-2 font-semibold text-ink">
        <FlaskConical className="h-4 w-4 text-brand-700" /> <Localized as="span">{t("ui.tests")}</Localized>
      </h3>
      {a.ordered_tests.length === 0 ? (
        <p className="text-sm text-ink-muted">{tr("No lab tests or imaging orders were found in your document.")}</p>
      ) : (
        <ul className="space-y-2">
          {a.ordered_tests.map((ts) => (
            <li key={ts.id} className="rounded-xl bg-slate-50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink">{ts.name}</span>
                <Badge tone={ts.type === "lab" ? "blue" : ts.type === "imaging" ? "brand" : "slate"}>
                  {tr(ts.type === "lab" ? "Lab test" : ts.type === "imaging" ? "Imaging" : "Test")}
                </Badge>
              </div>
              {ts.simple_explanation && <Localized as="p" className="mt-1 text-ink">{t(`ts.${ts.id}.explain`, ts.simple_explanation)}</Localized>}
              <dl className="mt-1.5 space-y-1 text-sm">
                <Row label={tr("When")}>{ts.timing ? <Localized as="span">{t(`ts.${ts.id}.timing`, ts.timing)}</Localized> : na}</Row>
                <Row label={tr("Where")}>{ts.location ?? na}</Row>
                {ts.instructions && (
                  <Row label={tr("Prep")}>
                    <Localized as="span">{t(`ts.${ts.id}.instructions`, ts.instructions)}</Localized>
                  </Row>
                )}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-2">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-ink">{children}</dd>
    </div>
  );
}
