/**
 * Real Scripture text from the free bible-api.com service (World English Bible).
 * No API key, no server-side secret needed.
 */

export type Passage = {
  reference: string;
  text: string;
  translation: string;
  verses: { chapter: number; verse: number; text: string }[];
};

type ApiResponse = {
  reference?: string;
  text?: string;
  translation_name?: string;
  error?: string;
  verses?: { chapter: number; verse: number; text: string }[];
};

const cache = new Map<string, Passage>();

export async function fetchPassage(reference: string): Promise<Passage> {
  const ref = reference.trim();
  const cached = cache.get(ref.toLowerCase());
  if (cached) return cached;

  const res = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=web`);
  if (!res.ok) throw new Error(`Couldn't load ${ref}`);
  const json = (await res.json()) as ApiResponse;
  if (json.error || !json.text) throw new Error(json.error ?? `Couldn't load ${ref}`);

  const passage: Passage = {
    reference: json.reference ?? ref,
    text: json.text.replace(/\s+/g, " ").trim(),
    translation: json.translation_name ?? "World English Bible",
    verses: (json.verses ?? []).map((v) => ({
      chapter: v.chapter,
      verse: v.verse,
      text: v.text.replace(/\s+/g, " ").trim(),
    })),
  };
  cache.set(ref.toLowerCase(), passage);
  return passage;
}

/** A rotating verse of the day — stable for the whole calendar day. */
const VERSE_OF_THE_DAY = [
  "Matthew 5:14-16",
  "Jeremiah 29:11",
  "Psalm 23:1-4",
  "Romans 8:28",
  "Philippians 4:6-7",
  "Isaiah 40:31",
  "Proverbs 3:5-6",
  "2 Corinthians 5:17",
  "Joshua 1:9",
  "Psalm 34:17-18",
  "John 1:1-5",
  "Romans 12:1-2",
  "Lamentations 3:22-23",
  "Hebrews 11:1",
  "1 Peter 5:6-7",
  "Galatians 5:22-23",
  "Ephesians 2:8-10",
  "Psalm 119:105",
  "Matthew 11:28-30",
  "James 1:2-4",
  "Colossians 3:12-14",
  "Micah 6:8",
  "1 Corinthians 13:4-7",
  "Psalm 121:1-4",
  "John 14:27",
  "Romans 15:13",
  "Zephaniah 3:17",
  "2 Timothy 1:7",
  "Psalm 46:1-3",
  "Isaiah 41:10",
  "Revelation 21:3-4",
];

export function verseOfTheDayRef(date = new Date()): string {
  const dayIndex = Math.floor(date.getTime() / 86400000);
  return VERSE_OF_THE_DAY[dayIndex % VERSE_OF_THE_DAY.length]!;
}

export async function fetchVerseOfTheDay(): Promise<Passage> {
  return fetchPassage(verseOfTheDayRef());
}
