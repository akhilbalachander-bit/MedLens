import { SAMPLE_DOCUMENT as D } from "@/lib/sample/discharge";

/** Renders the fictional sample discharge paperwork as a "paper" document. */
export function SampleDocumentView() {
  return (
    <article className="rounded-md bg-white p-6 font-mono text-[13px] leading-relaxed text-slate-800 shadow-xl">
      <p className="mb-3 rounded bg-amber-100 px-2 py-1 text-center text-[11px] font-bold text-amber-900">{D.footer}</p>
      <header className="border-b-2 border-slate-800 pb-2">
        <p className="text-base font-bold">{D.facility}</p>
        <p>{D.address}</p>
        <p className="mt-2 text-sm font-bold tracking-wide">{D.title}</p>
      </header>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 border-b border-slate-300 pb-3">
        <div><dt className="inline font-bold">Patient: </dt><dd className="inline">{D.patient}</dd></div>
        <div><dt className="inline font-bold">MRN: </dt><dd className="inline">{D.mrn}</dd></div>
        <div><dt className="inline font-bold">Visit: </dt><dd className="inline">{D.visitDate}</dd></div>
        <div><dt className="inline font-bold">Discharged: </dt><dd className="inline">{D.dischargeDate}</dd></div>
        <div><dt className="inline font-bold">Attending: </dt><dd className="inline">{D.attending}</dd></div>
        <div><dt className="inline font-bold">Acct: </dt><dd className="inline">{D.account} · {D.insurance}</dd></div>
      </dl>
      {D.sections.map((s) => (
        <section key={s.heading} className="mt-3">
          <h3 className="font-bold uppercase">{s.heading}</h3>
          {s.lines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </section>
      ))}
      <p className="mt-4 border-t border-slate-300 pt-2 text-[11px]">Patient signature: ____________________ &nbsp; RN: ____________</p>
    </article>
  );
}
