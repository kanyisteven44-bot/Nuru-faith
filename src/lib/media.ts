/** Real Pexels photos for seeded content and API fallback. */
export function pexelsImage(id: number, width = 1200): string {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
}

/**
 * Seeded imagery is stored in the database as a stable token
 * ("asset:cross-sunrise") so older records keep resolving to curated Pexels photographs.
 * User uploads and content-specific URLs pass straight through.
 */
const LIBRARY: Record<string, string> = {
  "mountain-dawn": pexelsImage(9407893),
  "walk-purpose": pexelsImage(1105392),
  "friends-dusk": pexelsImage(12825610),
  "church-interior": pexelsImage(33494797),
  "cross-sunrise": pexelsImage(253892),
  "worship-night": pexelsImage(34611897),
  "bible-candle": pexelsImage(11696719),
  "quiet-night": pexelsImage(10615070),
  "topic-prayer": pexelsImage(2258251),
  "topic-personal-growth": pexelsImage(5206052),
  "topic-mental-health": pexelsImage(5645328),
  "topic-relationships": pexelsImage(1429881),
  "topic-life-skills": pexelsImage(31951247),
  "topic-faith": pexelsImage(34612053),
  "topic-discipleship": pexelsImage(6860381),
  "topic-hope-healing": pexelsImage(34533557),
  "topic-faith-purpose": pexelsImage(9407893),
  "topic-friends-relationships": pexelsImage(37353809),
  // Aliases for the 1,200-row library seed, which still references these
  // older keys — point them at real photos instead of a broken/fallback image.
  "purpose-path": pexelsImage(9407893),
  "discipleship-book": pexelsImage(6860381),
  "life-skills-growth": pexelsImage(31951247),
  "relationships-bond": pexelsImage(37353809),
  "calm-anchor": pexelsImage(34533557),
};

export const FALLBACK_IMAGE = pexelsImage(9407893);

export function resolveMedia(value?: string | null): string {
  if (!value) return FALLBACK_IMAGE;
  if (value.startsWith("asset:")) return LIBRARY[value.slice(6)] ?? FALLBACK_IMAGE;
  return value;
}
