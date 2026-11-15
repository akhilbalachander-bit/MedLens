"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Bot, CheckCircle2, Languages, Plus, Settings, ShieldCheck, Trash2, Type, Volume2, XCircle } from "lucide-react";
import { useMedLens } from "@/lib/store";
import { useSpeech } from "@/components/speech/SpeechContext";
import { voicesForLanguage } from "@/lib/speech/engine";
import { LanguageSelector } from "@/components/LanguageSelector";
import { BUILT_IN_LANGUAGES, ENV_LANGUAGES } from "@/lib/languages";
import { Badge, btn, Card, cx, SectionTitle } from "@/components/ui";
import { useTr } from "@/lib/i18n";

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
  bn: "MedLens এভাবেই আপনার নির্দেশাবলী পড়ে শোনাবে।",
  mr: "MedLens तुमच्या सूचना अशा प्रकारे वाचेल.",
  gu: "MedLens તમારી સૂચનાઓ આ રીતે વાંચશે.",
  pa: "MedLens ਤੁਹਾਡੀਆਂ ਹਦਾਇਤਾਂ ਇਸ ਤਰ੍ਹਾਂ ਪੜ੍ਹੇਗਾ।",
  kn: "MedLens ನಿಮ್ಮ ಸೂಚನೆಗಳನ್ನು ಹೀಗೆ ಓದುತ್ತದೆ.",
  ml: "MedLens നിങ്ങളുടെ നിർദ്ദേശങ്ങൾ ഇങ്ങനെ വായിക്കും.",
  ur: "MedLens آپ کی ہدایات اس طرح پڑھے گا۔",
  th: "นี่คือวิธีที่ MedLens จะอ่านคำแนะนำของคุณ",
  id: "Beginilah MedLens akan membacakan petunjuk Anda.",
  fa: "MedLens دستورالعمل‌های شما را این‌گونه می‌خواند.",
  de: "So liest MedLens Ihre Anweisungen vor.",
  it: "Ecco come MedLens leggerà le tue istruzioni.",
  ru: "Вот так MedLens будет читать ваши инструкции.",
  uk: "Ось так MedLens читатиме ваші інструкції.",
  pl: "Tak MedLens będzie czytać Twoje instrukcje.",
  tr: "MedLens talimatlarınızı bu şekilde okuyacak.",
  ht: "Se konsa MedLens ap li enstriksyon ou yo.",
};

