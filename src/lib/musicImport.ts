export function isoSeconds(value: string): number {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value);
  return match
    ? Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0)
    : 0;
}

export function eligibleMusicVideo(
  video: {
    id?: string;
    snippet?: { channelId?: string; categoryId?: string; title?: string };
    status?: { embeddable?: boolean; privacyStatus?: string; uploadStatus?: string };
    contentDetails?: {
      duration?: string;
      regionRestriction?:
        { blocked?: string[] | undefined; allowed?: string[] | undefined } | undefined;
    };
  },
  channelId: string,
): boolean {
  const region = video.contentDetails?.regionRestriction;
  return (
    !!video.id &&
    /^[\w-]{11}$/.test(video.id) &&
    video.snippet?.channelId === channelId &&
    video.snippet.categoryId === "10" &&
    !!video.snippet.title &&
    video.status?.embeddable === true &&
    video.status.privacyStatus === "public" &&
    video.status.uploadStatus === "processed" &&
    isoSeconds(video.contentDetails?.duration ?? "") >= 60 &&
    !region?.blocked?.includes("KE") &&
    (!region?.allowed || region.allowed.includes("KE"))
  );
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
