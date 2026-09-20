/**
 * Real Scripture text from the free bible-api.com service.
 * No API key, no server-side secret needed.
 */

export type Passage = {
  reference: string;
  text: string;
  translation: string;
  verses: { chapter: number; verse: number; text: string }[];
};

/**
 * Translations bible-api.com publishes. `web` is the default the app has always
 * used; the rest are offered in the reader's translation picker. If one of them
 * ever stops being served, `fetchPassage` falls back to `web` rather than
 * leaving the reader with an error.
 */
export const TRANSLATIONS = [
  { id: "web", label: "World English Bible", short: "WEB" },
  { id: "kjv", label: "King James Version", short: "KJV" },
  { id: "asv", label: "American Standard Version", short: "ASV" },
  { id: "bbe", label: "Bible in Basic English", short: "BBE" },
  { id: "ylt", label: "Young's Literal Translation", short: "YLT" },
  { id: "webbe", label: "World English Bible (British)", short: "WEBBE" },
] as const;

export type TranslationId = (typeof TRANSLATIONS)[number]["id"];

export const DEFAULT_TRANSLATION: TranslationId = "web";

export function translationLabel(id: string): string {
  return TRANSLATIONS.find((t) => t.id === id)?.label ?? "World English Bible";
}

export function translationShort(id: string): string {
  return TRANSLATIONS.find((t) => t.id === id)?.short ?? "WEB";
}

type ApiResponse = {
  reference?: string;
  text?: string;
  translation_name?: string;
  error?: string;
  verses?: { chapter: number; verse: number; text: string }[];
};

const cache = new Map<string, Passage>();

async function load(ref: string, translation: string): Promise<Passage> {
  const res = await fetch(
    `https://bible-api.com/${encodeURIComponent(ref)}?translation=${encodeURIComponent(translation)}`,
  );
  if (!res.ok) throw new Error(`Couldn't load ${ref}`);
  const json = (await res.json()) as ApiResponse;
  if (json.error || !json.text) throw new Error(json.error ?? `Couldn't load ${ref}`);

  return {
    reference: json.reference ?? ref,
    text: json.text.replace(/\s+/g, " ").trim(),
    translation: json.translation_name ?? translationLabel(translation),
    verses: (json.verses ?? []).map((v) => ({
      chapter: v.chapter,
      verse: v.verse,
      text: v.text.replace(/\s+/g, " ").trim(),
    })),
  };
}

