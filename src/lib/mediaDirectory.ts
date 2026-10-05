export const MEDIA_LANGUAGES = [
  { code: "all", label: "All languages" },
  { code: "sw", label: "Kiswahili" },
  { code: "ki", label: "Kikuyu" },
  { code: "en", label: "English" },
  { code: "other", label: "Other languages" },
] as const;

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
