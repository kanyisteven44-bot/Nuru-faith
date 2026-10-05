import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronDown,
  Heart,
  ListMusic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { fetchMySavedMediaIds, toggleSavedMedia } from "@/services/media";
import { cn } from "@/lib/utils";
import { duration } from "@/lib/format";
import { resolveMedia } from "@/lib/media";
import { playableAudioUrl, videoArtwork, youtubeVideoId } from "@/lib/mediaPlayback";
import { useNowPlaying, type NowPlayingTrack } from "@/hooks/useNowPlaying";
import type { YoutubePlayer } from "@/lib/youtubePlayerApi";
import { InAppMediaPlayer } from "@/components/youtube/InAppMediaPlayer";
import { CoverImage } from "./CoverImage";

/**
 * Nuru's own player, for songs and podcast episodes alike.
 *
 * One surface for the whole app: a slim bar above the navigation while you
 * browse, which opens into a full sheet. The transport, artwork framing and
 * type are Nuru's throughout.
 *
 * Two engines sit behind the same controls:
 *  - Podcast episodes carry a real audio enclosure from the publisher's feed,
 *    so they play through a plain audio element and the artwork is the
 *    episode's own cover.
 *  - Songs come from YouTube, whose terms require its embedded player to stay
 *    visible and forbid separating audio from video, so the sheet frames the
 *    moving picture *as* the artwork rather than hiding it behind a still.
 *
 * Whichever engine is in use is mounted exactly once and never remounted
 * while a track plays, because that would restart it.
 */
export function NuruPlayer() {
  const { track, expanded } = useNowPlaying();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !track) return null;
  return createPortal(<PlayerSurface key="nuru-player" expanded={expanded} />, document.body);
}