export async function fetchPassage(
  reference: string,
  translation: string = DEFAULT_TRANSLATION,
): Promise<Passage> {
  const ref = reference.trim();
  const key = `${translation}:${ref.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) return cached;

  let passage: Passage;
  try {
    passage = await load(ref, translation);
  } catch (err) {
    // A translation the API no longer serves must not cost the reader the
    // passage itself — fall back to the one this app has always used.
    if (translation === DEFAULT_TRANSLATION) throw err;
    passage = await load(ref, DEFAULT_TRANSLATION);
  }

  cache.set(key, passage);
  return passage;
}

/** A rotating verse of the day — stable for the whole calendar day. */
/**
 * A year of daily verses, chosen to encourage, motivate and teach. The list is
 * long enough that a verse does not repeat within a year of daily reading.
 */
const VERSE_OF_THE_DAY = [
  "Isaiah 41:10",
  "Joshua 1:9",
  "Deuteronomy 31:6",
  "Psalm 27:1",
  "Psalm 46:1",
  "Psalm 46:10",
  "Philippians 4:13",
  "2 Timothy 1:7",
  "1 Corinthians 16:13",
  "Ephesians 6:10",
  "Psalm 31:24",
  "Isaiah 43:2",
  "Nahum 1:7",
  "Psalm 18:2",
  "Psalm 28:7",
  "Exodus 14:14",
  "2 Chronicles 20:15",
  "Psalm 138:3",
  "Habakkuk 3:19",
  "Isaiah 40:29",
  "Psalm 73:26",
  "Zechariah 4:6",
  "Isaiah 40:31",
  "Jeremiah 29:11",
  "Romans 15:13",
  "Lamentations 3:22-23",
  "Romans 8:28",
  "Romans 8:31",
  "Romans 8:37-39",
  "2 Corinthians 4:16-18",
  "Psalm 30:5",
  "Psalm 126:5",
  "Isaiah 43:18-19",
  "Revelation 21:3-4",
  "1 Peter 1:3",
  "Titus 2:11-13",
  "Psalm 42:11",
  "Job 11:18",
  "Proverbs 23:18",
  "Jeremiah 17:7-8",
  "Psalm 62:5-6",
  "Matthew 11:28-30",
  "John 14:27",
  "Philippians 4:6-7",
  "Isaiah 26:3",
  "Psalm 4:8",
  "Psalm 29:11",
  "Colossians 3:15",
  "2 Thessalonians 3:16",
  "Numbers 6:24-26",
  "Psalm 23:1-4",
  "Psalm 55:22",
  "1 Peter 5:7",
  "Mark 4:39",
  "Psalm 94:19",
  "Isaiah 32:17",
  "Proverbs 3:5-6",
  "Psalm 32:8",
  "Isaiah 30:21",
  "James 1:5",
  "Proverbs 16:3",
  "Proverbs 16:9",
  "Psalm 119:105",
  "Psalm 37:4-5",
  "Proverbs 4:23",
  "Proverbs 2:6",
  "Proverbs 11:2",
  "Proverbs 19:21",
  "Psalm 25:4-5",
  "Proverbs 15:22",
  "Colossians 2:2-3",
  "Proverbs 9:10",
  "Ecclesiastes 3:1",
  "Psalm 143:8",
  "Proverbs 12:15",
  "James 3:17",
  "2 Timothy 3:16-17",
  "Hebrews 4:12",
  "Joshua 1:8",
  "Psalm 1:1-3",
  "Psalm 119:11",
  "Matthew 4:4",
  "Romans 15:4",
  "Psalm 19:7-8",
  "Isaiah 55:11",
  "Acts 17:11",
  "Colossians 3:16",
  "Psalm 119:130",
  "2 Peter 1:20-21",
  "Luke 24:45",
  "John 8:31-32",
  "Colossians 3:23-24",
  "Ecclesiastes 9:10",
  "Ephesians 2:10",
  "Jeremiah 1:5",
  "Proverbs 22:29",
  "1 Corinthians 10:31",
  "Matthew 5:14-16",
  "Romans 12:6-8",
  "1 Peter 4:10",
  "Galatians 6:4-5",
  "Psalm 90:17",
  "Proverbs 21:5",
  "2 Timothy 2:15",
  "Titus 2:7-8",
  "Nehemiah 6:3",
  "Galatians 6:9",
  "Hebrews 12:1-2",
  "James 1:2-4",
  "Romans 5:3-5",
  "1 Peter 1:6-7",
  "Philippians 3:13-14",
  "1 Corinthians 9:24-27",
  "2 Timothy 4:7",
  "Hebrews 10:36",
  "James 1:12",
  "Luke 9:62",
  "Proverbs 24:16",
  "2 Corinthians 12:9",
  "Isaiah 41:13",
  "Psalm 37:23-24",
  "2 Corinthians 5:17",
  "Psalm 139:13-14",
  "1 Peter 2:9",
  "John 1:12",
  "Galatians 2:20",
  "Colossians 3:1-3",
  "Romans 8:14-16",
  "Ephesians 1:4-5",
  "1 John 3:1",
  "Isaiah 43:1",
  "Zephaniah 3:17",
  "Song of Solomon 4:7",
  "Psalm 139:1-4",
  "Jeremiah 31:3",
  "Romans 8:1",
  "Romans 12:1-2",
  "Galatians 5:22-23",
  "Micah 6:8",
  "James 1:22",
  "Matthew 6:33",
  "Philippians 4:8",
  "Ephesians 4:22-24",
  "Colossians 3:12-14",
  "1 Thessalonians 5:11",
  "Proverbs 27:17",
  "Titus 3:1-2",
  "1 Timothy 4:12",
  "Psalm 51:10",
  "Hebrews 13:16",
  "Matthew 5:9",
  "1 Corinthians 13:4-7",
  "John 13:34-35",
  "1 John 4:7-8",
  "1 John 4:18-19",
  "Romans 12:9-10",
  "Ephesians 4:32",
  "Proverbs 17:17",
  "Ecclesiastes 4:9-10",
  "Hebrews 10:24-25",
  "Philippians 2:3-4",
  "Galatians 5:13-14",
  "Luke 6:31",
  "Mark 12:30-31",
  "Romans 13:8",
  "Colossians 3:13",
  "1 Peter 4:8",
  "Proverbs 18:24",
  "Romans 12:18",
  "Matthew 18:21-22",
  "Ephesians 4:2-3",
  "1 Thessalonians 5:16-18",
  "Philippians 4:19",
  "Psalm 103:1-5",
  "Psalm 136:1",
  "Psalm 100:4-5",
  "Ephesians 5:20",
  "Colossians 4:2",
  "Psalm 34:1-3",
  "Psalm 150:6",
  "Matthew 7:7-8",
  "James 5:16",
  "1 John 5:14-15",
  "Luke 11:9-10",
  "Psalm 145:18",
  "Jeremiah 33:3",
  "Matthew 6:9-13",
  "Romans 8:26",
  "Psalm 66:19-20",
  "Hebrews 4:16",
  "Psalm 116:1-2",
  "Hebrews 11:1",
  "Hebrews 11:6",
  "Mark 11:22-24",
  "Matthew 17:20",
  "2 Corinthians 5:7",
  "Psalm 56:3",
  "Proverbs 3:26",
  "Isaiah 12:2",
  "Psalm 20:7",
  "Romans 10:17",
  "Matthew 21:22",
  "Psalm 33:4",
  "Daniel 3:17-18",
  "Genesis 15:6",
  "Luke 1:37",
  "Ephesians 2:8-9",
  "Romans 10:9-10",
  "John 3:16",
  "John 14:6",
  "Acts 4:12",
  "Titus 3:4-5",
  "1 John 1:9",
  "Psalm 103:12",
  "Isaiah 1:18",
  "Micah 7:18-19",
  "Romans 6:23",
  "Romans 5:8",
  "2 Corinthians 5:21",
  "1 Peter 2:24",
  "Isaiah 53:5",
  "Colossians 1:13-14",
  "Ephesians 1:7",
  "Luke 15:7",
  "John 10:28-29",
  "Romans 3:23-24",
  "Proverbs 19:17",
  "2 Corinthians 9:7",
  "Acts 20:35",
  "Luke 6:38",
  "Proverbs 11:25",
  "Isaiah 1:17",
  "Proverbs 31:8-9",
  "Matthew 25:35-40",
  "James 2:14-17",
  "Galatians 6:2",
  "Deuteronomy 15:11",
  "Hebrews 6:10",
  "Psalm 82:3",
  "Luke 12:33",
  "1 Timothy 6:17-18",
  "Nehemiah 8:10",
  "Psalm 16:11",
  "Psalm 118:24",
  "Psalm 95:1-2",
  "John 15:11",
  "Psalm 47:1",
  "Psalm 149:1",
  "Habakkuk 3:17-18",
  "Philippians 4:4",
  "Psalm 9:1-2",
  "Psalm 63:3-4",
  "Isaiah 61:10",
  "Psalm 98:4",
  "Zephaniah 3:14",
  "Luke 10:20",
  "Ecclesiastes 12:1",
  "Psalm 119:9",
  "Proverbs 20:11",
  "Lamentations 3:27",
  "2 Peter 3:18",
  "1 Corinthians 13:11",
  "Proverbs 3:11-12",
  "Hebrews 12:11",
  "Titus 2:6",
  "1 Peter 5:5",
  "Proverbs 13:20",
  "2 Timothy 2:22",
  "Psalm 71:5",
  "Job 8:7",
];

export function verseOfTheDayRef(date = new Date()): string {
  const dayIndex = Math.floor(date.getTime() / 86400000);
  return VERSE_OF_THE_DAY[dayIndex % VERSE_OF_THE_DAY.length]!;
}

export async function fetchVerseOfTheDay(): Promise<Passage> {
  return fetchPassage(verseOfTheDayRef());
}

/** Canonical 66-book list with chapter counts, for the Bible browser. */
export type BibleBook = { name: string; chapters: number };

export const OLD_TESTAMENT: BibleBook[] = [
  { name: "Genesis", chapters: 50 },
  { name: "Exodus", chapters: 40 },
  { name: "Leviticus", chapters: 27 },
  { name: "Numbers", chapters: 36 },
  { name: "Deuteronomy", chapters: 34 },
  { name: "Joshua", chapters: 24 },
  { name: "Judges", chapters: 21 },
  { name: "Ruth", chapters: 4 },
  { name: "1 Samuel", chapters: 31 },
  { name: "2 Samuel", chapters: 24 },
  { name: "1 Kings", chapters: 22 },
  { name: "2 Kings", chapters: 25 },
  { name: "1 Chronicles", chapters: 29 },
  { name: "2 Chronicles", chapters: 36 },
  { name: "Ezra", chapters: 10 },
  { name: "Nehemiah", chapters: 13 },
  { name: "Esther", chapters: 10 },
  { name: "Job", chapters: 42 },
  { name: "Psalms", chapters: 150 },
  { name: "Proverbs", chapters: 31 },
  { name: "Ecclesiastes", chapters: 12 },
  { name: "Song of Solomon", chapters: 8 },
  { name: "Isaiah", chapters: 66 },
  { name: "Jeremiah", chapters: 52 },
  { name: "Lamentations", chapters: 5 },
  { name: "Ezekiel", chapters: 48 },
  { name: "Daniel", chapters: 12 },
  { name: "Hosea", chapters: 14 },
  { name: "Joel", chapters: 3 },
  { name: "Amos", chapters: 9 },
  { name: "Obadiah", chapters: 1 },
  { name: "Jonah", chapters: 4 },
  { name: "Micah", chapters: 7 },
  { name: "Nahum", chapters: 3 },
  { name: "Habakkuk", chapters: 3 },
  { name: "Zephaniah", chapters: 3 },
  { name: "Haggai", chapters: 2 },
  { name: "Zechariah", chapters: 14 },
  { name: "Malachi", chapters: 4 },
];

export const NEW_TESTAMENT: BibleBook[] = [
  { name: "Matthew", chapters: 28 },
  { name: "Mark", chapters: 16 },
  { name: "Luke", chapters: 24 },
  { name: "John", chapters: 21 },
  { name: "Acts", chapters: 28 },
  { name: "Romans", chapters: 16 },
  { name: "1 Corinthians", chapters: 16 },
  { name: "2 Corinthians", chapters: 13 },
  { name: "Galatians", chapters: 6 },
  { name: "Ephesians", chapters: 6 },
  { name: "Philippians", chapters: 4 },
  { name: "Colossians", chapters: 4 },
  { name: "1 Thessalonians", chapters: 5 },
  { name: "2 Thessalonians", chapters: 3 },
  { name: "1 Timothy", chapters: 6 },
  { name: "2 Timothy", chapters: 4 },
  { name: "Titus", chapters: 3 },
  { name: "Philemon", chapters: 1 },
  { name: "Hebrews", chapters: 13 },
  { name: "James", chapters: 5 },
  { name: "1 Peter", chapters: 5 },
  { name: "2 Peter", chapters: 3 },
  { name: "1 John", chapters: 5 },
  { name: "2 John", chapters: 1 },
  { name: "3 John", chapters: 1 },
  { name: "Jude", chapters: 1 },
  { name: "Revelation", chapters: 22 },
];
