/** Stable reading sections, not printed page numbers. Preserve every source paragraph. */
export function splitBookText(text: string, target = 6000): string[] {
  const paragraphs = text.replace(/\r\n?/g, "\n").split(/\n{2,}/);
  const sections: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length + 2 > target) {
      sections.push(current);
      current = "";
    }
    // Long unbroken paragraphs are split only at whitespace, without dropping words.
    let remaining = paragraph;
    while (remaining.length > target) {
      let cut = remaining.lastIndexOf(" ", target);
      if (cut < target / 2) cut = target;
      if (current) {
        sections.push(current);
        current = "";
      }
      sections.push(remaining.slice(0, cut));
      remaining = remaining.slice(cut);
    }
    current += `${current ? "\n\n" : ""}${remaining}`;
  }
  if (current) sections.push(current);
  return sections;
}

export type ReaderPreferences = {
  section: number;
  size: number;
  font: "serif" | "sans";
  tone: "app" | "paper" | "night";
};
export const DEFAULT_READER: ReaderPreferences = {
  section: 0,
  size: 20,
  font: "serif",
  tone: "app",
};
export function parseReaderPreferences(raw: string | null): ReaderPreferences {
  try {
    const value = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object") return { ...DEFAULT_READER };
    return {
      section:
        Number.isInteger(value.section) && value.section >= 0 && value.section <= 20000
          ? value.section
          : 0,
      size: [18, 20, 22, 24].includes(value.size) ? value.size : 20,
      font: value.font === "sans" ? "sans" : "serif",
      tone: value.tone === "paper" || value.tone === "night" ? value.tone : "app",
    };
  } catch {
    return { ...DEFAULT_READER };
  }
}
