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

function eligibleVideo(video: CatalogVideo, channelId: string): boolean {
  const region = video.contentDetails?.regionRestriction;
  return (
    !!video.id &&
    /^[\w-]{11}$/.test(video.id) &&
    video.snippet?.channelId === channelId &&
    !!video.snippet.title &&
    video.status?.embeddable === true &&
    video.status.privacyStatus === "public" &&
    video.status.uploadStatus === "processed" &&
    isoSeconds(video.contentDetails?.duration ?? "") >= 120 &&
    !region?.blocked?.includes("KE") &&
    (!region?.allowed || region.allowed.includes("KE"))
  );
}
/**
 * A song has an upper bound as well as a lower one.
 *
 * Without this, a channel's livestreamed services, full concerts and
 * hours-long loop compilations all land in the song catalogue: the first
 * import put 1,576 items over fifteen minutes into it, the longest of them
 * twelve hours. Twenty minutes leaves room for an extended live worship set
 * while keeping services and compilations out.
 */
export const MAX_SONG_SECONDS = 20 * 60;

export function eligibleMusicVideo(video: CatalogVideo, channelId: string): boolean {
  const seconds = isoSeconds(video.contentDetails?.duration ?? "");
  return (
    eligibleVideo(video, channelId) &&
    seconds <= MAX_SONG_SECONDS &&
    video.snippet?.categoryId === "10" &&
    !/\b(podcast|sermon|interview|announcement|trailer|teaser|marriage|relationship|investments?|tour|vlog|episode|live\s?stream|service|conference|night\s?of\s?worship|full\s?album|compilation|mix|playlist|hours?)\b/i.test(
      video.snippet.title ?? "",
    )
  );
}

export function eligiblePodcastVideo(video: CatalogVideo, channelId: string): boolean {
  return eligibleVideo(video, channelId);
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
