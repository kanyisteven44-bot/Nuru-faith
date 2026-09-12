import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Official YouTube IFrame embed.
 *
 * Nuru Faith never downloads, proxies or extracts YouTube media, and never
 * hides the player. Playback and YouTube's own branding/controls stay intact.
 */
export function YouTubePlayer({
  videoId,
  playlistId,
  title,
  className,
  autoplay = false,
  muted,
}: {
  videoId?: string;
  playlistId?: string;
  title: string;
  className?: string;
  autoplay?: boolean;
  /** Most browsers only allow unattended autoplay when the player starts muted. */
  muted?: boolean;
}) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  // Pause playback when the player leaves the screen (route change, sheet close).
  useEffect(() => {
    const frame = frameRef.current;
    return () => {
      try {
        frame?.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
          "*",
        );
      } catch {
        /* the frame may already be gone */
      }
    };
  }, [videoId, playlistId]);

  const params = new URLSearchParams({
    rel: "0",
    playsinline: "1",
    modestbranding: "0",
    enablejsapi: "1",
    autoplay: autoplay ? "1" : "0",
  });
  if (playlistId && !videoId) params.set("list", playlistId);
  if (muted !== undefined) params.set("mute", muted ? "1" : "0");

  const src = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?${params}`
    : `https://www.youtube-nocookie.com/embed/videoseries?${params}`;

  return (
    <div
      className={cn(
        "relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-black",
        className,
      )}
    >
      <div className="aspect-video w-full">
        <iframe
          ref={frameRef}
          src={src}
          title={title}
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="h-full w-full border-0"
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
