import { reelPlaybackPolicy, isReelTap } from "@/lib/reelPlaybackPolicy";
import { useCallback, useEffect, useRef, useState } from "react";
import { Clapperboard, ExternalLink, Heart, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { CoverImage } from "@/components/nuru/CoverImage";
import { videoArtwork } from "@/lib/mediaPlayback";
import { cn } from "@/lib/utils";
import { resolveMedia } from "@/lib/media";
import { compactNumber } from "@/lib/format";
import type { Reel } from "@/services/reels";
import { SOURCE_LABEL, type ImportedSource } from "@/lib/reelImport";
import { InAppMediaPlayer } from "@/components/youtube/InAppMediaPlayer";
import { ReelInteractiveActions } from "./ReelInteractiveActions";
import { ReelCaption } from "./ReelCaption";
import { ReelFaithActions } from "./ReelFaithActions";
import { ReelProgress } from "./ReelProgress";

export type ReelPaneProps = {
  reel: Reel;
  index: number;
  active: boolean;
  /** Active, or directly next to it — only these load video data and full controls. */
  near: boolean;
  muted: boolean;
  autoplayAllowed: boolean;
  liked: boolean;
  saved: boolean;
  isFollowing: boolean;
  isMine: boolean;
  commentsOpen: boolean;
  onActive: (index: number) => void;
  onView: (reel: Reel) => void;
  onToggleMuted: () => void;
  onLike: () => void;
  onDoubleLike: () => void;
  onSave: () => void;
  onFollow: () => void;
  onComments: () => void;
  onShare: () => void;
  onMore: () => void;
  onProfile: () => void;
  onRead: () => void;
  onPray: () => void;
  onAskAi: () => void;
  onDiscuss: () => void;
};

const OFFSCREEN_STYLE = {
  contentVisibility: "auto" as const,
  containIntrinsicSize: "100dvh",
};

export function ReelPane(props: ReelPaneProps) {
  const { reel, index, active, near, muted, autoplayAllowed, commentsOpen, onActive, onView } =
    props;
  const paneRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const tapTimer = useRef<number | null>(null);
  const viewLogged = useRef(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [playbackError, setPlaybackError] = useState("");

  const [playerAttempt, setPlayerAttempt] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showIcon, setShowIcon] = useState(false);
  const [burst, setBurst] = useState<{ x: number; y: number; key: number } | null>(null);
  const [manualStart, setManualStart] = useState(false);
  const [externalCommentsOpen, setExternalCommentsOpen] = useState(false);

  const commentsVisible = commentsOpen || externalCommentsOpen;
  const hasVideo = !!reel.video_url;
  const isYouTubeEmbed = reel.source_type === "youtube" && !!reel.external_id;
  const isLinkOutOnly =
    (reel.source_type === "tiktok" || reel.source_type === "instagram") && !!reel.external_url;
  const { load: shouldLoad, play: shouldPlay } = reelPlaybackPolicy({
    near,
    active,
    paused,
    commentsVisible,
    pageVisible,
    autoplayAllowed,
    manualStart,
  });

  useEffect(() => {
    const update = () => setPageVisible(!document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  function openOriginal() {
    if (reel.external_url) window.open(reel.external_url, "_blank", "noopener,noreferrer");
  }

  /* --- active detection: only the mostly-visible reel plays --- */
  useEffect(() => {
    const node = paneRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting && e.intersectionRatio >= 0.6) onActive(index);
      },
      { threshold: [0.6] },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [index, onActive]);

  /* --- playback: exactly one native video plays at a time --- */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    if (shouldPlay) {
      void v
        .play()
        .catch(() => setPlaybackError("Playback could not start. Tap Retry to try again."));
    } else {
      v.pause();
      if (!active) {
        v.currentTime = 0;
        setPaused(false);
      }
    }
  }, [active, shouldPlay, muted, shouldLoad, playerAttempt]);

  /* --- a view only counts after ~2 seconds of being active --- */
  useEffect(() => {
    if (!active || !playing || !shouldPlay || viewLogged.current) return;
    const t = window.setTimeout(() => {
      viewLogged.current = true;
      onView(reel);
    }, 2000);
    return () => window.clearTimeout(t);
  }, [active, playing, shouldPlay, reel, onView]);

  useEffect(() => () => (tapTimer.current ? window.clearTimeout(tapTimer.current) : undefined), []);

  const togglePlay = useCallback(() => {
    if (!hasVideo && !isYouTubeEmbed) return;
    setManualStart(true);
    setPaused((p) => (!manualStart && !autoplayAllowed ? false : !p));
    setShowIcon(true);
    window.setTimeout(() => setShowIcon(false), 700);
  }, [hasVideo, isYouTubeEmbed, manualStart, autoplayAllowed]);

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!isReelTap(start, { x: e.clientX, y: e.clientY })) return;
    if ((e.target as HTMLElement).closest("button, a, select, input")) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tapTimer.current) {
      window.clearTimeout(tapTimer.current);
      tapTimer.current = null;
      const shouldLike = isYouTubeEmbed || !props.liked;
      if (shouldLike) {
        setBurst({ x, y, key: Date.now() });
        window.setTimeout(() => setBurst(null), 800);
        props.onDoubleLike();
      }
      return;
    }
    tapTimer.current = window.setTimeout(() => {
      tapTimer.current = null;
      togglePlay();
    }, 250);
  }

  /*
   * A long session may have hundreds or thousands of already-visited panes in
   * the scroll container. Keep distant panes as tiny poster placeholders; the
   * full controls/player mount only for the active Reel and its neighbours.
   * IntersectionObserver still watches every placeholder, so it upgrades as
   * soon as it reaches the active window.
   */
  if (!near) {
    return (
      <article
        ref={paneRef}
        style={OFFSCREEN_STYLE}
        className="relative h-full w-full shrink-0 snap-start snap-always overflow-hidden bg-black"
        aria-label={`Reel by ${reel.creator_name}`}
      >
        {reel.poster_url ? (
          <CoverImage
            src={videoArtwork(reel.source_type, reel.external_id, resolveMedia(reel.poster_url))}
            alt=""
            width={720}
            height={1280}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-black" />
        )}
      </article>
    );
  }

  return (
    <article
      ref={paneRef}
      style={OFFSCREEN_STYLE}
      className="relative h-full w-full shrink-0 snap-start snap-always overflow-hidden bg-black"
      aria-label={`Reel by ${reel.creator_name}`}
    >
      <div
        className="absolute inset-0"
        onPointerDown={(e) => {
          pointerStart.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerCancel={() => {
          pointerStart.current = null;
        }}
        onPointerUp={handlePointerUp}
      >
        {hasVideo && shouldLoad ? (
          <video
            key={`${reel.id}:${playerAttempt}`}
            ref={videoRef}
            src={reel.video_url ?? undefined}
            poster={resolveMedia(reel.poster_url)}
            onPlaying={() => {
              setPlaying(true);
              setPlaybackError("");
            }}
            onPause={() => setPlaying(false)}
            onWaiting={() => setPlaying(false)}
            onError={() => {
              setPlaying(false);
              setPlaybackError("This video could not load. Check your connection and retry.");
            }}
            playsInline
            loop
            muted={muted}
            preload={active ? "auto" : "metadata"}
            className="h-full w-full object-cover"
          />
        ) : isYouTubeEmbed && shouldLoad ? (
          <InAppMediaPlayer
            key={`${reel.id}:${playerAttempt}`}
            videoId={reel.external_id!}
            title={reel.caption || reel.creator_name}
            autoplay={autoplayAllowed}
            loop
            controls={false}
            muted={muted}
            playing={shouldPlay}
            onPlaybackChange={setPlaying}
            interactive={false}
            className="h-full rounded-none"
          />
        ) : reel.poster_url ? (
          <CoverImage
            src={videoArtwork(reel.source_type, reel.external_id, resolveMedia(reel.poster_url))}
            alt=""
            width={720}
            height={1280}
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-b from-surface-2 via-surface to-background px-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/35 bg-primary/12 text-leaf">
              <Clapperboard className="h-6 w-6" strokeWidth={1.7} />
            </span>
            <p className="text-sm font-semibold text-foreground">No video on this Reel yet</p>
            <p className="max-w-[16rem] text-[12px] leading-relaxed text-muted-foreground">
              This post has no uploaded video or YouTube source attached, so there is nothing to
              play.
            </p>
          </div>
        )}
      </div>

      {hasVideo && playbackError && (
        <div
          role="alert"
          className="absolute inset-x-4 top-20 z-20 rounded-xl bg-black/85 p-4 text-sm text-white"
        >
          <p>{playbackError}</p>
          <button
            type="button"
            className="mt-2 min-h-11 rounded-lg border border-white/40 px-4"
            onClick={() => {
              setPlaybackError("");
              setPlaying(false);
              setManualStart(true);
              setPaused(false);
              setPlayerAttempt((a) => a + 1);
            }}
          >
            Retry video
          </button>
        </div>
      )}
      {(hasVideo || isYouTubeEmbed) && (autoplayAllowed || manualStart) && (
        <button
          type="button"
          aria-label={paused ? "Resume Reel" : "Pause Reel"}
          className="absolute right-3 top-16 z-10 rounded-full bg-black/50 p-3 text-white"
          onClick={togglePlay}
        >
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </button>
      )}

      {isLinkOutOnly && (
        <button
          type="button"
          onClick={openOriginal}
          className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full nuru-gradient-bg nuru-glow">
            <ExternalLink className="h-6 w-6 text-primary-foreground" />
          </span>
          <span className="rounded-full bg-black/50 px-3 py-1.5 text-[11px] font-medium text-white">
            Open on {SOURCE_LABEL[reel.source_type as ImportedSource]}
          </span>
        </button>
      )}

      {(isYouTubeEmbed || isLinkOutOnly) && (
        <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-black/40 py-1.5 pl-1.5 pr-3 text-[11px] font-medium text-white backdrop-blur-md">
          <span className="rounded-full bg-white/15 px-2 py-0.5">
            {SOURCE_LABEL[reel.source_type as ImportedSource]}
          </span>
          <button
            type="button"
            onClick={openOriginal}
            className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
          >
            Open original <ExternalLink className="h-3 w-3" />
          </button>
          {isYouTubeEmbed && (
            <button
              type="button"
              onClick={() => setPlayerAttempt((value) => value + 1)}
              className="min-h-9 rounded-full px-2 underline underline-offset-2"
              aria-label="Reload Reel player"
            >
              Retry
            </button>
          )}
        </div>
      )}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/55 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
      />

      {(hasVideo || isYouTubeEmbed) && !autoplayAllowed && !manualStart && (
        <button
          type="button"
          onClick={() => {
            setManualStart(true);
            setPaused(false);
          }}
          aria-label="Play Reel"
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full nuru-gradient-bg nuru-glow">
            <Play className="h-6 w-6 text-primary-foreground" />
          </span>
          <span className="rounded-full bg-black/50 px-2.5 py-1 text-[11px] text-white">
            Data saver — tap to play
          </span>
        </button>
      )}

      {(hasVideo || isYouTubeEmbed) && showIcon && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm"
        >
          {paused ? (
            <Play className="h-7 w-7 text-white" />
          ) : (
            <Pause className="h-7 w-7 text-white" />
          )}
        </span>
      )}

      {(hasVideo || isYouTubeEmbed) && muted && active && (
        <button
          type="button"
          onClick={props.onToggleMuted}
          className="absolute left-1/2 top-[18%] z-10 -translate-x-1/2 rounded-full bg-black/55 px-3.5 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md"
        >
          Tap for sound
        </button>
      )}

      {burst && (
        <Heart
          key={burst.key}
          aria-hidden="true"
          style={{ left: burst.x, top: burst.y }}
          className="pointer-events-none absolute h-20 w-20 -translate-x-1/2 -translate-y-1/2 animate-ping fill-destructive text-destructive motion-reduce:animate-none"
        />
      )}

      {(hasVideo || isYouTubeEmbed) && (
        <button
          type="button"
          onClick={props.onToggleMuted}
          aria-label={muted ? "Unmute Reel" : "Mute Reel"}
          className="absolute right-3 top-3 z-10 rounded-full bg-black/40 p-2 text-white backdrop-blur-md transition-transform active:scale-90"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        {/* Keep the action rail on the right and leave the video centre clear. */}
        <div className="pointer-events-auto flex items-end gap-3 px-3 pb-1">
          <div className="order-2 shrink-0 pb-1">
            <ReelInteractiveActions
              reel={reel}
              near={near}
              liked={props.liked}
              saved={props.saved}
              onProfile={props.onProfile}
              onLike={props.onLike}
              onComments={props.onComments}
              onShare={props.onShare}
              onSave={props.onSave}
              onMore={props.onMore}
              onCommentsVisibilityChange={setExternalCommentsOpen}
            />
          </div>

          <div className="min-w-0 flex-1">
            <ReelCaption
              reel={reel}
              isFollowing={props.isFollowing}
              canFollow={!props.isMine && !!reel.author_id}
              onFollow={props.onFollow}
              onOpenScripture={props.onRead}
            />
            <div className="mt-3">
              <ReelFaithActions
                hasScripture={!!reel.scripture_ref}
                onRead={props.onRead}
                onPray={props.onPray}
                onAskAi={props.onAskAi}
                onDiscuss={props.onDiscuss}
              />
            </div>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2 px-2 pb-1">
          <span className="shrink-0 pl-1 text-[10px] text-white/70">
            {compactNumber(reel.view_count)} views
          </span>
          {hasVideo ? (
            shouldLoad ? (
              <ReelProgress key={playerAttempt} videoRef={videoRef} />
            ) : (
              <span className="h-5 flex-1" />
            )
          ) : (
            <span className={cn("h-5 flex-1")} aria-hidden="true" />
          )}
        </div>
      </div>
    </article>
  );
}
