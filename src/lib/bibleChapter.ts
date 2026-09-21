import { DEFAULT_TRANSLATION, translationLabel } from "./bible";

export type ChapterPassage = {
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

const cache = new Map<string, ChapterPassage>();

/**
 * Load a whole chapter of public-domain Scripture from bible-api.com.
 *
 * Defaults to the World English Bible, the modern-English translation the rest
 * of the app reads, so a passage says the same thing wherever it appears.
 * Results are cached per translation so moving back and forth between chapters
 * is instant.
 */
export async function fetchChapterPassage(
  reference: string,
  translation: string = DEFAULT_TRANSLATION,
): Promise<ChapterPassage> {
  const ref = reference.trim();
  if (!ref) throw new Error("Choose a Bible passage first.");

  const key = `${translation}:${ref.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const url = `https://bible-api.com/${encodeURIComponent(ref)}?translation=${encodeURIComponent(translation)}&single_chapter_book_matching=indifferent`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Couldn't load ${ref}`);

  const json = (await response.json()) as BibleApiResponse;
  if (json.error || !json.verses?.length) {
    throw new Error(json.error ?? `Couldn't load ${ref}`);
  }

  const passage: ChapterPassage = {
    reference: json.reference ?? ref,
    text: (json.text ?? "").replace(/\s+/g, " ").trim(),
    translation: json.translation_name ?? translationLabel(translation),
    translationId: (json.translation_id ?? translation).toUpperCase(),
    verses: json.verses.map((verse) => ({
      chapter: verse.chapter,
      verse: verse.verse,
      text: verse.text.replace(/\s+/g, " ").trim(),
    })),
  };

  cache.set(key, passage);
  return passage;
}