export default function SettingsPage() {
  const { prefs, setPrefs, language, languages, provider, clearSession, notify } = useMedLens();
  const speech = useSpeech();
  const tr = useTr();
  const [custom, setCustom] = useState({ code: "", name: "", speech: "" });
  const [perm, setPerm] = useState<string>("unsupported");
  useEffect(() => {
    if ("Notification" in window) setPerm(Notification.permission);
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="flex items-center gap-2 font-display text-4xl font-normal tracking-wide text-ink sm:text-5xl">
        <Settings className="h-7 w-7 text-brand-700" /> {tr("Settings")}
      </h1>

      <Card>
        <SectionTitle icon={<Languages className="h-5 w-5" />}>{tr("Language")}</SectionTitle>
        <LanguageSelector />
        <p className="mt-2 text-sm text-ink-soft">
          {tr("Your document is analyzed once. Switching language translates the explanation text and the app, and keeps medication names, doses and numbers unchanged.")}
        </p>
      </Card>

      <Card>
        <SectionTitle icon={<Volume2 className="h-5 w-5" />}>{tr("Read aloud")}</SectionTitle>
        {!speech.supported ? (
          <p className="text-ink-soft">{tr("This browser does not support read-aloud.")}</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-ink">{tr("Speed")}</span>
              <div className="inline-flex overflow-hidden rounded-xl border border-slate-300" role="group" aria-label={tr("Speaking speed")}>
                {(["slow", "normal"] as const).map((r) => (
                  <button key={r} onClick={() => setPrefs({ speechRate: r })} aria-pressed={prefs.speechRate === r} className={cx("px-4 py-2 font-medium", prefs.speechRate === r ? "bg-brand-700 text-white" : "hover:bg-slate-50")}>
                    {tr(r === "slow" ? "Slower" : "Normal")}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="mb-1 block text-sm font-medium text-ink">{tr("Voice source")}</span>
              <div className="inline-flex overflow-hidden rounded-xl border border-slate-300" role="group" aria-label={tr("Voice source")}>
                {(
                  [
                    ["auto", "Natural online voice"],
                    ["device", "This device's voices"],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    onClick={() => setPrefs({ voiceSource: v })}
                    disabled={v === "auto" && !speech.cloudAvailable}
                    aria-pressed={(prefs.voiceSource ?? "auto") === v && (v === "device" || speech.cloudAvailable)}
                    className={cx(
                      "px-4 py-2 text-sm font-medium disabled:opacity-40",
                      (v === "auto" ? speech.cloud : !speech.cloud) ? "bg-brand-700 text-white" : "hover:bg-slate-50",
                    )}
                  >
                    {tr(label)}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                {speech.cloudAvailable
                  ? tr("Natural voices work in every language, even if your phone has none installed. The text being read is sent to the voice service; your document image is not.")
                  : tr("Natural online voices are not set up on this server, so your device's own voices are used.")}
              </p>
            </div>
            {!speech.cloud && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink">{tr("Voice for {language}", { language: language.native })}</span>
              <select value={speech.selectedVoiceId ?? ""} onChange={(e) => speech.setVoice(e.target.value || null)} className="w-full max-w-md rounded-xl border border-slate-300 px-3 py-2">
                {speech.languageVoices.length === 0 && <option value="">{tr("No {language} voice installed — browser default", { language: language.native })}</option>}
                {speech.languageVoices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.lang}){v.local ? "" : ` · ${tr("online")}`}
                  </option>
                ))}
              </select>
            </label>
            )}
            <button className={btn.secondary} onClick={() => speech.speak({ id: "test", label: tr("Voice test"), lang: language, text: TEST_PHRASE[language.code] ?? TEST_PHRASE.en })}>
              <Volume2 className="h-4 w-4" /> {tr("Test voice")}
            </button>
            {speech.status === "loading" && <p className="text-sm text-brand-800">{tr("Preparing voice…")}</p>}
            {speech.notice && <p className="text-sm text-amber-900">{tr(speech.notice)}</p>}
            {speech.error && <p className="text-sm text-red-700">{tr(speech.error)}</p>}
            <details className="rounded-xl bg-slate-50 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-ink">{tr("Voices installed on this device")}</summary>
              <p className="mt-2 text-xs text-ink-muted">
                {tr("Voices come from your browser and operating system, so they differ between devices. You can usually add more in your device's language or text-to-speech settings.")}
              </p>
              <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                {languages.map((l) => {
                  const n = voicesForLanguage(speech.voices, l).length;
                  return (
                    <li key={l.code} className="flex items-center gap-2">
                      {n ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-slate-400" />}
                      {l.native}: {n ? (n > 1 ? tr("{count} voices", { count: n }) : tr("1 voice")) : tr("no voice found")}
                    </li>
                  );
                })}
              </ul>
            </details>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle icon={<Type className="h-5 w-5" />}>{tr("Text size")}</SectionTitle>
        <div className="inline-flex overflow-hidden rounded-xl border border-slate-300" role="group" aria-label={tr("Text size")}>
          {(["normal", "large"] as const).map((s) => (
            <button key={s} onClick={() => setPrefs({ textSize: s })} aria-pressed={prefs.textSize === s} className={cx("px-4 py-2 font-medium", prefs.textSize === s ? "bg-brand-700 text-white" : "hover:bg-slate-50")}>
              {tr(s === "normal" ? "Normal" : "Larger")}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle icon={<Plus className="h-5 w-5" />}>{tr("Add a language")}</SectionTitle>
        <p className="mb-3 text-sm text-ink-soft">
          {tr("Add another language for translation and read-aloud. Use a language code (like sw) and a speech locale (like sw-KE).")}
        </p>
        <form
          className="grid gap-2 sm:grid-cols-[6rem_1fr_8rem_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            const code = custom.code.trim().toLowerCase();
            if (!/^[a-z]{2,3}(-[a-z0-9]+)?$/.test(code) || !custom.name.trim()) {
              notify("Enter a valid language code (e.g. sw) and a name.", "warning");
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
            notify("Language added.", "success");
          }}
        >
          <input aria-label={tr("Language code")} placeholder={tr("Code")} value={custom.code} onChange={(e) => setCustom({ ...custom, code: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
          <input aria-label={tr("Language name")} placeholder={tr("Name (e.g. Swahili)")} value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
          <input aria-label={tr("Speech locale")} placeholder={tr("Locale")} value={custom.speech} onChange={(e) => setCustom({ ...custom, speech: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
          <button className={btn.primary} type="submit">
            {tr("Add")}
          </button>
        </form>
        {(prefs.customLanguages.length > 0 || ENV_LANGUAGES.length > 0) && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {ENV_LANGUAGES.map((l) => (
              <Badge key={l.code} tone="blue">
                {l.name} ({tr("server")})
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
                    aria-label={tr("Remove {language}", { language: l.name })}
                    className="ml-1 text-red-700"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-ink-muted">{tr("Built in:")} {BUILT_IN_LANGUAGES.map((l) => l.native).join(", ")}.</p>
      </Card>

      <Card>
        <SectionTitle icon={<Bell className="h-5 w-5" />}>{tr("Reminders")}</SectionTitle>
        <p className="text-sm text-ink-soft">{tr("Allow notifications so checklist reminders can pop up while MedLens is open.")}</p>
        <div className="mt-2 flex items-center gap-3">
          <Badge tone={perm === "granted" ? "green" : perm === "denied" ? "red" : "slate"}>
            {tr(perm === "unsupported" ? "Not supported" : perm === "granted" ? "Allowed" : perm === "denied" ? "Blocked in browser settings" : "Not yet allowed")}
          </Badge>
          {perm === "default" && (
            <button className={btn.secondary} onClick={async () => setPerm(await Notification.requestPermission())}>
              {tr("Allow notifications")}
            </button>
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle icon={<Bot className="h-5 w-5" />}>{tr("AI document reader")}</SectionTitle>
        {provider ? (
          provider.configured ? (
            <p className="text-ink">
              {tr("Connected:")} <strong>{provider.provider}</strong> · <code>{provider.model}</code>.{" "}
              {tr("Uploads up to {pages} pages, {mb} MB each.", { pages: provider.maxFiles, mb: provider.maxFileMb })}
            </p>
          ) : (
            <p className="text-ink-soft">
              {provider.provider === "mock"
                ? tr("Mock provider is on (development): every scan returns the fictional sample.")
                : tr("No AI provider is configured on this server. The sample document, bill tools, letters and offline assistant still work.")}
            </p>
          )
        ) : (
          <p className="text-ink-muted">{tr("Checking…")}</p>
        )}
      </Card>

      <Card>
        <SectionTitle icon={<ShieldCheck className="h-5 w-5" />}>{tr("Privacy")}</SectionTitle>
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-soft">
          <li>{tr("Personal details (names, birth dates, addresses, phone numbers, ID numbers) are covered on your device before anything is sent. The AI only sees medical text.")}</li>
          <li>{tr("No account or login, and no database: MedLens does not keep your documents or results on its servers.")}</li>
          <li>{tr("Your results, checklist and reminders are kept only in this browser tab's session storage and disappear when the session ends.")}</li>
          <li>{tr("Only preferences (language, voice, speed, text size) are remembered on this device.")}</li>
        </ul>
        <p className="mt-3 text-sm">
          <Link href="/privacy" className="font-semibold text-brand-800 underline">
            {tr("Read the Privacy Policy")}
          </Link>
        </p>
        <button
          className={cx(btn.secondary, "mt-3 text-red-700")}
          onClick={() => {
            if (!confirm(tr("Delete your scanned results, checklist, reminders and bill from this browser?"))) return;
            clearSession();
            notify("Your session data was deleted.", "success");
          }}
        >
          <Trash2 className="h-4 w-4" /> {tr("Delete my session data")}
        </button>
      </Card>
    </div>
  );
}
