/**
 * Match a Bible's actual language to browser / Android text-to-speech voices.
 * A text edition isn't inherently an audio edition: callers should warn when
 * no matching device voice exists rather than silently force English.
 */
const LANGUAGE_CODES: Record<string, string> = {
  english: "en-US", "english british": "en-GB", "english american": "en-US",
  swahili: "sw-KE", kiswahili: "sw-KE", "swahili kenya": "sw-KE",
  french: "fr-FR", german: "de-DE", spanish: "es-ES", portuguese: "pt-PT",
  "portuguese brazil": "pt-BR", "portuguese brazilian": "pt-BR",
  italian: "it-IT", dutch: "nl-NL", afrikaans: "af-ZA",
  arabic: "ar-SA", "arabic standard": "ar-SA", "arabic sudanese creole": "ar-SD",
  hebrew: "he-IL", greek: "el-GR", latin: "la",
  "chinese": "zh-CN", "chinese mandarin": "zh-CN", "chinese traditional": "zh-TW",
  mandarin: "zh-CN", cantonese: "zh-HK",
  hindi: "hi-IN", urdu: "ur-PK", bengali: "bn-BD", bangla: "bn-BD",
  punjabi: "pa-IN", tamil: "ta-IN", telugu: "te-IN", kannada: "kn-IN",
  malayalam: "ml-IN", marathi: "mr-IN", gujarati: "gu-IN",
  assamese: "as-IN", odia: "or-IN", oriya: "or-IN", nepali: "ne-NP",
  sinhala: "si-LK", sanskrit: "sa-IN",
  russian: "ru-RU", ukrainian: "uk-UA", polish: "pl-PL", czech: "cs-CZ",
  slovak: "sk-SK", romanian: "ro-RO", hungarian: "hu-HU", bulgarian: "bg-BG",
  croatian: "hr-HR", serbian: "sr-RS", slovenian: "sl-SI",
  finnish: "fi-FI", swedish: "sv-SE", norwegian: "nb-NO", danish: "da-DK",
  icelandic: "is-IS", estonian: "et-EE", latvian: "lv-LV", lithuanian: "lt-LT",
  turkish: "tr-TR", persian: "fa-IR", farsi: "fa-IR", kurdish: "ku",
  japanese: "ja-JP", korean: "ko-KR", vietnamese: "vi-VN",
  indonesian: "id-ID", malay: "ms-MY", thai: "th-TH", lao: "lo-LA",
  khmer: "km-KH", burmese: "my-MM", myanmar: "my-MM",
  filipino: "fil-PH", tagalog: "fil-PH",
  amharic: "am-ET", tigrinya: "ti-ER", oromo: "om-ET",
  somali: "so-SO", hausa: "ha-NG", yoruba: "yo-NG", igbo: "ig-NG",
  zulu: "zu-ZA", xhosa: "xh-ZA", sesotho: "st-ZA", setswana: "tn-ZA",
  "south sotho": "st-ZA", kinyarwanda: "rw-RW", kirundi: "rn-BI",
  luganda: "lg-UG", kikuyu: "ki-KE", gikuyu: "ki-KE",
  luo: "luo-KE", dholuo: "luo-KE", kamba: "kam-KE",
  armenian: "hy-AM", georgian: "ka-GE", azerbaijani: "az-AZ",
  mongolian: "mn-MN", kazakh: "kk-KZ", uzbek: "uz-UZ",
  pashto: "ps-AF", cherokee: "chr-US",
  "haitian creole": "ht-HT",
};

/** Normalised names allow catalog variations, including punctuation/region. */
function normalizeLanguage(value: string): string {
  return value.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function bibleSpeechLocale(language: string): string | null {
  const normalized = normalizeLanguage(language);
  if (!normalized) return null;
  if (LANGUAGE_CODES[normalized]) return LANGUAGE_CODES[normalized];
  // eBible also includes "Arabic, Standard", "Swahili: Kenya", and
  // regional/dialect labels. Prefer explicit codes before checking prefixes.
  const candidate = normalized.split(/\s+(?:of|in)\s+|(?:,|:)/)[0] ?? normalized;
  if (LANGUAGE_CODES[candidate]) return LANGUAGE_CODES[candidate];
  const known = Object.entries(LANGUAGE_CODES)
    .filter(([name]) => normalized.startsWith(name + " "))
    .sort((a, b) => b[0].length - a[0].length);
  return known[0]?.[1] ?? null;
}

export type SpeechVoiceSummary = { lang: string; name: string; voiceURI: string };

export function bibleMatchingVoices<T extends SpeechVoiceSummary>(
  voices: readonly T[],
  language: string,
): T[] {
  const target = bibleSpeechLocale(language);
  if (target) {
    const base = target.split("-")[0]!.toLowerCase();
    const matches = voices.filter((voice) => voice.lang.toLowerCase().split(/[-_]/)[0] === base);
    return matches.sort((a, b) =>
      Number(b.lang.toLowerCase() === target.toLowerCase()) -
      Number(a.lang.toLowerCase() === target.toLowerCase()));
  }

  // For rare languages, let installed speech voice labels identify their own
  // language without claiming that an unrelated voice can pronounce the text.
  const normalized = normalizeLanguage(language);
  return voices.filter((voice) => {
    let displayName = "";
    try {
      displayName = new Intl.DisplayNames(["en"], { type: "language" })
        .of(voice.lang.split(/[-_]/)[0] ?? "") ?? "";
    } catch { /* Older browser, match voice names only. */ }
    return !!normalized && [displayName, voice.name].some((name) => {
      const value = normalizeLanguage(name);
      return value === normalized || value.startsWith(normalized + " ");
    });
  });
}

/** Split long verses so mobile TTS engines don't truncate a whole chapter. */
export function bibleSpeechChunks(text: string, limit = 160): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const parts: string[] = [];
  let remaining = clean;
  while (remaining.length > limit) {
    const slice = remaining.slice(0, limit);
    const punctuation = Math.max(...[". ", "! ", "? ", "。", "！", "？"].map((s) => slice.lastIndexOf(s)));
    const space = slice.lastIndexOf(" ");
    const breakAt = punctuation > limit / 3 ? punctuation + 1 : space > limit / 3 ? space : limit;
    parts.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  if (remaining) parts.push(remaining);
  return parts;
}
