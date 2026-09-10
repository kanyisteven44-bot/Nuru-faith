export const DISCOVERY_KINDS = [
  "reels",
  "series",
  "bible",
  "churches",
  "groups",
  "mentors",
  "courses",
  "events",
  "podcasts",
  "music",
  "videos",
] as const;
export type DiscoveryKind = (typeof DISCOVERY_KINDS)[number];
export const DISCOVERY_LABELS: Record<DiscoveryKind, string> = {
  reels: "Christian Reels",
  series: "Scripture Series",
  bible: "Bible topics",
  churches: "Churches",
  groups: "Groups",
  mentors: "Mentors",
  courses: "Courses",
  events: "Events",
  podcasts: "Podcasts",
  music: "Worship & music",
  videos: "Approved videos",
};
export const BIBLE_TOPICS = [
  { id: "anxiety", title: "Anxiety & peace", reference: "Philippians 4:6-7" },
  { id: "relationships", title: "Relationships & love", reference: "1 Corinthians 13:4-7" },
  { id: "motivation", title: "Purpose & motivation", reference: "Colossians 3:23-24" },
  { id: "prayer", title: "Prayer", reference: "Matthew 6:9-13" },
  { id: "faith", title: "Faith", reference: "Hebrews 11:1-3" },
  { id: "forgiveness", title: "Forgiveness", reference: "Ephesians 4:31-32" },
  { id: "hope", title: "Hope", reference: "Romans 15:13" },
  { id: "worship", title: "Worship", reference: "Psalm 100:1-5" },
];
export const SUGGESTED_SEARCHES = [
  "Anxiety",
  "Relationships",
  "Purpose",
  "Prayer",
  "Worship",
  "Forgiveness",
];
export function normalizeSearch(value: string): string {
  return Array.from(value.normalize("NFKC"))
    .map((character) => {
      const code = character.codePointAt(0)!;
      return code < 32 || code === 127 ? " " : character;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}
export function faithSearch(value: string): string {
  const query = normalizeSearch(value);
  if (!query) return "Christian Bible faith";
  const intents: Record<string, string> = {
    anxiety: "Christian anxiety Bible faith peace",
    relationships: "Christian relationships biblical relationships Christian dating",
    motivation: "Christian motivation spiritual growth purpose in Christ",
  };
  return intents[query.toLowerCase()] ?? `Christian ${query} Bible faith`;
}
// Only fixed column names are passed by our services. Remove PostgREST syntax and LIKE wildcards.
export function searchFilter(columns: readonly string[], query: string): string {
  const literal = normalizeSearch(query)
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return columns.map((column) => `${column}.ilike.%${literal || "\uFFFF"}%`).join(",");
}
export function trustedChannel(level: string | null | undefined): boolean {
  return level === "official" || level === "verified" || level === "trusted";
}
export function trustRank(level: string): number {
  return level === "official" ? 0 : level === "verified" ? 1 : level === "trusted" ? 2 : 9;
}
