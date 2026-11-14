"use client";

import { useEffect, useState } from "react";
import { Bell, Bot, CheckCircle2, Languages, Plus, Settings, ShieldCheck, Trash2, Type, Volume2, XCircle } from "lucide-react";
import { useMedLens } from "@/lib/store";
import { useSpeech } from "@/components/speech/SpeechContext";
import { voicesForLanguage } from "@/lib/speech/engine";
import { LanguageSelector } from "@/components/LanguageSelector";
import { BUILT_IN_LANGUAGES, ENV_LANGUAGES } from "@/lib/languages";
import { Badge, btn, Card, cx, SectionTitle } from "@/components/ui";

const TEST_PHRASE: Record<string, string> = {
  en: "This is how MedLens will read your instructions.",
  es: "Así es como MedLens leerá sus instrucciones.",
  vi: "Đây là cách MedLens sẽ đọc hướng dẫn của bạn.",
  tl: "Ganito babasahin ng MedLens ang iyong mga tagubilin.",
  zh: "MedLens 会这样为您朗读说明。",
  hi: "MedLens आपके निर्देश इस तरह पढ़ेगा।",
  te: "MedLens మీ సూచనలను ఇలా చదువుతుంది.",
  ta: "MedLens உங்கள் வழிமுறைகளை இப்படி படிக்கும்.",
  ko: "MedLens는 이렇게 안내문을 읽어 드립니다.",
  ja: "MedLens はこのように説明を読み上げます。",
  ar: "هكذا سيقرأ MedLens تعليماتك.",
  fr: "Voici comment MedLens lira vos instructions.",
  pt: "É assim que o MedLens vai ler suas instruções.",
};

