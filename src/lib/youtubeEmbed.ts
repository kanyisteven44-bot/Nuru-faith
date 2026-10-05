/**
 * YouTube IFrame embed URL construction.
 *
 * Kept free of JSX so it can be unit tested directly, and deliberately
 * independent of mute and play state: those are driven over the IFrame API,
 * because changing `src` reloads the iframe and restarts playback from zero.
 */
export const YOUTUBE_EMBED_ORIGIN = "https://www.youtube-nocookie.com";

export function youtubeEmbedUrl({
  videoId,
  playlistId,
  autoplay = false,
  muted,
  loop = false,
  controls = true,
}: {
  videoId?: string | undefined;
  playlistId?: string | undefined;
  autoplay?: boolean | undefined;
  muted?: boolean | undefined;
  loop?: boolean | undefined;
  controls?: boolean | undefined;
}): string {
  const params = new URLSearchParams({
    rel: "0",
    playsinline: "1",
    modestbranding: "0",
    enablejsapi: "1",
    controls: controls ? "1" : "0",
    autoplay: autoplay ? "1" : "0",
    // Autoplay is only permitted muted; sound is enabled later via the API once
    // the person interacts.
    mute: autoplay || muted !== false ? "1" : "0",
  });
  if (playlistId && !videoId) params.set("list", playlistId);
  if (loop && videoId) {
    params.set("loop", "1");
    params.set("playlist", videoId);
  }
  return videoId
    ? `${YOUTUBE_EMBED_ORIGIN}/embed/${videoId}?${params}`
    : `${YOUTUBE_EMBED_ORIGIN}/embed/videoseries?${params}`;
}
