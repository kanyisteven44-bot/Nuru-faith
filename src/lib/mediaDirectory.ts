/**
 * Languages the media directory can filter by.
 *
 * Kenya's praise and worship is sung in many languages, not three, so the
 * picker names the ones communities actually record in. Codes are ISO 639
 * (639-1 where one exists, otherwise 639-3), which is what `language_codes`
 * on media_sources and `language_code` on media_items store.
 *
 * A language earns a pill only where gospel recording in it is documented —
 * see content/music-source-candidates.json. Pokot, Samburu, Borana, Kuria
 * and Somali are deliberately absent: no recording artists were found in
 * those languages, and a pill that always returns nothing is a worse answer
 * than no pill. Add them here once an artist is verified.
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
  { code: "tuv", label: "Turkana" },
  { code: "dav", label: "Taita" },
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

/**
 * "Other languages" for media_sources.language_codes, which is an array —
 * the `cd` (contained-by) operator wants a Postgres array literal.
 */
export function otherLanguagesExclusion() {
  return `{${NAMED_LANGUAGE_CODES.join(",")}}`;
}

/**
 * The same bucket for media_items.language_code, which is a single value —
 * the `in` operator wants a parenthesised list instead.
 */
export function otherLanguagesNotIn() {
  return `(${NAMED_LANGUAGE_CODES.join(",")})`;
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
