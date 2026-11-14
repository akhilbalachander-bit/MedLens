"use client";

import { useEffect, useRef, useState } from "react";
import { AlertOctagon, Keyboard, Mic, MicOff, Send, Volume2, VolumeX, Bot } from "lucide-react";
import { useMedLens } from "@/lib/store";
import { useSpeechRecognition } from "@/lib/speech/recognition";
import { localAnswer } from "@/lib/local-assistant";
import { detectEmergency, EMERGENCY_MESSAGE } from "@/lib/emergency";
import { useSpeech } from "@/components/speech/SpeechContext";
import { SpeakButton } from "@/components/speech/ListenControls";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Badge, btn, Card, cx, Notice } from "@/components/ui";
import { useTr } from "@/lib/i18n";

type Msg = { id: number; role: "user" | "assistant"; text: string; urgent?: boolean; sources?: string[]; offline?: boolean };

const SUGGESTIONS = [
  "How do I take my medicines?",
  "When should I go to the emergency room?",
  "When is my follow-up appointment?",
  "What can I eat?",
  "What does my diagnosis mean?",
  "What tests do I need?",
];

export default function AssistantPage() {
  const { analysis, language, t, provider } = useMedLens();
  const speech = useSpeech();
  const tr = useTr();
  const rec = useSpeechRecognition(language.speech);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [typing, setTyping] = useState(false);
  const idRef = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setInput("");
    const userMsg: Msg = { id: ++idRef.current, role: "user", text: q };
    setMessages((m) => [...m, userMsg]);
    setBusy(true);
    let reply: Msg;
    try {
      if (!provider?.configured) throw new Error("offline");
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          language: { code: language.code, name: language.name },
          context: analysis ? { ...analysis, meta: undefined } : null,
          history: messages.slice(-6).map((m) => ({ role: m.role, text: m.text.slice(0, 1500) })),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? "failed");
      let text: string = body.answer;
      if ((body.urgent || detectEmergency(q)) && !/911/.test(text)) text = `${tr(EMERGENCY_MESSAGE)} ${text}`;
      reply = { id: ++idRef.current, role: "assistant", text, urgent: body.urgent || detectEmergency(q), sources: body.sources };
    } catch {
      const r = localAnswer(q, analysis, t, tr);
      reply = { id: ++idRef.current, role: "assistant", text: r.answer, urgent: r.urgent, sources: r.sources, offline: true };
    }
    setMessages((m) => [...m, reply]);
    setBusy(false);
    if (autoSpeak) speech.speak({ id: `msg-${reply.id}`, label: tr("Assistant answer"), text: reply.text });
  };

  const showText = typing || !rec.supported;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
            <Mic className="h-7 w-7 text-brand-700" /> {tr("Voice Assistant")}
          </h1>
          <p className="mt-1 text-ink-soft">
            {tr("Ask about your paperwork out loud or by typing.")}{" "}
            {analysis
              ? tr("Answers use your document from {place}.", { place: analysis.facility_name ?? tr("your scan") })
              : tr("Scan a document first for answers about it.")}
          </p>
        </div>
        <LanguageSelector />
      </div>

      <Notice tone="danger" icon={<AlertOctagon className="h-5 w-5" />}>
        {tr("This assistant explains your paperwork; it cannot diagnose or give medical advice.")} <strong>{tr("For an emergency, call 911.")}</strong>
      </Notice>

      {!provider?.configured && provider && (
        <Notice tone="info">
          {tr("No AI provider is configured, so the assistant is in offline mode: it looks up answers directly in your document.")}
        </Notice>
      )}

      <Card className="min-h-[300px]">
        {messages.length === 0 ? (
          <div>
            <p className="mb-3 font-medium text-ink">{tr("Try asking:")}</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => ask(tr(s))} className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm text-brand-900 hover:bg-brand-100">
                  {tr(s)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="space-y-3" aria-live="polite">
            {messages.map((m) => (
              <li key={m.id} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cx(
                    "max-w-[85%] rounded-2xl px-4 py-3",
                    m.role === "user" ? "bg-brand-700 text-white" : m.urgent ? "border-2 border-red-300 bg-red-50 text-ink" : "bg-slate-100 text-ink",
                  )}
                  lang={m.role === "assistant" ? language.code : undefined}
                  dir={language.rtl ? "rtl" : undefined}
                >
                  {m.role === "assistant" && (
                    <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-ink-muted">
                      <Bot className="h-3.5 w-3.5" /> MedLens {m.offline && <Badge>{tr("answered from your document")}</Badge>}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap text-[17px] leading-relaxed">{m.text}</p>
                  {m.role === "assistant" && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <SpeakButton req={{ id: `msg-${m.id}`, label: tr("Assistant answer"), text: m.text }} />
                      {m.urgent && (
                        <a href="tel:911" className="rounded-full bg-red-600 px-3 py-1.5 text-sm font-bold text-white">
                          {tr("Call 911")}
                        </a>
                      )}
                      {m.sources?.map((s) => (
                        <Badge key={s}>{tr(s)}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
            {busy && <li className="text-sm text-ink-muted">{tr("MedLens is thinking…")}</li>}
          </ul>
        )}
        <div ref={endRef} />
      </Card>

      <div className="sticky bottom-20 z-10 rounded-2xl border border-slate-200 bg-white p-3 shadow-card lg:bottom-4">
        {rec.listening && <p className="mb-2 text-sm text-brand-800">{tr("Listening…")} {rec.interim}</p>}
        {rec.error && <p className="mb-2 text-sm text-amber-900">{rec.error}</p>}
        <div className="flex items-center gap-2">
          {rec.supported && (
            <button
              onClick={() => (rec.listening ? rec.stop() : (speech.stop(), rec.start((txt) => ask(txt))))}
              className={cx(
                "grid h-14 w-14 shrink-0 place-items-center rounded-full text-white shadow",
                rec.listening ? "animate-pulse bg-red-600" : "bg-brand-700 hover:bg-brand-800",
              )}
              aria-label={rec.listening ? tr("Stop listening") : tr("Speak your question in {language}", { language: language.native })}
            >
              {rec.listening ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
            </button>
          )}
          {showText ? (
            <form
              className="flex flex-1 items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void ask(input);
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={tr("Type your question…")}
                aria-label={tr("Type your question")}
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-3 text-base"
                lang={language.code}
                dir={language.rtl ? "rtl" : undefined}
              />
              <button type="submit" disabled={!input.trim() || busy} className={btn.primary} aria-label={tr("Send")}>
                <Send className="h-5 w-5" />
              </button>
            </form>
          ) : (
            <div className="flex flex-1 items-center justify-between gap-2">
              <p className="text-sm text-ink-soft">{tr("Tap the microphone and ask your question in {language}.", { language: language.native })}</p>
              <button onClick={() => setTyping(true)} className={btn.ghost}>
                <Keyboard className="h-4 w-4" /> {tr("Type instead")}
              </button>
            </div>
          )}
          <button
            onClick={() => {
              setAutoSpeak((a) => !a);
              speech.stop();
            }}
            className="rounded-full p-2 text-ink-muted hover:bg-slate-100"
            aria-pressed={autoSpeak}
            aria-label={autoSpeak ? tr("Turn off spoken answers") : tr("Turn on spoken answers")}
            title={autoSpeak ? tr("Answers are read aloud") : tr("Answers are not read aloud")}
          >
            {autoSpeak ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
        </div>
        {!rec.supported && <p className="mt-2 text-xs text-ink-muted">{tr("Voice input isn't supported in this browser, so please type your question.")}</p>}
      </div>
    </div>
  );
}
