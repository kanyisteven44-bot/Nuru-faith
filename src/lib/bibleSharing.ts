export type ShareVerse = { chapter: number; verse: number; text: string };

export function verseRanges(numbers: readonly number[]): string {
  const values = [...new Set(numbers)]
    .filter((n) => Number.isSafeInteger(n) && n > 0 && n <= 200)
    .sort((a, b) => a - b);
  const ranges: string[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = values[i]!;
    let end = start;
    while (values[i + 1] === end + 1) end = values[++i]!;
    ranges.push(start === end ? String(start) : `${start}-${end}`);
  }
  return ranges.join(",");
}

export function parseVerseRanges(input: string): number[] {
  if (!input || input.length > 600) return [];
  const values: number[] = [];
  for (const part of input.split(",")) {
    const match = part.trim().match(/^(\d{1,3})(?:-(\d{1,3}))?$/);
    if (!match) return [];
    const start = Number(match[1]),
      end = Number(match[2] ?? match[1]);
    if (start < 1 || end > 200 || start > end) return [];
    for (let n = start; n <= end; n++) values.push(n);
  }
  return [...new Set(values)].sort((a, b) => a - b);
}

export function buildBibleShare(input: {
  origin: string;
  book: string;
  chapter: number;
  translation: string;
  translationLabel: string;
  verses: readonly ShareVerse[];
  selected: readonly number[];
  attribution?: string | undefined;
}) {
  const selected = new Set(input.selected);
  const verses = input.verses
    .filter((v) => v.chapter === input.chapter && selected.has(v.verse))
    .sort((a, b) => a.verse - b.verse);
  if (!verses.length) throw new Error("Select at least one verse to share.");
  const range = verseRanges(verses.map((v) => v.verse));
  const reference = `${input.book} ${input.chapter}:${range}`;
  const url = new URL("/passage", input.origin);
  url.searchParams.set("book", input.book);
  url.searchParams.set("chapter", String(input.chapter));
  url.searchParams.set("verses", range);
  url.searchParams.set("translation", input.translation);
  return {
    title: reference,
    text: `${reference} · ${input.translationLabel}\n\n${verses.map((v) => `${v.verse} ${v.text.trim()}`).join("\n\n")}${input.attribution ? `\n\n${input.attribution}` : ""}\n\nShared with Nuru Faith`,
    url: url.href,
  };
}
