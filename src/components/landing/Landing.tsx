"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMedLens } from "@/lib/store";
import { useTr } from "@/lib/i18n";
import { sampleResult } from "@/lib/sample/discharge";
import { LanguageSelector } from "../LanguageSelector";
import type { HeartScene } from "./heartScene";
import "./landing.css";

/** Scroll milestones: [start, end] of each slide, and where the nav jumps to. */
const SLIDE_RANGES: [number, number][] = [
  [-0.1, 0.12],
  [0.28, 0.4],
  [0.56, 0.68],
  [0.84, 1.05],
];
const NAV_TARGETS = [0.0, 0.34, 0.62, 0.94];
const LATIN = new Set(["en", "es", "fr", "de", "it", "pt", "pl", "tr", "id", "tl", "vi", "ht"]);

/**
 * Title revealed letter by letter (blur-up, staggered). Scripts where letters
 * join (Hindi, Arabic, Thai…) are revealed word by word so they render
 * correctly. Screen readers get the whole title once.
 */
function RevealTitle({ text, lang, className }: { text: string; lang: string; className?: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  // Two lines when there are several words, like the reference layout.
  const breakAt = words.length > 1 ? Math.ceil(words.length / 2) : words.length;
  const byLetter = LATIN.has(lang.split("-")[0]);
  let n = 0;
  const piece = (s: string, key: string) => (
    <span key={key} className="ml-char" style={{ transitionDelay: `${n++ * 0.035}s` }}>
      {s}
    </span>
  );
  const renderWord = (w: string, wi: number) => {
    if (!byLetter) return piece(w, `w${wi}`);
    const seg =
      typeof Intl !== "undefined" && "Segmenter" in Intl
        ? Array.from(new Intl.Segmenter(lang, { granularity: "grapheme" }).segment(w), (s) => s.segment)
        : Array.from(w);
    return (
      <span key={`w${wi}`} className="ml-word">
        {seg.map((c, ci) => piece(c, `w${wi}c${ci}`))}
      </span>
    );
  };
  return (
    <h2 className={`ml-title ${className ?? ""}`} aria-label={text}>
      <span aria-hidden>
        {words.map((w, i) => (
          <span key={i}>
            {i === breakAt && <br />}
            {i > 0 && i !== breakAt && " "}
            {renderWord(w, i)}
          </span>
        ))}
      </span>
    </h2>
  );
}

export function Landing() {
  const router = useRouter();
  const tr = useTr();
  const { language, analysis, hydrated, setAnalysis } = useMedLens();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const imageRef = useRef<HTMLDivElement>(null);
  const dashRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cursorInner = useRef<HTMLDivElement>(null);
  const cursorOuter = useRef<HTMLDivElement>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  const trySample = () => {
    setAnalysis(sampleResult("sample"));
    router.push("/results");
  };

  const goTo = (i: number) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: max * NAV_TARGETS[i], behavior: reduced ? "auto" : "smooth" });
  };

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 900px)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const customCursor = finePointer && !reducedMotion;
    if (customCursor) document.documentElement.classList.add("ml-custom-cursor");

    let scene: HeartScene | null = null;
    let disposed = false;
    // Three.js is loaded only on this page, after first paint.
    import("./heartScene")
      .then(({ createHeartScene }) => {
        if (disposed || !canvasRef.current) return;
        try {
          scene = createHeartScene(canvasRef.current, { reducedMotion, mobile });
        } catch {
          setWebglFailed(true);
        }
      })
      .catch(() => setWebglFailed(true));

    const state = { scroll: 0, targetScroll: 0, mouseX: 0, mouseY: 0 };
    let tMouseX = 0;
    let tMouseY = 0;
    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;
    let ox = cx;
    let oy = cy;
    const active = [false, false, false, false];

    const onMove = (e: PointerEvent) => {
      cx = e.clientX;
      cy = e.clientY;
      tMouseX = (e.clientX / window.innerWidth) * 2 - 1;
      tMouseY = (e.clientY / window.innerHeight) * 2 - 1;
      if (cursorInner.current) cursorInner.current.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    };
    const onResize = () => scene?.resize();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", onResize);

    // Smoothing factors are "per frame at 60 fps"; scale them by real elapsed
    // time so the feel is the same on a slow phone and a 120 Hz screen.
    const ease = (perFrame: number, dt: number) => 1 - Math.pow(1 - perFrame, dt * 60);
    let raf = 0;
    let last = performance.now();
    const loop = (now: number = performance.now()) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      state.targetScroll = max > 0 ? window.scrollY / max : 0;
      state.scroll = reducedMotion ? state.targetScroll : state.scroll + (state.targetScroll - state.scroll) * ease(0.04, dt);
      state.mouseX += (tMouseX - state.mouseX) * ease(0.05, dt);
      state.mouseY += (tMouseY - state.mouseY) * ease(0.05, dt);

      if (customCursor && cursorOuter.current) {
        ox += (cx - ox) * ease(0.2, dt);
        oy += (cy - oy) * ease(0.2, dt);
        cursorOuter.current.style.transform = `translate(${ox}px, ${oy}px) translate(-50%, -50%)`;
      }

      scene?.frame(state);

      // Slides fade in at their milestones; inactive ones can't take focus.
      SLIDE_RANGES.forEach(([a, b], i) => {
        const on = state.scroll >= a && state.scroll <= b;
        if (on === active[i]) return;
        active[i] = on;
        const el = slideRefs.current[i];
        if (el) {
          el.classList.toggle("is-active", on);
          if (on) el.removeAttribute("inert");
          else el.setAttribute("inert", "");
        }
        if (i === 1) imageRef.current?.classList.toggle("is-active", on);
      });
      // Stories-style progress, one dash per slide.
      dashRefs.current.forEach((d, i) => {
        if (!d) return;
        const p = Math.max(0, Math.min(1, (state.scroll - i * 0.25) / 0.25));
        d.style.height = `${p * 100}%`;
      });
    };
    loop();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      document.documentElement.classList.remove("ml-custom-cursor");
      scene?.dispose();
    };
  }, []);

  const lang = language.code;
  const nav = useMemo(() => ["Scan", "Understand", "Listen", "Act"], []);

  return (
    <div className={`ml-landing ${webglFailed ? "ml-no-webgl" : ""}`}>
      <div ref={cursorInner} className="ml-cursor-inner" aria-hidden />
      <div ref={cursorOuter} className="ml-cursor-outer" aria-hidden />

      <canvas ref={canvasRef} className="ml-webgl" aria-hidden />

      {/* Scroll progress: one dash per slide. */}
      <div className="ml-progress" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="ml-dash">
            <div
              className="ml-dash-fill"
              ref={(el) => {
                dashRefs.current[i] = el;
              }}
            />
          </div>
        ))}
      </div>

      <div ref={imageRef} className="ml-image-mask" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/app-preview.png" alt="" />
      </div>

      <div className="ml-overlay">
        <header className="ml-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/medlens-logo-dark.png" alt="MedLens — AI Prescription & Discharge Translator" className="ml-logo" />
          <nav className="ml-nav" aria-label={tr("Sections")}>
            {nav.map((label, i) => (
              <span key={label} className="ml-nav-item">
                {i > 0 && <span className="ml-nav-dot" aria-hidden />}
                <button type="button" className="ml-nav-link" onClick={() => goTo(i)}>
                  {tr(label)}
                </button>
              </span>
            ))}
          </nav>
          <div className="ml-actions">
            <LanguageSelector compact className="ml-lang" />
            {hydrated && analysis && (
              <Link href="/results" className="ml-ghost-btn">
                {tr("My results")}
              </Link>
            )}
            <Link href="/scan" className="ml-contact-btn">
              {tr("Start scanning")} <span className="ml-btn-circle" />
            </Link>
          </div>
        </header>

        <main id="main">
        <section
          className="ml-slide ml-slide-1"
          ref={(el) => {
            slideRefs.current[0] = el;
          }}
          aria-label={tr("Scan")}
        >
          <RevealTitle text={tr("Paperwork Made Clear")} lang={lang} />
          <div className="ml-desc-row">
            <p className="ml-desc ml-col-1">
              {tr(
                "Hospital discharge papers and prescription labels are written for doctors. Doses, warnings and abbreviations get lost — especially when English isn't your first language.",
              )}
            </p>
            <p className="ml-desc ml-col-2">
              {tr("Take one photo. MedLens explains it in plain words, in your language, reads it aloud, and turns it into a recovery plan.")}
            </p>
          </div>
          <div className="ml-cta-row">
            <Link href="/scan?mode=camera" className="ml-cta ml-cta-primary">
              {tr("Scan with Camera")}
            </Link>
            <Link href="/scan?mode=upload" className="ml-cta">
              {tr("Upload Document")}
            </Link>
            <button type="button" onClick={trySample} className="ml-cta ml-cta-ghost">
              {tr("Try Sample Document")}
            </button>
          </div>
          <p className="ml-scroll-hint" aria-hidden>
            <span className="ml-scroll-line" /> {tr("Scroll to explore")}
          </p>
        </section>

        <section
          className="ml-slide ml-slide-2"
          inert
          ref={(el) => {
            slideRefs.current[1] = el;
          }}
          aria-label={tr("Understand")}
        >
          <RevealTitle text={tr("Plain Words")} lang={lang} />
          <p className="ml-desc">
            {tr(
              "A plain-language summary, your instructions next to the original, a glossary for every medical term, and each medicine explained. Anything unclear is flagged for your pharmacist.",
            )}
          </p>
        </section>

        <section
          className="ml-slide ml-slide-3"
          inert
          ref={(el) => {
            slideRefs.current[2] = el;
          }}
          aria-label={tr("Listen")}
        >
          <RevealTitle text={tr("Your Language")} lang={lang} className="ml-nowrap" />
          <p className="ml-desc">
            {tr(
              "Choose from 30 languages and the whole app follows. A warm, natural voice reads everything aloud, even when your phone has no voice for that language.",
            )}
          </p>
        </section>

        <section
          className="ml-slide ml-slide-4"
          inert
          ref={(el) => {
            slideRefs.current[3] = el;
          }}
          aria-label={tr("Act")}
        >
          <RevealTitle text={tr("Safe Recovery")} lang={lang} />
          <p className="ml-desc">
            {tr(
              "Warning signs sorted red, yellow and green, a checklist with reminders, help reading your hospital bill, and an assistant that answers from your own papers. No account. Nothing stored.",
            )}
          </p>
          <div className="ml-cta-row">
            <Link href="/scan" className="ml-cta ml-cta-primary">
              {tr("Start scanning")}
            </Link>
            <button type="button" onClick={trySample} className="ml-cta ml-cta-ghost">
              {tr("Try Sample Document")}
            </button>
          </div>
        </section>

        </main>
        <p className="ml-footnote">
          {tr("MedLens explains paperwork. It is not medical advice. In an emergency, call 911.")}{" "}
          <Link href="/privacy" className="ml-foot-link">
            {tr("Privacy")}
          </Link>{" "}
          ·{" "}
          <Link href="/terms" className="ml-foot-link">
            {tr("Terms")}
          </Link>
        </p>
      </div>
    </div>
  );
}
