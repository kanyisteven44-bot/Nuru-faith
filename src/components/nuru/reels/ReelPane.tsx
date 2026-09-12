import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Heart, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveMedia } from "@/lib/media";
import { compactNumber } from "@/lib/format";
import type { Reel } from "@/services/reels";
import { SOURCE_LABEL, type ImportedSource } from "@/lib/reelImport";
import { YouTubePlayer } from "@/components/youtube/YouTubePlayer";
import { ReelActions } from "./ReelActions";
import { ReelCaption } from "./ReelCaption";
import { ReelFaithActions } from "./ReelFaithActions";
import { ReelProgress } from "./ReelProgress";

export type ReelPaneProps = {
  reel: Reel;
  index: number;
  active: boolean;
  /** Active, or directly next to it — only these load video data. */
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

export function ReelPane(props: ReelPaneProps) {
  const { reel, index, active, near, muted, autoplayAllowed, commentsOpen, onActive, onView } =
    props;
  const paneRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const tapTimer = useRef<number | null>(null);
  const viewLogged = useRef(false);
  const wasPlaying = useRef(false);

  const [paused, setPaused] = useState(false);
  const [showIcon, setShowIcon] = useState(false);
  const [burst, setBurst] = useState<{ x: number; y: number; key: number } | null>(null);
  const [manualStart, setManualStart] = useState(false);

  const hasVideo = !!reel.video_url;
  const isYouTubeEmbed = reel.source_type === "youtube" && !!reel.external_id;
  const isLinkOutOnly =
    (reel.source_type === "tiktok" || reel.source_type === "instagram") && !!reel.external_url;
  const shouldLoad = near && (autoplayAllowed || manualStart || active);

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

  /* --- playback: exactly one video plays at a time --- */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    if (active && !paused && !commentsOpen && (autoplayAllowed || manualStart)) {
      void v.play().catch(() => undefined);
    } else {
      v.pause();
      if (!active) {
        v.currentTime = 0;
        setPaused(false);
      }
    }
  }, [active, paused, muted, commentsOpen, autoplayAllowed, manualStart]);

  /* --- pause while comments are open, resume after --- */
  useEffect(() => {
    if (commentsOpen) wasPlaying.current = !paused;
    else if (wasPlaying.current) setPaused(false);
  }, [commentsOpen, paused]);

  /* --- a view only counts after ~2 seconds of being active --- */
  useEffect(() => {
    if (!active || viewLogged.current) return;
    const t = window.setTimeout(() => {
      viewLogged.current = true;
      onView(reel);
    }, 2000);
    return () => window.clearTimeout(t);
  }, [active, reel, onView]);

  useEffect(() => () => (tapTimer.current ? window.clearTimeout(tapTimer.current) : undefined), []);

  const togglePlay = useCallback(() => {
    if (!hasVideo) return;
    setManualStart(true);
    setPaused((p) => !p);
    setShowIcon(true);
    window.setTimeout(() => setShowIcon(false), 700);
  }, [hasVideo]);

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tapTimer.current) {
      // second tap → like, and never pause
      window.clearTimeout(tapTimer.current);
      tapTimer.current = null;
      setBurst({ x, y, key: Date.now() });
      window.setTimeout(() => setBurst(null), 800);
      if (!props.liked) props.onLike();
      return;
    }
    tapTimer.current = window.setTimeout(() => {
      tapTimer.current = null;
      togglePlay();
    }, 250);
  }

  return (
    <article
      ref={paneRef}
      className="relative h-full w-full shrink-0 snap-start snap-always overflow-hidden bg-black"
      aria-label={`Reel by ${reel.creator_name}`}
    >
      <div className="absolute inset-0" onPointerUp={handlePointerUp}>
        {hasVideo && shouldLoad ? (
          <video
            ref={videoRef}
            src={reel.video_url ?? undefined}
            poster={resolveMedia(reel.poster_url)}
            playsInline
            loop
            muted={muted}
            preload={active ? "auto" : "metadata"}
            className="h-full w-full object-cover"
          />
        ) : isYouTubeEmbed && shouldLoad ? (
          <YouTubePlayer
            videoId={reel.external_id!}
            title={reel.caption || reel.creator_name}
            autoplay={active}
            muted={muted}
            className="h-full rounded-none"
          />
        ) : (
          <img
            src={resolveMedia(reel.poster_url)}
            alt=""
            width={720}
            height={1280}
            loading={near ? "eager" : "lazy"}
            className="h-full w-full object-cover"
          />
        )}
      </div>

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
        <div className="absolute left-3 top-14 z-10 flex items-center gap-1.5 rounded-full bg-black/40 py-1.5 pl-1.5 pr-3 text-[11px] font-medium text-white backdrop-blur-md">
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
        </div>
      )}

      {/* legibility gradients only where text sits */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/55 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
      />

      {hasVideo && !autoplayAllowed && !manualStart && (
        <button
          type="button"
          onClick={() => setManualStart(true)}
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

      {hasVideo && showIcon && (
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

      {burst && (
        <Heart
          key={burst.key}
          aria-hidden="true"
          style={{ left: burst.x, top: burst.y }}
          className="pointer-events-none absolute h-20 w-20 -translate-x-1/2 -translate-y-1/2 animate-ping fill-destructive text-destructive motion-reduce:animate-none"
        />
      )}

      {!isYouTubeEmbed && (
        <button
          type="button"
          onClick={props.onToggleMuted}
          aria-label={muted ? "Unmute Reel" : "Mute Reel"}
          className="absolute right-3 top-14 z-10 rounded-full bg-black/40 p-2 text-white backdrop-blur-md transition-transform active:scale-90"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <div className="pointer-events-auto flex items-end gap-3 px-3 pb-1">
          <div className="min-w-0 flex-1">
            <ReelFaithActions
              hasScripture={!!reel.scripture_ref}
              onRead={props.onRead}
              onPray={props.onPray}
              onAskAi={props.onAskAi}
              onDiscuss={props.onDiscuss}
            />
            <div className="mt-2">
              <ReelCaption
                reel={reel}
                isFollowing={props.isFollowing}
                canFollow={!props.isMine && !!reel.author_id}
                onFollow={props.onFollow}
                onOpenScripture={props.onRead}
              />
            </div>
          </div>

          <div className="pb-1">
            <ReelActions
              avatarUrl={reel.creator_avatar_url}
              creatorName={reel.creator_name}
              likeCount={reel.like_count}
              commentCount={reel.comment_count}
              liked={props.liked}
              saved={props.saved}
              onProfile={props.onProfile}
              onLike={props.onLike}
              onComments={props.onComments}
              onShare={props.onShare}
              onSave={props.onSave}
              onMore={props.onMore}
            />
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2 px-2 pb-1">
          <span className="shrink-0 pl-1 text-[10px] text-white/70">
            {compactNumber(reel.view_count)} views
          </span>
          {hasVideo ? (
            <ReelProgress videoRef={videoRef} />
          ) : (
            <span className={cn("h-5 flex-1")} aria-hidden="true" />
          )}
        </div>
      </div>
    </article>
  );
}
