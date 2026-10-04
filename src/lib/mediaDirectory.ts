/**
 * Languages the media directory can filter by.
 *
 * Kenya's praise and worship is sung in many languages, not three, so the
 * picker names the ones communities actually record in. Codes are ISO 639
 * (639-1 where one exists, otherwise 639-3), which is what `language_codes`
 * on media_sources and `language_code` on media_items store.
 *
 * "All" and "Other" are buckets, not languages — NAMED_LANGUAGE_CODES below
 * derives from this list so a newly named language can never also fall into
 * "Other".
 */
export const MEDIA_LANGUAGES = [
  { code: "all", label: "All languages" },
  { code: "sw", label: "Kiswahili" },
  { code: "en", label: "English" },
  { code: "ki", label: "Kikuyu" },
  { code: "luo", label: "Dholuo" },
  { code: "kln", label: "Kalenjin" },
  { code: "kam", label: "Kamba" },
  { code: "luy", label: "Luhya" },
  { code: "guz", label: "Ekegusii" },
  { code: "mer", label: "Meru" },
  { code: "mas", label: "Maa" },
  { code: "so", label: "Somali" },
  { code: "other", label: "Other languages" },
] as const;

export type MediaLanguageCode = (typeof MEDIA_LANGUAGES)[number]["code"];

/** The buckets, which are selectable but are not themselves languages. */
const BUCKET_CODES = new Set(["all", "other"]);

/**
 * Every code the picker names outright, plus "und" for sources whose language
 * has not been reviewed yet. A source tagged with any of these is reachable
 * through its own pill, so "Other languages" must exclude them.
 */
export const NAMED_LANGUAGE_CODES: string[] = [
  ...MEDIA_LANGUAGES.map((l) => l.code).filter((c) => !BUCKET_CODES.has(c)),
  "und",
];

/** The Postgres array literal `not(language_codes, "cd", …)` expects. */
export function otherLanguagesExclusion() {
  return `{${NAMED_LANGUAGE_CODES.join(",")}}`;
}

export function safeMediaTerm(value: string) {
  return value
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .trim()
    .slice(0, 100);
}

export function matchesMediaKind(kind: string, requested: "music" | "podcast") {
  return kind === requested || kind === "mixed";
}
