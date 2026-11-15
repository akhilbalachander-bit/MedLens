"use client";

import { useEffect, useRef, useState } from "react";
import { EyeOff, Lock, ShieldCheck, Undo2 } from "lucide-react";
import { drawMasked, newRedaction, type ShieldPage } from "@/lib/privacy/shield";
import type { Box, Redaction } from "@/lib/privacy/redact";
import { useTr } from "@/lib/i18n";
import { btn, cx, Notice } from "../ui";

/**
 * The patient checks what will be sent before anything leaves the device.
 * Personal details are already covered; they can tap a black box to uncover
 * it, tap a word to cover it, or drag across any area to cover it.
 */
export function PrivacyReview({
  pages,
  onChange,
  onConfirm,
  onBack,
  busy,
}: {
  pages: ShieldPage[];
  onChange: (pages: ShieldPage[]) => void;
  onConfirm: () => void;
  onBack: () => void;
  busy?: boolean;
}) {
  const tr = useTr();
  const total = pages.reduce((s, p) => s + p.redactions.length, 0);
  const counts = new Map<string, number>();
  for (const p of pages) for (const r of p.redactions) counts.set(r.label, (counts.get(r.label) ?? 0) + 1);

  const update = (id: string, fn: (rs: Redaction[]) => Redaction[]) =>
    onChange(pages.map((p) => (p.id === id ? { ...p, redactions: fn(p.redactions) } : p)));

  return (
    <div className="space-y-4">
      <div className="ml-panel p-5">
        <p className="eyebrow flex items-center gap-2">
          <Lock className="h-3.5 w-3.5" /> {tr("Privacy check — on your device")}
        </p>
        <h3 className="mt-2 font-display text-3xl text-ink">{tr("Personal details are covered")}</h3>
        <p className="mt-2 max-w-2xl text-ink-soft">
          {tr(
            "Before anything is sent, MedLens covered names, birth dates, addresses, phone numbers and ID numbers on your device. The AI only sees the medical text. A birth date becomes an age range.",
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-2" aria-live="polite">
          {total === 0 ? (
            <span className="chip">{tr("Nothing personal found automatically")}</span>
          ) : (
            [...counts.entries()].map(([label, c]) => (
              <span key={label} className="chip">
                <EyeOff className="h-3.5 w-3.5" /> {label} {c > 1 ? `×${c}` : ""}
              </span>
            ))
          )}
        </div>
        <p className="mt-3 text-sm text-ink-muted">
          {tr("Missed something? Tap a word or drag across an area to cover it. Tap a black box to uncover it.")}
        </p>
      </div>

      {pages.map((p, i) => (
        <PageEditor key={p.id} page={p} index={i} total={pages.length} onRedactions={(fn) => update(p.id, fn)} />
      ))}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={onBack} className={btn.ghost} disabled={busy}>
          {tr("Back")}
        </button>
        <button type="button" onClick={onConfirm} className={cx(btn.primary, "py-3 text-base")} disabled={busy}>
          <ShieldCheck className="h-5 w-5" /> {tr("Looks good — analyze")}
        </button>
      </div>
    </div>
  );
}

function PageEditor({
  page,
  index,
  total,
  onRedactions,
}: {
  page: ShieldPage;
  index: number;
  total: number;
  onRedactions: (fn: (rs: Redaction[]) => Redaction[]) => void;
}) {
  const tr = useTr();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [rect, setRect] = useState<Box | null>(null);
  const [history, setHistory] = useState<Redaction[][]>([]);

  useEffect(() => {
    if (canvasRef.current) drawMasked(page, canvasRef.current);
  }, [page]);

  const toImage = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };
  const inside = (b: Box, x: number, y: number, pad = 6) => x >= b.x0 - pad && x <= b.x1 + pad && y >= b.y0 - pad && y <= b.y1 + pad;
  const change = (fn: (rs: Redaction[]) => Redaction[]) => {
    setHistory((h) => [...h.slice(-19), page.redactions]);
    onRedactions(fn);
  };

  const weak = !page.ocrOk || page.words.length < 12;

  return (
    <figure className="ml-panel overflow-hidden">
      <figcaption className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5 text-sm">
        <span className="eyebrow">{tr("Page {n} of {total} — what the AI will see", { n: index + 1, total })}</span>
        <button
          type="button"
          className={btn.ghost}
          disabled={!history.length}
          onClick={() => {
            const prev = history[history.length - 1];
            setHistory((h) => h.slice(0, -1));
            onRedactions(() => prev);
          }}
        >
          <Undo2 className="h-4 w-4" /> {tr("Undo")}
        </button>
      </figcaption>
      {weak && (
        <Notice tone="warning" className="m-3">
          {page.ocrOk
            ? tr("We could only read a little text on this page. Please drag across any name, address or ID number to cover it.")
            : tr("Automatic checking couldn't run on this page. Please drag across any name, address or ID number to cover it.")}
        </Notice>
      )}
      <div className="relative touch-none select-none bg-black">
        <canvas
          ref={canvasRef}
          className="block h-auto w-full cursor-crosshair"
          aria-label={tr("Page {n} with personal details covered", { n: index + 1 })}
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            const p = toImage(e);
            drag.current = { ...p, moved: false };
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const p = toImage(e);
            if (Math.abs(p.x - drag.current.x) + Math.abs(p.y - drag.current.y) > 12) drag.current.moved = true;
            if (drag.current.moved)
              setRect({ x0: Math.min(p.x, drag.current.x), y0: Math.min(p.y, drag.current.y), x1: Math.max(p.x, drag.current.x), y1: Math.max(p.y, drag.current.y) });
          }}
          onPointerUp={(e) => {
            const d = drag.current;
            drag.current = null;
            if (!d) return;
            const p = toImage(e);
            if (d.moved && rect) {
              change((rs) => [...rs, newRedaction(rect)]);
            } else {
              const hit = page.redactions.find((r) => r.boxes.some((b) => inside(b, p.x, p.y)));
              if (hit) change((rs) => rs.filter((r) => r.id !== hit.id));
              else {
                const w = page.words.find((wd) => inside(wd.bbox, p.x, p.y, 2));
                if (w) change((rs) => [...rs, newRedaction(w.bbox, w.text)]);
              }
            }
            setRect(null);
          }}
        />
        {rect && canvasRef.current && (
          <div
            className="pointer-events-none absolute border-2 border-brand-400 bg-black/60"
            style={{
              left: `${(rect.x0 / canvasRef.current.width) * 100}%`,
              top: `${(rect.y0 / canvasRef.current.height) * 100}%`,
              width: `${((rect.x1 - rect.x0) / canvasRef.current.width) * 100}%`,
              height: `${((rect.y1 - rect.y0) / canvasRef.current.height) * 100}%`,
            }}
          />
        )}
      </div>
    </figure>
  );
}
