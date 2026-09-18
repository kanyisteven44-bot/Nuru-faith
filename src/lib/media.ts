import mountainDawn from "@/assets/mountain-dawn.jpg";
import walkPurpose from "@/assets/walk-purpose.jpg";
import friendsDusk from "@/assets/friends-dusk.jpg";
import churchInterior from "@/assets/church-interior.jpg";
import crossSunrise from "@/assets/cross-sunrise.jpg";
import worshipNight from "@/assets/worship-night.jpg";
import bibleCandle from "@/assets/bible-candle.jpg";
import quietNight from "@/assets/quiet-night.jpg";
import topicPrayer from "@/assets/topic-prayer.jpg";
import topicPersonalGrowth from "@/assets/topic-personal-growth.jpg";
import topicMentalHealth from "@/assets/topic-mental-health.jpg";
import topicRelationships from "@/assets/topic-relationships.jpg";
import topicLifeSkills from "@/assets/topic-life-skills.jpg";
import topicFaith from "@/assets/topic-faith.jpg";
import topicDiscipleship from "@/assets/topic-discipleship.jpg";
import topicHopeHealing from "@/assets/topic-hope-healing.jpg";
import topicFaithPurpose from "@/assets/topic-faith-purpose.jpg";
import topicFriendsRelationships from "@/assets/topic-friends-relationships.jpg";

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
  "topic-prayer": topicPrayer,
  "topic-personal-growth": topicPersonalGrowth,
  "topic-mental-health": topicMentalHealth,
  "topic-relationships": topicRelationships,
  "topic-life-skills": topicLifeSkills,
  "topic-faith": topicFaith,
  "topic-discipleship": topicDiscipleship,
  "topic-hope-healing": topicHopeHealing,
  "topic-faith-purpose": topicFaithPurpose,
  "topic-friends-relationships": topicFriendsRelationships,
};

export const FALLBACK_IMAGE = mountainDawn;

export function resolveMedia(value?: string | null): string {
  if (!value) return FALLBACK_IMAGE;
  if (value.startsWith("asset:")) return LIBRARY[value.slice(6)] ?? FALLBACK_IMAGE;
  return value;
}