export default function SettingsPage() {
  const { prefs, setPrefs, language, languages, provider, clearSession, notify } = useMedLens();
  const speech = useSpeech();
  const [custom, setCustom] = useState({ code: "", name: "", speech: "" });
  const [perm, setPerm] = useState<string>("unsupported");
  useEffect(() => {
    if ("Notification" in window) setPerm(Notification.permission);
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
        <Settings className="h-7 w-7 text-brand-700" /> Settings
      </h1>

      <Card>
        <SectionTitle icon={<Languages className="h-5 w-5" />}>Language</SectionTitle>
        <LanguageSelector />
        <p className="mt-2 text-sm text-ink-soft">
          Your document is analyzed once. Switching language translates the explanation text only, and keeps medication names, doses and numbers
          unchanged.
        </p>
      </Card>

      <Card>
        <SectionTitle icon={<Volume2 className="h-5 w-5" />}>Read aloud</SectionTitle>
        {!speech.supported ? (
          <p className="text-ink-soft">This browser does not support read-aloud (Web Speech API).</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-ink">Speed</span>
              <div className="inline-flex overflow-hidden rounded-xl border border-slate-300" role="group" aria-label="Speaking speed">
                {(["slow", "normal"] as const).map((r) => (
                  <button key={r} onClick={() => setPrefs({ speechRate: r })} aria-pressed={prefs.speechRate === r} className={cx("px-4 py-2 font-medium", prefs.speechRate === r ? "bg-brand-700 text-white" : "hover:bg-slate-50")}>
                    {r === "slow" ? "Slower" : "Normal"}
                  </button>
                ))}
              </div>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink">Voice for {language.name}</span>
              <select value={speech.selectedVoiceId ?? ""} onChange={(e) => speech.setVoice(e.target.value || null)} className="w-full max-w-md rounded-xl border border-slate-300 px-3 py-2">
                {speech.languageVoices.length === 0 && <option value="">No {language.name} voice installed — browser default</option>}
                {speech.languageVoices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.lang}){v.local ? "" : " · online"}
                  </option>
                ))}
              </select>
            </label>
            <button className={btn.secondary} onClick={() => speech.speak({ id: "test", label: "Voice test", text: TEST_PHRASE[language.code] ?? TEST_PHRASE.en })}>
              <Volume2 className="h-4 w-4" /> Test voice
            </button>
            <details className="rounded-xl bg-slate-50 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-ink">Voice availability on this device</summary>
              <p className="mt-2 text-xs text-ink-muted">
                Voices come from your browser and operating system, so they differ between devices. You can usually add more in your device&apos;s
                language or text-to-speech settings.
              </p>
              <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                {languages.map((l) => {
                  const n = voicesForLanguage(speech.voices, l).length;
                  return (
                    <li key={l.code} className="flex items-center gap-2">
                      {n ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-slate-400" />}
                      {l.name}: {n ? `${n} voice${n > 1 ? "s" : ""}` : "no voice found"}
                    </li>
                  );
                })}
              </ul>
            </details>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle icon={<Type className="h-5 w-5" />}>Text size</SectionTitle>
        <div className="inline-flex overflow-hidden rounded-xl border border-slate-300" role="group" aria-label="Text size">
          {(["normal", "large"] as const).map((s) => (
            <button key={s} onClick={() => setPrefs({ textSize: s })} aria-pressed={prefs.textSize === s} className={cx("px-4 py-2 font-medium capitalize", prefs.textSize === s ? "bg-brand-700 text-white" : "hover:bg-slate-50")}>
              {s === "normal" ? "Normal" : "Larger"}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle icon={<Plus className="h-5 w-5" />}>Add a language</SectionTitle>
        <p className="mb-3 text-sm text-ink-soft">
          Add another language for translation and read-aloud. Use a language code (like <code>de</code>) and a speech locale (like <code>de-DE</code>).
          Server admins can also set <code>NEXT_PUBLIC_EXTRA_LANGUAGES</code>.
        </p>
        <form
          className="grid gap-2 sm:grid-cols-[6rem_1fr_8rem_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            const code = custom.code.trim().toLowerCase();
            if (!/^[a-z]{2,3}(-[a-z0-9]+)?$/.test(code) || !custom.name.trim()) {
              notify("Enter a valid language code (e.g. de) and a name.", "warning");
              return;
            }
            if (languages.some((l) => l.code === code)) {
              notify("That language is already available.", "warning");
              return;
            }
            setPrefs({
              customLanguages: [
                ...prefs.customLanguages,
                { code, name: custom.name.trim(), native: custom.name.trim(), speech: custom.speech.trim() || code, rtl: ["ar", "he", "fa", "ur"].includes(code.split("-")[0]) },
              ],
            });
            setCustom({ code: "", name: "", speech: "" });
            notify(`${custom.name.trim()} added.`, "success");
          }}
        >
          <input aria-label="Language code" placeholder="Code" value={custom.code} onChange={(e) => setCustom({ ...custom, code: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
          <input aria-label="Language name" placeholder="Name (e.g. German)" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
          <input aria-label="Speech locale" placeholder="Locale" value={custom.speech} onChange={(e) => setCustom({ ...custom, speech: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
          <button className={btn.primary} type="submit">
            Add
          </button>
        </form>
        {(prefs.customLanguages.length > 0 || ENV_LANGUAGES.length > 0) && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {ENV_LANGUAGES.map((l) => (
              <Badge key={l.code} tone="blue">
                {l.name} (server)
              </Badge>
            ))}
            {prefs.customLanguages.map((l) => (
              <li key={l.code}>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm">
                  {l.name} <code className="text-xs">{l.speech}</code>
                  <button
                    onClick={() => {
                      setPrefs({ customLanguages: prefs.customLanguages.filter((x) => x.code !== l.code), language: prefs.language === l.code ? "en" : prefs.language });
                    }}
                    aria-label={`Remove ${l.name}`}
                    className="ml-1 text-red-700"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-ink-muted">Built in: {BUILT_IN_LANGUAGES.map((l) => l.name).join(", ")}.</p>
      </Card>

      <Card>
        <SectionTitle icon={<Bell className="h-5 w-5" />}>Reminders</SectionTitle>
        <p className="text-sm text-ink-soft">Allow notifications so checklist reminders can pop up while MedLens is open.</p>
        <div className="mt-2 flex items-center gap-3">
          <Badge tone={perm === "granted" ? "green" : perm === "denied" ? "red" : "slate"}>
            {perm === "unsupported" ? "Not supported" : perm === "granted" ? "Allowed" : perm === "denied" ? "Blocked in browser settings" : "Not yet allowed"}
          </Badge>
          {perm === "default" && (
            <button className={btn.secondary} onClick={async () => setPerm(await Notification.requestPermission())}>
              Allow notifications
            </button>
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle icon={<Bot className="h-5 w-5" />}>AI document reader</SectionTitle>
        {provider ? (
          provider.configured ? (
            <p className="text-ink">
              Connected: <strong>{provider.provider}</strong> · model <code>{provider.model}</code>. Uploads up to {provider.maxFiles} pages, {provider.maxFileMb} MB each.
            </p>
          ) : (
            <p className="text-ink-soft">
              {provider.provider === "mock"
                ? "Mock provider is on (development): every scan returns the fictional sample."
                : "No AI provider is configured on this server. The sample document, bill tools, letters and offline assistant still work. To enable scanning, set GEMINI_API_KEY or OPENAI_API_KEY in .env.local."}
            </p>
          )
        ) : (
          <p className="text-ink-muted">Checking…</p>
        )}
      </Card>

      <Card>
        <SectionTitle icon={<ShieldCheck className="h-5 w-5" />}>Privacy</SectionTitle>
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-soft">
          <li>No account or login. MedLens does not keep your uploaded documents — they are sent once for analysis and discarded.</li>
          <li>Your results, checklist and reminders are kept only in this browser tab&apos;s session storage and disappear when the session ends.</li>
          <li>Only preferences (language, voice, speed, text size) are remembered on this device.</li>
        </ul>
        <button
          className={cx(btn.secondary, "mt-3 text-red-700")}
          onClick={() => {
            if (!confirm("Delete your scanned results, checklist, reminders and bill from this browser?")) return;
            clearSession();
            notify("Your session data was deleted.", "success");
          }}
        >
          <Trash2 className="h-4 w-4" /> Delete my session data
        </button>
      </Card>
    </div>
  );
}
