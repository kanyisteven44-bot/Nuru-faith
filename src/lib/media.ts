import mountainDawn from "@/assets/mountain-dawn.jpg";
import walkPurpose from "@/assets/walk-purpose.jpg";
import friendsDusk from "@/assets/friends-dusk.jpg";
import churchInterior from "@/assets/church-interior.jpg";
import crossSunrise from "@/assets/cross-sunrise.jpg";
import worshipNight from "@/assets/worship-night.jpg";
import bibleCandle from "@/assets/bible-candle.jpg";
import quietNight from "@/assets/quiet-night.jpg";
import purposePath from "@/assets/purpose-path.svg";
import discipleshipBook from "@/assets/discipleship-book.svg";
import lifeSkillsGrowth from "@/assets/life-skills-growth.svg";
import relationshipsBond from "@/assets/relationships-bond.svg";
import calmAnchor from "@/assets/calm-anchor.svg";

/**
 * Demo/library imagery is stored in the database as a stable token
 * ("asset:cross-sunrise") so seeded content never depends on an external URL.
 * Uploaded media is stored as a normal http(s) URL and passes straight through.
 */
const LIBRARY: Record<string, string> = {
  "mountain-dawn": mountainDawn,
  "walk-purpose": walkPurpose,
  "friends-dusk": friendsDusk,
  "church-interior": churchInterior,
  "cross-sunrise": crossSunrise,
  "worship-night": worshipNight,
  "bible-candle": bibleCandle,
  "quiet-night": quietNight,
  "purpose-path": purposePath,
  "discipleship-book": discipleshipBook,
  "life-skills-growth": lifeSkillsGrowth,
  "relationships-bond": relationshipsBond,
  "calm-anchor": calmAnchor,
};

export const FALLBACK_IMAGE = mountainDawn;

export function resolveMedia(value?: string | null): string {
  if (!value) return FALLBACK_IMAGE;
  if (value.startsWith("asset:")) return LIBRARY[value.slice(6)] ?? FALLBACK_IMAGE;
  return value;
}
