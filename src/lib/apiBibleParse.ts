/** Pure parsing helpers for API.Bible responses, kept dependency-free so they're unit-testable. */

export type ApiBibleVerse = { chapter: number; verse: number; text: string };

export function parseReference(reference: string): { book: string; chapter: number } {
  const match = reference.trim().match(/^(.+?)\s+(\d+)$/);
  if (!match?.[1] || !match[2]) throw new Error(`Unrecognized reference: ${reference}`);
  return { book: match[1].trim(), chapter: Number(match[2]) };
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** API.Bible marks each verse's start with <span class="v" data-number="N">N</span>. */
export function parseVerses(html: string, chapter: number): ApiBibleVerse[] {
  const markerRe = /<span[^>]*class="v"[^>]*data-number="(\d+)"[^>]*>[^<]*<\/span>/g;
  const markers: { verse: number; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = markerRe.exec(html))) {
    if (m[1]) markers.push({ verse: Number(m[1]), start: m.index, end: m.index + m[0].length });
  }
  const verses: ApiBibleVerse[] = [];
  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    if (!marker) continue;
    const nextStart = markers[i + 1]?.start ?? html.length;
    const raw = html.slice(marker.end, nextStart);
    const text = decodeEntities(raw.replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    if (text) verses.push({ chapter, verse: marker.verse, text });
  }
  return verses;
}
