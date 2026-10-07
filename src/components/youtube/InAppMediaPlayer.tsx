import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { youtubeEmbedUrl } from "@/lib/youtubeEmbed";
import { loadYoutubePlayerApi, type YoutubePlayer } from "@/lib/youtubePlayerApi";

/** Official player: wait for onReady before controlling sound or playback. */
export function InAppMediaPlayer({
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
  onPlaybackChange,
  onEnded,
}: {
  videoId?: string;
  playlistId?: string;
  title: string;
  className?: string;
  autoplay?: boolean;
  muted?: boolean;
  playing?: boolean;
  loop?: boolean;
  controls?: boolean;
  interactive?: boolean;
  onPlaybackChange?: (playing: boolean) => void;
  onEnded?: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YoutubePlayer | null>(null);
  const ready = useRef(false);
  const latest = useRef({ muted, playing, onPlaybackChange, onEnded });
  const [notice, setNotice] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    latest.current = { muted, playing, onPlaybackChange, onEnded };
  }, [muted, playing, onPlaybackChange, onEnded]);
  const src = useMemo(
    () => youtubeEmbedUrl({ videoId, playlistId, autoplay, muted, loop, controls }),
    // Sound and playback changes must not reload a video.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [videoId, playlistId, loop, controls],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let player: YoutubePlayer | undefined;
    ready.current = false;
    setNotice(null);
    // The API owns this iframe, so destroy() never removes React-owned children.
    const frame = document.createElement("iframe");
    const url = new URL(src);
    url.searchParams.set("origin", window.location.origin);
    frame.src = url.href;
    frame.title = title;
    frame.allow =
      "autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.className = "h-full w-full border-0";
    if (!interactive) {
      frame.style.pointerEvents = "none";
      frame.tabIndex = -1;
    }
    host.replaceChildren(frame);
    let bufferingTimer: number | undefined;
    const clearBuffering = () => {
      if (bufferingTimer) window.clearTimeout(bufferingTimer);
    };
    const pauseWhenHidden = () => {
      if (document.hidden && ready.current) playerRef.current?.pauseVideo();
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    const readyTimeout = window.setTimeout(() => {
      if (!cancelled && !ready.current)
        setNotice("The player is taking too long to load. Try Retry or open the original video.");
    }, 20000);
    void loadYoutubePlayerApi()
      .then((api) => {
        if (cancelled) return;
        player = new api.Player(frame, {
          events: {
            onReady: (event) => {
              if (cancelled) return;
              ready.current = true;
              playerRef.current = event.target;
              window.clearTimeout(readyTimeout);
              setNotice(null);
              const state = latest.current;
              if (state.muted === true) event.target.mute();
              else if (state.muted === false) {
                event.target.unMute();
                event.target.setVolume(100);
              }
              if (state.playing === true) event.target.playVideo();
              else if (state.playing === false) event.target.pauseVideo();
            },
            onStateChange: (event) => {
              if (cancelled) return;
              clearBuffering();
              if ([0, 1, 2].includes(event.data))
                latest.current.onPlaybackChange?.(event.data === 1);
              if (event.data === 0) latest.current.onEnded?.();
              if (event.data === 1) setNotice(null);
              if (event.data === 3)
                bufferingTimer = window.setTimeout(() => {
                  if (!cancelled)
                    setNotice(
                      "This video is still buffering. Try Retry or open the original video.",
                    );
                }, 15000);
            },
            onError: (event) => {
              if (cancelled) return;
              clearBuffering();
              latest.current.onPlaybackChange?.(false);
              setNotice(
                [100, 101, 150].includes(event.data)
                  ? "This video is unavailable in the embedded player. Open the original video."
                  : "YouTube could not play this video. Try Retry or open the original video.",
              );
            },
            onAutoplayBlocked: () => {
              if (!cancelled)
                setNotice("Automatic playback was blocked. Use Play in the video to start.");
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled)
          setNotice(
            "Player controls could not connect. You can still use Play in the video, or Retry.",
          );
      });
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", pauseWhenHidden);
      clearBuffering();
      window.clearTimeout(readyTimeout);
      ready.current = false;
      playerRef.current = null;
      player?.destroy();
      host.replaceChildren();
    };
  }, [src, title, interactive, attempt]);

  useEffect(() => {
    const player = playerRef.current;
    if (!ready.current || !player || muted === undefined) return;
    if (muted) player.mute();
    else {
      player.unMute();
      player.setVolume(100);
    }
  }, [muted]);
  useEffect(() => {
    const player = playerRef.current;
    if (!ready.current || !player || playing === undefined) return;
    if (playing) player.playVideo();
    else player.pauseVideo();
  }, [playing]);

  return (
    <div
      className={cn(
        "relative flex w-full flex-col overflow-hidden rounded-2xl bg-black",
        className,
      )}
    >
      <div
        ref={hostRef}
        className={cn(
          playing !== undefined
            ? "min-h-[200px] w-full flex-1"
            : "aspect-video min-h-[200px] w-full",
        )}
      />
      {notice && (
        <div
          role="status"
          className="order-first shrink-0 space-y-2 bg-slate-950 p-3 text-xs leading-relaxed text-white"
        >
          <p>{notice}</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              className="min-h-9 rounded-full border border-white/30 px-3"
              aria-label="Retry YouTube playback"
            >
              Retry
            </button>
            <a
              href={
                videoId
                  ? `https://www.youtube.com/watch?v=${videoId}`
                  : `https://www.youtube.com/playlist?list=${playlistId}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center underline"
            >
              Open original video
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
export function YouTubeNotice({ className }: { className?: string }) {
  return (
    <p className={cn("text-[11px] text-muted-foreground", className)}>
      Playback is provided by YouTube. This video isn't hosted or downloadable in Nuru Faith.
    </p>
  );
}