function PlayerSurface({ expanded }: { expanded: boolean }) {
  const {
    track,
    queue,
    index,
    playing,
    shuffle,
    toggle,
    setPlaying,
    next,
    previous,
    stop,
    setExpanded,
    toggleShuffle,
    repeat,
    cycleRepeat,
    trackEnded,
    attachTransport,
  } = useNowPlaying();

  const playerRef = useRef<YoutubePlayer | null>(null);
  const ready = useRef(false);
  const [position, setPosition] = useState(0);
  const [length, setLength] = useState(0);
  const [muted, setMuted] = useState(false);
  const [scrubbing, setScrubbing] = useState<number | null>(null);
  const [showQueue, setShowQueue] = useState(false);

  // The heart saves to the same library the rest of the app reads, so it is
  // a real action rather than local decoration.
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const savedIds = useQuery({
    queryKey: ["saved-media-ids", userId],
    queryFn: () => fetchMySavedMediaIds(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  });
  const saved = !!track && !!savedIds.data?.has(track.id);
  const favourite = useMutation({
    mutationFn: () => toggleSavedMedia(userId!, track!.id, saved),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["saved-media-ids"] });
      void queryClient.invalidateQueries({ queryKey: ["saved-media"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const onReady = useCallback(
    (player: YoutubePlayer | null) => {
      playerRef.current = player;
      ready.current = !!player;
      attachTransport(
        player
          ? {
              getCurrentTime: () => player.getCurrentTime(),
              getDuration: () => player.getDuration(),
              seekTo: (seconds, allow) => player.seekTo(seconds, allow),
            }
          : null,
      );
      if (!player) {
        setPosition(0);
        setLength(0);
      }
    },
    [attachTransport],
  );

  /**
   * The embed reports "not playing" while it is still setting itself up, and
   * taking that at face value would cancel the play the queue just asked for.
   * Only report back once the player is actually ready.
   */
  const onPlaybackChange = useCallback(
    (value: boolean) => {
      if (ready.current) setPlaying(value);
    },
    [setPlaying],
  );

  // Poll position while playing. The API has no timeupdate event, so a
  // half-second tick is the standard way to drive a progress bar.
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      try {
        if (scrubbing === null) setPosition(player.getCurrentTime());
        const total = player.getDuration();
        if (Number.isFinite(total) && total > 0) setLength(total);
      } catch {
        /* the frame went away between ticks */
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [playing, scrubbing]);

  // Reset the bar the moment the track changes, so the old song's position
  // never flashes against the new title.
  useEffect(() => {
    setPosition(0);
    setLength(0);
  }, [track?.id]);

  if (!track) return null;

  const audioUrl = playableAudioUrl(track.audio_url);
  const videoId =
    !audioUrl && track.source === "youtube" ? youtubeVideoId(track.external_id) : null;
  const artwork = audioUrl
    ? resolveMedia(track.thumbnail_url)
    : videoArtwork(track.source, track.external_id, resolveMedia(track.thumbnail_url));
  const total = length || track.duration_seconds || 0;
  const shown = scrubbing ?? position;
  const progress = total > 0 ? Math.min(100, (shown / total) * 100) : 0;

  const seek = (fraction: number) => {
    const target = Math.max(0, Math.min(1, fraction)) * total;
    playerRef.current?.seekTo(target, true);
    setPosition(target);
  };

  const stage = audioUrl ? (
    <>
      <CoverImage src={artwork} alt="" className="h-full w-full" />
      <AudioEngine
        src={audioUrl}
        playing={playing}
        muted={muted}
        onPlaybackChange={onPlaybackChange}
        onReady={onReady}
        onEnded={trackEnded}
      />
    </>
  ) : videoId ? (
    <InAppMediaPlayer
      videoId={videoId}
      title={track.title}
      playing={playing}
      muted={muted}
      controls={false}
      autoplay
      className="h-full w-full rounded-none bg-black"
      frameClassName="h-full w-full"
      onPlaybackChange={onPlaybackChange}
      onReady={onReady}
      onEnded={trackEnded}
    />
  ) : (
    <CoverImage src={artwork} alt="" className="h-full w-full" />
  );

  return (
    <>
      {/* Full sheet */}
      <div
        role="dialog"
        aria-label="Now playing"
        aria-modal={expanded}
        className={cn(
          "fixed inset-0 z-[60] flex flex-col bg-background transition-transform duration-300 ease-out",
          expanded ? "translate-y-0" : "pointer-events-none translate-y-full",
        )}
      >
        <header className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="Minimise the player"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ChevronDown className="h-5 w-5" strokeWidth={2} />
          </button>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-3 uppercase">
            Now playing
          </p>
          <button
            type="button"
            onClick={() => setShowQueue((open) => !open)}
            aria-label="Show the queue"
            aria-pressed={showQueue}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              showQueue ? "bg-accent text-primary" : "text-ink-2 hover:bg-surface-2",
            )}
          >
            <ListMusic className="h-5 w-5" strokeWidth={1.9} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:mx-auto lg:w-full lg:max-w-5xl lg:flex-row lg:items-center lg:gap-10 lg:overflow-hidden">
          {/* Audio gets a round sleeve, as a record would. Video keeps a
              rectangle, because cropping a video to a circle loses the
              picture — and YouTube's player has to stay whole anyway. */}
          <div className="mx-auto w-full max-w-[420px] shrink-0 lg:mx-0 lg:max-w-[52%]">
            <div
              className={cn(
                "w-full overflow-hidden bg-black shadow-[0_24px_60px_-28px_rgb(17_24_39/45%)]",
                audioUrl
                  ? "mx-auto aspect-square max-w-[320px] rounded-full ring-8 ring-[var(--surface)] lg:max-w-[380px]"
                  : "aspect-video rounded-3xl border border-border",
              )}
            >
              <div className="relative flex h-full w-full items-center justify-center">{stage}</div>
            </div>
          </div>

          {/* On desktop the transport stays put and only the queue scrolls,
              so opening the queue never pushes the controls out of view. */}
          <div className="mt-6 flex w-full min-w-0 flex-col lg:mt-0 lg:max-h-full lg:flex-1 lg:py-6">
            <div className="shrink-0 text-center lg:text-left">
              <h2 className="font-display text-[26px] leading-tight font-semibold lg:text-[32px]">
                {track.title}
              </h2>
              <p className="mt-1.5 truncate text-[15px] text-ink-2">
                {track.creator_name ?? "Unknown artist"}
              </p>
            </div>

            {/* Shuffle · favourite · repeat, as the reference lays them out. */}
            <div className="mt-5 flex shrink-0 items-center justify-center gap-8 lg:justify-start">
              <RoundButton
                label="Shuffle the queue"
                pressed={shuffle}
                onClick={toggleShuffle}
                size="sm"
              >
                <Shuffle className="h-[18px] w-[18px]" strokeWidth={2} />
              </RoundButton>
              <RoundButton
                label={saved ? "Remove from your library" : "Save to your library"}
                pressed={saved}
                disabled={!userId || favourite.isPending}
                onClick={() => favourite.mutate()}
                size="sm"
              >
                <Heart
                  className={cn("h-[18px] w-[18px]", saved && "fill-current")}
                  strokeWidth={2}
                />
              </RoundButton>
              <RoundButton
                label={
                  repeat === "off"
                    ? "Repeat off"
                    : repeat === "all"
                      ? "Repeating the queue"
                      : "Repeating this track"
                }
                pressed={repeat !== "off"}
                onClick={cycleRepeat}
                size="sm"
              >
                {repeat === "one" ? (
                  <Repeat1 className="h-[18px] w-[18px]" strokeWidth={2} />
                ) : (
                  <Repeat className="h-[18px] w-[18px]" strokeWidth={2} />
                )}
              </RoundButton>
            </div>

            <Scrubber
              progress={progress}
              shown={shown}
              total={total}
              onScrub={setScrubbing}
              onCommit={(fraction) => {
                seek(fraction);
                setScrubbing(null);
              }}
            />

            {/* Previous · play · next, with the big soft key in the middle. */}
            <div className="mt-6 flex shrink-0 items-center justify-center gap-7 lg:justify-start">
              <RoundButton label="Previous track" onClick={previous}>
                <SkipBack className="h-6 w-6 fill-current" strokeWidth={1.5} />
              </RoundButton>
              <button
                type="button"
                onClick={toggle}
                aria-label={playing ? "Pause" : "Play"}
                className="nuru-soft-control nuru-soft-primary flex h-[72px] w-[72px] items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {playing ? (
                  <Pause className="h-8 w-8 fill-current" strokeWidth={0} />
                ) : (
                  <Play className="ml-1 h-8 w-8 fill-current" strokeWidth={0} />
                )}
              </button>
              <RoundButton
                label="Next track"
                onClick={next}
                disabled={index + 1 >= queue.length && repeat !== "all"}
              >
                <SkipForward className="h-6 w-6 fill-current" strokeWidth={1.5} />
              </RoundButton>
            </div>

            <div className="mt-4 flex shrink-0 justify-center lg:justify-start">
              <button
                type="button"
                onClick={() => setMuted((on) => !on)}
                aria-label={muted ? "Unmute" : "Mute"}
                aria-pressed={muted}
                className={cn(
                  "flex h-11 items-center gap-2 rounded-full px-4 text-[12.5px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  muted ? "bg-accent text-primary" : "text-ink-3 hover:bg-surface-2",
                )}
              >
                {muted ? (
                  <VolumeX className="h-[18px] w-[18px]" strokeWidth={2} />
                ) : (
                  <Volume2 className="h-[18px] w-[18px]" strokeWidth={2} />
                )}
                {muted ? "Muted" : "Sound on"}
              </button>
            </div>

            <p className="mt-5 shrink-0 text-center text-[11.5px] leading-snug text-ink-3 lg:text-left">
              {audioUrl
                ? "Streamed from the publisher. Nothing is hosted or downloadable in Nuru Faith."
                : "Played through YouTube's official player. Nothing is hosted or downloadable in Nuru Faith."}
            </p>

            {showQueue && <Queue />}
          </div>
        </div>
      </div>

      {/* Mini bar — the same song, docked while you browse. */}
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-label={`Now playing: ${track.title}. Open the player.`}
        className={cn(
          "fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-50 mx-3 flex items-center gap-3 rounded-2xl border border-border bg-surface/95 p-2 text-left shadow-[0_12px_32px_-16px_rgb(17_24_39/40%)] backdrop-blur-xl transition-all duration-300",
          "lg:bottom-5 lg:left-auto lg:mx-0 lg:mr-5 lg:w-[360px]",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          expanded ? "pointer-events-none translate-y-4 opacity-0" : "translate-y-0 opacity-100",
        )}
      >
        <CoverImage src={artwork} alt="" className="h-11 w-11 shrink-0 rounded-xl" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold">{track.title}</span>
          <span className="block truncate text-[12px] text-ink-3">
            {track.creator_name ?? "Unknown artist"}
          </span>
        </span>
        <span
          role="button"
          tabIndex={0}
          aria-label={playing ? "Pause" : "Play"}
          onClick={(event) => {
            event.stopPropagation();
            toggle();
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            event.stopPropagation();
            toggle();
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {playing ? (
            <Pause className="h-4 w-4 fill-current" strokeWidth={0} />
          ) : (
            <Play className="ml-0.5 h-4 w-4 fill-current" strokeWidth={0} />
          )}
        </span>
        <span
          role="button"
          tabIndex={0}
          aria-label="Close the player"
          onClick={(event) => {
            event.stopPropagation();
            stop();
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            event.stopPropagation();
            stop();
          }}
          className="flex h-10 w-9 shrink-0 items-center justify-center rounded-full text-ink-3 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </span>
        {/* A hairline of progress, so the bar still tells you where you are. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-2 bottom-1 h-0.5 overflow-hidden rounded-full bg-surface-2"
        >
          <span
            className="block h-full rounded-full bg-primary"
            style={{ width: `${progress}%` }}
          />
        </span>
      </button>
    </>
  );
}

/**
 * The soft round key the reference player is built from. Pressed state uses
 * the inset variant, so a toggle reads as pushed in rather than merely tinted.
 */
function RoundButton({
  children,
  label,
  onClick,
  pressed,
  disabled,
  size = "md",
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  pressed?: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      {...(pressed === undefined ? {} : { "aria-pressed": pressed })}
      className={cn(
        "nuru-soft-control flex shrink-0 items-center justify-center rounded-full transition-transform active:scale-95",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        "disabled:opacity-35 disabled:active:scale-100",
        size === "sm" ? "h-11 w-11" : "h-14 w-14",
        pressed ? "nuru-soft-inset text-primary" : "text-ink-2",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Plays a publisher's audio enclosure directly, and reports position the same
 * way the YouTube engine does so one set of controls drives either.
 *
 * The element is deliberately not `controls` — Nuru draws the transport — but
 * it is a real audio element, so the OS media keys and lock screen work.
 */
function AudioEngine({
  src,
  playing,
  muted,
  onPlaybackChange,
  onReady,
  onEnded,
}: {
  src: string;
  playing: boolean;
  muted: boolean;
  onPlaybackChange: (value: boolean) => void;
  onReady: (transport: YoutubePlayer | null) => void;
  onEnded: () => void;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const [failed, setFailed] = useState(false);

  // Hand a transport out in the same shape the YouTube player uses.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    onReady({
      playVideo: () => void element.play().catch(() => undefined),
      pauseVideo: () => element.pause(),
      mute: () => {
        element.muted = true;
      },
      unMute: () => {
        element.muted = false;
      },
      setVolume: (value: number) => {
        element.volume = Math.max(0, Math.min(100, value)) / 100;
      },
      destroy: () => element.pause(),
      getCurrentTime: () => element.currentTime,
      getDuration: () => (Number.isFinite(element.duration) ? element.duration : 0),
      seekTo: (seconds: number) => {
        element.currentTime = seconds;
      },
    });
    return () => onReady(null);
  }, [onReady, src]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (playing) void element.play().catch(() => onPlaybackChange(false));
    else element.pause();
  }, [playing, onPlaybackChange]);

  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);

  useEffect(() => setFailed(false), [src]);

  return (
    <>
      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onPlay={() => onPlaybackChange(true)}
        onPause={() => onPlaybackChange(false)}
        onEnded={onEnded}
        onError={() => {
          setFailed(true);
          onPlaybackChange(false);
        }}
      />
      {failed && (
        <div
          role="alert"
          className="absolute inset-x-0 bottom-0 bg-black/80 p-3 text-center text-[12px] leading-snug text-white"
        >
          This episode could not be played. It may have moved on the publisher&apos;s server.
        </div>
      )}
    </>
  );
}

function Scrubber({
  progress,
  shown,
  total,
  onScrub,
  onCommit,
}: {
  progress: number;
  shown: number;
  total: number;
  onScrub: (seconds: number | null) => void;
  onCommit: (fraction: number) => void;
}) {
  return (
    <div className="mt-6 shrink-0">
      {/* The native thumb is hidden and the knob drawn below it, so the
          control looks the same in every browser and both themes. */}
      <div className="group relative py-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-sm ring-2 ring-[var(--background)] transition-[left] duration-200"
          style={{ left: `${progress}%` }}
        />
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(progress * 10)}
          disabled={total <= 0}
          aria-label="Seek within the song"
          aria-valuetext={`${duration(Math.round(shown))} of ${duration(Math.round(total))}`}
          onChange={(event) => onScrub((Number(event.target.value) / 1000) * total)}
          onPointerUp={(event) => onCommit(Number(event.currentTarget.value) / 1000)}
          onKeyUp={(event) => onCommit(Number(event.currentTarget.value) / 1000)}
          className="nuru-range absolute inset-0 w-full cursor-pointer appearance-none bg-transparent focus-visible:rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
      </div>
      {/* Elapsed on the left, time left on the right, as the reference shows. */}
      <div className="mt-1.5 flex justify-between text-[11.5px] tabular-nums text-ink-3">
        <span>{duration(Math.round(shown))}</span>
        <span>{total > 0 ? `-${duration(Math.max(0, Math.round(total - shown)))}` : "--:--"}</span>
      </div>
    </div>
  );
}

function Queue() {
  const { queue, index, play } = useNowPlaying();
  if (queue.length < 2) return null;
  return (
    <section className="mt-6 flex min-h-0 flex-col border-t border-border pt-4">
      <h3 className="shrink-0 px-1 pb-2 text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
        Up next
      </h3>
      <ul className="min-h-0 space-y-0.5 lg:overflow-y-auto">
        {queue.map((item: NowPlayingTrack, position: number) => (
          <li key={`${item.id}-${position}`}>
            <button
              type="button"
              onClick={() => play(queue, position)}
              aria-current={position === index ? "true" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                position === index ? "bg-accent" : "hover:bg-surface-2",
              )}
            >
              <span
                className={cn(
                  "w-5 shrink-0 text-center text-[12px] tabular-nums",
                  position === index ? "text-primary" : "text-ink-3",
                )}
              >
                {position + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block truncate text-[14px] font-semibold",
                    position === index && "text-primary",
                  )}
                >
                  {item.title}
                </span>
                <span className="block truncate text-[12px] text-ink-3">
                  {item.creator_name ?? "Unknown artist"}
                </span>
              </span>
              {(item.duration_seconds ?? 0) > 0 && (
                <span className="shrink-0 text-[11.5px] tabular-nums text-ink-3">
                  {duration(item.duration_seconds)}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
