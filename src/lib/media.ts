/**
 * Curated photographic imagery is stored in the database as a stable token
 * ("asset:cross-sunrise") so seeded content never depends on an external URL.
 * Photo credits and source pages are recorded in /photos/credits.json.
 * Uploaded media is stored as a normal http(s) URL and passes straight through.
 */
const LIBRARY: Record<string, string> = {
  "mountain-dawn": "/photos/mountain-lake.jpg",
  "walk-purpose": "/photos/forest-walk.jpg",
  "friends-dusk": "/photos/friends-outdoors.jpg",
  "church-interior": "/photos/church-sunlight.jpg",
  "cross-sunrise": "/photos/alpine-reflections.jpg",
  "worship-night": "/photos/worship-gathering.jpg",
  "bible-candle": "/photos/open-bible.jpg",
  "reading-scripture": "/photos/reading-scripture.jpg",
  "quiet-night": "/photos/alpine-reflections.jpg",
  "topic-prayer": "/photos/prayer-community.jpg",
  "topic-personal-growth": "/photos/forest-walk.jpg",
  "topic-mental-health": "/photos/alpine-reflections.jpg",
  "topic-relationships": "/photos/friends-outdoors.jpg",
  "topic-life-skills": "/photos/friends-outdoors.jpg",
  "topic-faith": "/photos/reading-scripture.jpg",
  "topic-discipleship": "/photos/reading-scripture.jpg",
  "topic-hope-healing": "/photos/mountain-lake.jpg",
  "topic-faith-purpose": "/photos/forest-walk.jpg",
  "topic-friends-relationships": "/photos/prayer-community.jpg",
  // Aliases for the 1,200-row library seed, which still references these
  // older keys — point them at real photos instead of a broken/fallback image.
  "purpose-path": "/photos/forest-walk.jpg",
  "discipleship-book": "/photos/reading-scripture.jpg",
  "life-skills-growth": "/photos/friends-outdoors.jpg",
  "relationships-bond": "/photos/prayer-community.jpg",
  "calm-anchor": "/photos/mountain-lake.jpg",
};

export const FALLBACK_IMAGE = "/photos/mountain-lake.jpg";

export function resolveMedia(value?: string | null): string {
  if (!value) return FALLBACK_IMAGE;
  if (value.startsWith("asset:")) return LIBRARY[value.slice(6)] ?? FALLBACK_IMAGE;
  return value;
}
