export function isoSeconds(value: string): number {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value);
  return match
    ? Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0)
    : 0;
}

export type CatalogVideo = {
  id?: string;
  snippet?: { channelId?: string; categoryId?: string; title?: string };
  status?: { embeddable?: boolean; privacyStatus?: string; uploadStatus?: string };
  contentDetails?: {
    duration?: string;
    regionRestriction?:
      { blocked?: string[] | undefined; allowed?: string[] | undefined } | undefined;
  };
};

export type MediaEligibility = {
  eligible: boolean;
  reasons: string[];
};

function baseVideoEligibility(video: CatalogVideo, channelId: string): MediaEligibility {
  const reasons: string[] = [];
  const region = video.contentDetails?.regionRestriction;
  const seconds = isoSeconds(video.contentDetails?.duration ?? "");

  if (!video.id || !/^[\w-]{11}$/.test(video.id)) reasons.push("invalid YouTube video ID");
  if (video.snippet?.channelId !== channelId) reasons.push("video belongs to a different YouTube channel");
  if (!video.snippet?.title) reasons.push("video title is missing");
  if (video.status?.embeddable !== true) reasons.push("YouTube reports the video is not embeddable");
  if (video.status?.privacyStatus !== "public") {
    reasons.push(`YouTube privacy status is ${video.status?.privacyStatus ?? "unknown"}, not public`);
  }
  if (video.status?.uploadStatus !== "processed") {
    reasons.push(`YouTube upload status is ${video.status?.uploadStatus ?? "unknown"}, not processed`);
  }
  if (seconds < 120) reasons.push(`duration is ${seconds}s; Nuru requires at least 120s`);
  if (region?.blocked?.includes("KE")) reasons.push("YouTube blocks this video in Kenya");
  if (region?.allowed && !region.allowed.includes("KE")) {
    reasons.push("YouTube's allowed-region list does not include Kenya");
  }

  return { eligible: reasons.length === 0, reasons };
}

export function musicVideoEligibility(video: CatalogVideo, channelId: string): MediaEligibility {
  const base = baseVideoEligibility(video, channelId);
  const reasons = [...base.reasons];
  const title = video.snippet?.title ?? "";

  const explicitlyNonMusic =
    /\b(podcast|sermon|interview|announcement|trailer|teaser|marriage|relationship|investments?|tour|vlog|behind the scenes|ministers training|bible study|episode\s*\d+)\b/i.test(
      title,
    );
  const strongMusicSignal =
    /\b(music video|official audio|official lyric(?:s)?|lyric video|live music video|audio track)\b/i.test(
      title,
    );

  if (explicitlyNonMusic) reasons.push("title matches Nuru's non-music content filter");
  if (video.snippet?.categoryId !== "10" && !strongMusicSignal) {
    reasons.push(
      `YouTube category is ${video.snippet?.categoryId ?? "unknown"}, and the title has no explicit music-video/audio signal`,
    );
  }

  return { eligible: reasons.length === 0, reasons };
}

export function eligibleMusicVideo(video: CatalogVideo, channelId: string): boolean {
  return musicVideoEligibility(video, channelId).eligible;
}

export function eligiblePodcastVideo(video: CatalogVideo, channelId: string): boolean {
  return baseVideoEligibility(video, channelId).eligible;
}

export const MUSIC_SOURCE_NAMES = [
  "Hillsong Worship",
  "Hillsong UNITED",
  "Elevation Worship",
  "Bethel Music",
  "Maverick City Music",
  "Joyous Celebration",
  "Spirit Of Praise",
  "Mercy Masika",
  "Kambua",
  "Brandon Lake",
  "Phil Wickham",
  "Gateway Worship",
  "Worship Together",
  "Sovereign Grace Music",
  "for KING + COUNTRY",
  "Lauren Daigle",
  "DonMoenTV",
];
