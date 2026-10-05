import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { youtubeEmbedUrl, YOUTUBE_EMBED_ORIGIN } from "@/lib/youtubeEmbed";

/**
 * Official YouTube IFrame embed.
 *
 * Nuru Faith never downloads, proxies or extracts YouTube media, and never
 * hides the player. Playback and YouTube's own branding/controls stay intact.
 *
 * Sound and play/pause are driven through the IFrame API over postMessage
 * rather than by rebuilding `src`, because changing the URL reloads the
 * iframe and restarts the video from zero every time you mute or pause.
 */
const ORIGIN = YOUTUBE_EMBED_ORIGIN;

export function YouTubePlayer({
  videoId,
  playlistId,
  title,
  className,
  autoplay = false,
  muted,
  playing,
  loop = false,
  controls = true,
  interactive = true,
}: {
  videoId?: string;
  playlistId?: string;
  title: string;
  className?: string;
  autoplay?: boolean;
  /** Most browsers only allow unattended autoplay when the player starts muted. */
  muted?: boolean;
  /** When provided, drives play/pause imperatively after the first load. */
  playing?: boolean;
  loop?: boolean;
  controls?: boolean;
  /** Disable direct iframe pointer input when a parent surface owns taps/swipes. */
  interactive?: boolean;
}) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const ready = useRef(false);

  const command = (func: string, args: unknown[] = []) => {
    try {
      frameRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func, args }),
        ORIGIN,
      );
    } catch {
      /* the frame may not be ready or may already be gone */
    }
  };

  // Built once per video so muting or pausing never reloads the iframe.
  const src = useMemo(
    () => youtubeEmbedUrl({ videoId, playlistId, autoplay, muted, loop, controls }),
    // muted is intentionally excluded: sound is toggled over the IFrame API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [videoId, playlistId, loop, controls],
  );

  useEffect(() => {
    ready.current = false;
  }, [src]);

  useEffect(() => {
    if (muted === undefined) return;
    command(muted ? "mute" : "unMute");
    if (!muted) command("setVolume", [100]);
  }, [muted]);

  useEffect(() => {
    if (playing === undefined) return;
    command(playing ? "playVideo" : "pauseVideo");
  }, [playing]);

  // Pause when the player leaves the screen (route change, sheet close).
  useEffect(() => {
    return () => command("pauseVideo");
  }, [videoId, playlistId]);

  return (
    <div
      className={cn(
        "relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-black",
        className,
      )}
    >
      <div className={cn(playing !== undefined ? "h-full w-full" : "aspect-video w-full")}>
        <iframe
          ref={frameRef}
          src={src}
          title={title}
          loading="lazy"
          onLoad={() => {
            ready.current = true;
            if (muted !== undefined) command(muted ? "mute" : "unMute");
            if (playing !== undefined) command(playing ? "playVideo" : "pauseVideo");
          }}
          allow="autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className={cn("h-full w-full border-0", !interactive && "pointer-events-none")}
          tabIndex={interactive ? undefined : -1}
        />
      </div>
    </div>
  );
}

/** Small, consistent "playback provided by YouTube" note. */
export function YouTubeNotice({ className }: { className?: string }) {
  return (
    <p className={cn("text-[11px] text-muted-foreground", className)}>
      Playback is provided by YouTube. This video isn't hosted or downloadable in Nuru Faith.
    </p>
  );
}
