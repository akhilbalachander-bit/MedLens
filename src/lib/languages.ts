export type Language = {
  /** short code used for caching and lookups */
  code: string;
  /** English name (sent to the translation model) */
  name: string;
  /** name in the language itself, shown in the selector */
  native: string;
  /** BCP-47 locale for speech synthesis / recognition */
  speech: string;
  /** extra locale prefixes that count as a match when picking a voice */
  voiceAliases?: string[];
  rtl?: boolean;
};

export const BUILT_IN_LANGUAGES: Language[] = [
  { code: "en", name: "English", native: "English", speech: "en-US" },
  { code: "es", name: "Spanish", native: "Español", speech: "es-US", voiceAliases: ["es"] },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt", speech: "vi-VN" },
  { code: "tl", name: "Tagalog (Filipino)", native: "Tagalog", speech: "fil-PH", voiceAliases: ["fil", "tl"] },
  { code: "zh", name: "Mandarin Chinese (Simplified)", native: "中文 (普通话)", speech: "zh-CN", voiceAliases: ["zh-CN", "cmn", "zh"] },
  { code: "hi", name: "Hindi", native: "हिन्दी", speech: "hi-IN" },
  { code: "te", name: "Telugu", native: "తెలుగు", speech: "te-IN" },
  { code: "ta", name: "Tamil", native: "தமிழ்", speech: "ta-IN" },
  { code: "ko", name: "Korean", native: "한국어", speech: "ko-KR" },
  { code: "ja", name: "Japanese", native: "日本語", speech: "ja-JP" },
  { code: "ar", name: "Arabic", native: "العربية", speech: "ar-SA", voiceAliases: ["ar"], rtl: true },
  { code: "fr", name: "French", native: "Français", speech: "fr-FR", voiceAliases: ["fr"] },
  { code: "pt", name: "Portuguese (Brazil)", native: "Português", speech: "pt-BR", voiceAliases: ["pt"] },
];

const RTL = new Set(["ar", "he", "fa", "ur", "ps", "yi"]);

/** Parse NEXT_PUBLIC_EXTRA_LANGUAGES / user-added entries: "code:Name:locale". */
export function parseLanguageList(raw: string | undefined | null): Language[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .flatMap((entry) => {
      const [code, name, speech] = entry.split(":").map((x) => x?.trim());
      if (!code || !name || !/^[a-z]{2,3}(-[A-Za-z0-9]+)?$/.test(code)) return [];
      return [{ code, name, native: name, speech: speech || code, rtl: RTL.has(code.split("-")[0]) }];
    });
}

export function mergeLanguages(...lists: Language[][]): Language[] {
  const map = new Map<string, Language>();
  for (const list of lists) for (const l of list) if (!map.has(l.code)) map.set(l.code, l);
  return [...map.values()];
}

export const ENV_LANGUAGES = parseLanguageList(process.env.NEXT_PUBLIC_EXTRA_LANGUAGES);
