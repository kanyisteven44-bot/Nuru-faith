import mountainDawn from "@/assets/mountain-dawn.jpg";
import walkPurpose from "@/assets/walk-purpose.jpg";
import friendsDusk from "@/assets/friends-dusk.jpg";
import churchInterior from "@/assets/church-interior.jpg";
import crossSunrise from "@/assets/cross-sunrise.jpg";
import worshipNight from "@/assets/worship-night.jpg";
import bibleCandle from "@/assets/bible-candle.jpg";
import quietNight from "@/assets/quiet-night.jpg";
import topicBibleStudy from "@/assets/topic-bible-study.jpg";
import topicBoysCorner from "@/assets/topic-boys-corner.jpg";
import topicCareerPurpose from "@/assets/topic-career-purpose.jpg";
import topicChurchLife from "@/assets/topic-church-life.jpg";
import topicCreationEnvironment from "@/assets/topic-creation-environment.jpg";
import topicCreativityArts from "@/assets/topic-creativity-arts.jpg";
import topicDailyInspiration from "@/assets/topic-daily-inspiration.jpg";
import topicDiscipleship from "@/assets/topic-discipleship.jpg";
import topicEncouragement from "@/assets/topic-encouragement.jpg";
import topicFaith from "@/assets/topic-faith.jpg";
import topicFaithPurpose from "@/assets/topic-faith-purpose.jpg";
import topicFaithQuestions from "@/assets/topic-faith-questions.jpg";
import topicFamilyLife from "@/assets/topic-family-life.jpg";
import topicFriendsRelationships from "@/assets/topic-friends-relationships.jpg";
import topicGirlsCorner from "@/assets/topic-girls-corner.jpg";
import topicGlobalIssues from "@/assets/topic-global-issues.jpg";
import topicHopeHealing from "@/assets/topic-hope-healing.jpg";
import topicKenyaBeyond from "@/assets/topic-kenya-beyond.jpg";
import topicLifeSkills from "@/assets/topic-life-skills.jpg";
import topicLovePurity from "@/assets/topic-love-purity.jpg";
import topicMentalHealth from "@/assets/topic-mental-health.jpg";
import topicOvercomingChallenges from "@/assets/topic-overcoming-challenges.jpg";
import topicPersonalGrowth from "@/assets/topic-personal-growth.jpg";
import topicPrayer from "@/assets/topic-prayer.jpg";
import topicProductivity from "@/assets/topic-productivity.jpg";
import topicRelationships from "@/assets/topic-relationships.jpg";
import topicSchoolStudies from "@/assets/topic-school-studies.jpg";
import topicSermons from "@/assets/topic-sermons.jpg";
import topicServiceImpact from "@/assets/topic-service-impact.jpg";
import topicTestimonies from "@/assets/topic-testimonies.jpg";
import topicUamshoFestival from "@/assets/topic-uamsho-festival.jpg";
import topicWorshipMusic from "@/assets/topic-worship-music.jpg";
import topicYouthLife from "@/assets/topic-youth-life.jpg";

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
  "topic-bible-study": topicBibleStudy,
  "topic-boys-corner": topicBoysCorner,
  "topic-career-purpose": topicCareerPurpose,
  "topic-church-life": topicChurchLife,
  "topic-creation-environment": topicCreationEnvironment,
  "topic-creativity-arts": topicCreativityArts,
  "topic-daily-inspiration": topicDailyInspiration,
  "topic-discipleship": topicDiscipleship,
  "topic-encouragement": topicEncouragement,
  "topic-faith": topicFaith,
  "topic-faith-purpose": topicFaithPurpose,
  "topic-faith-questions": topicFaithQuestions,
  "topic-family-life": topicFamilyLife,
  "topic-friends-relationships": topicFriendsRelationships,
  "topic-girls-corner": topicGirlsCorner,
  "topic-global-issues": topicGlobalIssues,
  "topic-hope-healing": topicHopeHealing,
  "topic-kenya-beyond": topicKenyaBeyond,
  "topic-life-skills": topicLifeSkills,
  "topic-love-purity": topicLovePurity,
  "topic-mental-health": topicMentalHealth,
  "topic-overcoming-challenges": topicOvercomingChallenges,
  "topic-personal-growth": topicPersonalGrowth,
  "topic-prayer": topicPrayer,
  "topic-productivity": topicProductivity,
  "topic-relationships": topicRelationships,
  "topic-school-studies": topicSchoolStudies,
  "topic-sermons": topicSermons,
  "topic-service-impact": topicServiceImpact,
  "topic-testimonies": topicTestimonies,
  "topic-uamsho-festival": topicUamshoFestival,
  "topic-worship-music": topicWorshipMusic,
  "topic-youth-life": topicYouthLife,
  // Aliases for the 1,200-row library seed, which still references these
  // older keys — point them at real photos instead of a broken/fallback image.
  "purpose-path": topicFaithPurpose,
  "discipleship-book": topicDiscipleship,
  "life-skills-growth": topicLifeSkills,
  "relationships-bond": topicFriendsRelationships,
  "calm-anchor": topicHopeHealing,
};

export const FALLBACK_IMAGE = mountainDawn;

export function resolveMedia(value?: string | null): string {
  if (!value) return FALLBACK_IMAGE;
  if (value.startsWith("asset:")) return LIBRARY[value.slice(6)] ?? FALLBACK_IMAGE;
  return value;
}
