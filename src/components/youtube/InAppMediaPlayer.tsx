import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { youtubeEmbedUrl } from "@/lib/youtubeEmbed";
import { PLAYER_STATE, loadYoutubePlayerApi, type YoutubePlayer } from "@/lib/youtubePlayerApi";

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
  onReady,
  onEnded,
  frameClassName,
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
  /**
   * Hands the live player out so Nuru's own transport can read position and
   * seek. Null when the player goes away, so callers never hold a dead handle.
   */
  onReady?: (player: YoutubePlayer | null) => void;
  /** The track finished on its own — the queue advances on this. */
  onEnded?: () => void;
  /** Sizing for the video surface itself, when the caller owns the frame. */
  frameClassName?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YoutubePlayer | null>(null);
  const ready = useRef(false);
  const latest = useRef({ muted, playing, onPlaybackChange, onReady, onEnded });
  const [notice, setNotice] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    latest.current = { muted, playing, onPlaybackChange, onReady, onEnded };
  }, [muted, playing, onPlaybackChange, onReady, onEnded]);
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
    latest.current.onPlaybackChange?.(false);
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
              state.onReady?.(event.target);
            },
            onStateChange: (event) => {
              if (cancelled) return;
              clearBuffering();
              latest.current.onPlaybackChange?.(event.data === PLAYER_STATE.playing);
              if (event.data === PLAYER_STATE.playing) setNotice(null);
              if (event.data === PLAYER_STATE.ended) latest.current.onEnded?.();
              if (event.data === PLAYER_STATE.buffering)
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
      // Tell the caller before the handle dies, so nothing polls a dead player.
      latest.current.onReady?.(null);
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
          // YouTube requires its player to stay visible and at least 200px,
          // so Nuru skins around it rather than hiding it.
          frameClassName ??
            (playing !== undefined
              ? "min-h-[200px] w-full flex-1"
              : "aspect-video min-h-[200px] w-full"),
        )}
      />
      {notice && (
        // Sits over the video rather than above it: as a sibling it pushed
        // the picture down the screen, which looked like the player had
        // broken in two.
        <div
          role="status"
          className="absolute inset-x-0 bottom-0 z-10 space-y-2 bg-black/85 p-3 text-xs leading-relaxed text-white backdrop-blur-sm"
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
