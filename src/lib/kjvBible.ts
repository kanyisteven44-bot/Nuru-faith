export type KjvPassage = {
  reference: string;
  text: string;
  translation: string;
  translationId: string;
  verses: { chapter: number; verse: number; text: string }[];
};

type BibleApiResponse = {
  reference?: string;
  text?: string;
  translation_id?: string;
  translation_name?: string;
  error?: string;
  verses?: { chapter: number; verse: number; text: string }[];
};

const cache = new Map<string, KjvPassage>();

/**
 * Load public-domain King James Version text from bible-api.com.
 * Results are cached in memory so moving back and forth between chapters is instant.
 */
export async function fetchKjvPassage(reference: string): Promise<KjvPassage> {
  const ref = reference.trim();
  if (!ref) throw new Error("Choose a Bible passage first.");

  const key = ref.toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  const url = `https://bible-api.com/${encodeURIComponent(ref)}?translation=kjv&single_chapter_book_matching=indifferent`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Couldn't load ${ref}`);

  const json = (await response.json()) as BibleApiResponse;
  if (json.error || !json.verses?.length) {
    throw new Error(json.error ?? `Couldn't load ${ref}`);
  }

  const passage: KjvPassage = {
    reference: json.reference ?? ref,
    text: (json.text ?? "").replace(/\s+/g, " ").trim(),
    translation: json.translation_name ?? "King James Version",
    translationId: (json.translation_id ?? "kjv").toUpperCase(),
    verses: json.verses.map((verse) => ({
      chapter: verse.chapter,
      verse: verse.verse,
      text: verse.text.replace(/\s+/g, " ").trim(),
    })),
  };

  cache.set(key, passage);
  return passage;
}
