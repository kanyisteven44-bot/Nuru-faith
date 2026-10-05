import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Heart, ListMusic, Maximize2, Minimize2, MoreHorizontal, Pause, Play, Repeat2, Shuffle, SkipBack, SkipForward, Video, X } from "lucide-react";
import { fetchMediaCatalog, type MediaItem } from "@/services/media";
import { CoverImage } from "@/components/nuru/CoverImage";
import { CardSkeleton, EmptyState, PrimaryButton } from "@/components/nuru/Primitives";
import { resolveMedia } from "@/lib/media";
import { playableAudioUrl, videoArtwork, youtubeVideoId } from "@/lib/mediaPlayback";
import { duration } from "@/lib/format";
import { InAppMediaPlayer as YouTubePlayer } from "./InAppMediaPlayer";

export function MediaCatalog({
  mediaType,
  query = "",
  onPlay,
  language = "all",
  videoOnly = false,
}: {
  mediaType: "music" | "podcast";
  query?: string;
  language?: string;
  videoOnly?: boolean;
  onPlay?: (item: MediaItem) => void;
}) {
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const nextPageMarker = useRef<HTMLDivElement>(null);
  const catalog = useInfiniteQuery({
    queryKey: ["media-catalog", mediaType, query, language, videoOnly],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchMediaCatalog({ mediaType, query, language, videoOnly, page: pageParam }),
    getNextPageParam: (page, pages) => (page.hasMore ? pages.length : undefined),
  });
  // Imports can shift offset pages between requests; render each saved item once.
  const items = Array.from(
    new Map(
      catalog.data?.pages.flatMap((page) => page.items.map((item) => [item.id, item] as const)),
    ).values(),
  );
  const total = Math.max(0, ...(catalog.data?.pages.map((page) => page.total) ?? []));
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = catalog;
  useEffect(() => {
    const marker = nextPageMarker.current;
    if (
      !marker ||
      !hasNextPage ||
      isFetchingNextPage ||
      isFetchNextPageError ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          void fetchNextPage();
        }
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(marker);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);
  return (
    <section
      className="space-y-3 px-4 py-4"
      aria-label={mediaType === "music" ? "Song catalogue" : "Podcast catalogue"}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">
          {mediaType === "music" ? "All songs" : videoOnly ? "Video episodes" : "Audio episodes"}
        </h2>
        {catalog.data && (
          <span className="text-xs text-muted-foreground" role="status" aria-live="polite">
            {items.length.toLocaleString()} of {total.toLocaleString()}{" "}
            {query ? "matches" : "available"}
          </span>
        )}
      </div>
      {catalog.isPending && <CardSkeleton count={3} height="h-20" />}
      {catalog.isError && (
        <div role="alert" className="nuru-card p-4">
          <p className="mb-3 text-sm">The catalogue could not load. Please try again.</p>
          <PrimaryButton onClick={() => void catalog.refetch()}>Retry catalogue</PrimaryButton>
        </div>
      )}
      {!catalog.isPending && !catalog.isError && !items.length && (
        <EmptyState
          title={query ? "No matching episodes or songs" : "No published media yet"}
          description={
            query
              ? "Try a title or creator name."
              : "New media will appear here when it is published."
          }
        />
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="group nuru-card overflow-hidden text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => {
              if (onPlay) onPlay(item);
              else setSelected(item);
            }}
            aria-label={`Play ${item.title}`}
          >
            <span className="relative block">
              <CoverImage
                src={videoArtwork(item.source, item.external_id, resolveMedia(item.thumbnail_url))}
                alt=""
                className="aspect-video w-full"
                width={480}
                height={270}
              />
              <span className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Play className="h-4 w-4 fill-current" />
              </span>
            </span>
            <span className="block min-w-0 p-3">
              <span className="block line-clamp-2 text-sm font-semibold">{item.title}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {item.creator_name}
              </span>
              {(item.duration_seconds ?? 0) > 0 && (
                <span className="text-xs text-muted-foreground">
                  {duration(item.duration_seconds)}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
      {catalog.hasNextPage && (
        <div ref={nextPageMarker} className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Keep scrolling to see more {mediaType === "music" ? "songs" : "episodes"}.
          </p>
          <PrimaryButton
            onClick={() => void catalog.fetchNextPage()}
            disabled={catalog.isFetchingNextPage}
          >
            {catalog.isFetchingNextPage ? "Loading…" : "Load more"}
          </PrimaryButton>
        </div>
      )}
      {catalog.data && !catalog.hasNextPage && items.length > 0 && (
        <p className="text-xs text-muted-foreground" role="status">
          {items.length >= total
            ? `All ${items.length.toLocaleString()} ${query ? "matching" : "available"} ${mediaType === "music" ? "songs" : "episodes"} are displayed.`
            : "The catalogue changed while you were browsing. Refresh to see the latest collection."}
        </p>
      )}
      {catalog.isFetchNextPageError && (
        <p role="alert" className="text-sm">
          Could not load the next page. Tap Load more to retry.
        </p>
      )}
      {selected && <MediaPlayback item={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

export function MediaPlayback({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  const [audioFailed, setAudioFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [liked, setLiked] = useState(false);
  useEffect(() => {
    setAudioFailed(false);
    setPlaying(false);
    setShowVideo(false);
  }, [item.id]);
  const video = item.source === "youtube" ? youtubeVideoId(item.external_id) : null;
  const audio = playableAudioUrl(item.audio_url);
  const artwork = videoArtwork(item.source, item.external_id, resolveMedia(item.thumbnail_url));

  return (
    <div
      className="fixed inset-0 z-[90] overflow-y-auto bg-background/96 backdrop-blur-2xl"
      role="dialog"
      aria-modal="true"
      aria-label={`Now playing ${item.title}`}
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <header className="flex items-center justify-between gap-3">
          <button type="button" onClick={onClose} className="nuru-soft-control flex h-11 w-11 items-center justify-center rounded-2xl" aria-label="Back">
            <X className="h-5 w-5" />
          </button>
          <div className="min-w-0 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">Now playing</p>
            <p className="truncate text-sm font-semibold">{item.title}</p>
          </div>
          <button type="button" className="nuru-soft-control flex h-11 w-11 items-center justify-center rounded-2xl" aria-label="More options">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </header>

        <div className="mx-auto mt-8 grid w-full max-w-4xl gap-8 md:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] md:items-center">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="absolute inset-[-12%] rounded-full bg-primary/10 blur-3xl" />
              <CoverImage
                src={artwork}
                alt=""
                width={720}
                height={720}
                className="relative aspect-square w-[min(72vw,360px)] rounded-full border border-white/10 object-cover shadow-2xl ring-1 ring-primary/15 sm:w-[360px]"
              />
              <div className="absolute inset-[42%] rounded-full border border-white/20 bg-background/70 shadow-inner" />
            </div>

            <div className="mt-7 max-w-xl text-center">
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{item.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{item.creator_name || "Nuru Faith"}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{item.media_type === "podcast" ? "Podcast episode" : "Gospel • Worship"}</p>
            </div>

            <div className="mt-7 flex items-center justify-center gap-7">
              <button type="button" className="text-muted-foreground transition-colors hover:text-foreground" aria-label="Shuffle">
                <Shuffle className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => setLiked((value) => !value)} className={liked ? "text-primary" : "text-muted-foreground"} aria-label={liked ? "Remove from favourites" : "Add to favourites"}>
                <Heart className={`h-6 w-6 ${liked ? "fill-current" : ""}`} />
              </button>
              <button type="button" className="text-muted-foreground transition-colors hover:text-foreground" aria-label="Repeat">
                <Repeat2 className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-7 w-full max-w-xl">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[32%] rounded-full bg-primary" />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                <span>Listening</span>
                <span>{item.duration_seconds ? duration(item.duration_seconds) : "Live"}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-6">
              <button type="button" className="nuru-soft-control flex h-12 w-12 items-center justify-center rounded-full" aria-label="Previous">
                <SkipBack className="h-5 w-5 fill-current" />
              </button>
              <button type="button" onClick={() => setPlaying((value) => !value)} className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/25" aria-label={playing ? "Pause" : "Play"}>
                {playing ? <Pause className="h-8 w-8 fill-current" /> : <Play className="ml-1 h-8 w-8 fill-current" />}
              </button>
              <button type="button" className="nuru-soft-control flex h-12 w-12 items-center justify-center rounded-full" aria-label="Next">
                <SkipForward className="h-5 w-5 fill-current" />
              </button>
            </div>

            <div className="mt-7 flex flex-wrap justify-center gap-2">
              {video && (
                <button type="button" onClick={() => setShowVideo((value) => !value)} className="nuru-soft-control inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium">
                  {showVideo ? <Minimize2 className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                  {showVideo ? "Hide video" : "Watch video"}
                </button>
              )}
              <button type="button" className="nuru-soft-control inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium">
                <ListMusic className="h-4 w-4" />
                Queue
              </button>
            </div>
          </div>

          <div className="w-full">
            {video && showVideo ? (
              <div className="nuru-card overflow-hidden rounded-3xl p-3">
                <YouTubePlayer
                  key={`${video}:${attempt}`}
                  videoId={video}
                  title={item.title}
                  muted={false}
                  playing={playing}
                  onPlaybackChange={setPlaying}
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Video playback is provided by YouTube inside Nuru Faith.
                  </p>
                  <button type="button" onClick={() => setAttempt((value) => value + 1)} className="shrink-0 text-xs font-semibold text-primary">Reload</button>
                </div>
              </div>
            ) : audio ? (
              <div className="nuru-card rounded-3xl p-5">
                <audio
                  key={`${item.id}:${attempt}`}
                  src={audio}
                  autoPlay={playing}
                  preload="metadata"
                  className="w-full"
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onError={() => setAudioFailed(true)}
                />
                <p className="text-sm font-semibold">Nuru audio</p>
                <p className="mt-1 text-xs text-muted-foreground">Audio streams directly from the approved publisher.</p>
                {audioFailed && (
                  <div role="alert" className="mt-4 space-y-2 text-sm">
                    <p>The publisher’s audio could not load.</p>
                    <PrimaryButton onClick={() => { setAudioFailed(false); setAttempt((value) => value + 1); }}>Retry playback</PrimaryButton>
                  </div>
                )}
              </div>
            ) : (
              <div className="nuru-card rounded-3xl p-5 text-sm text-muted-foreground">
                {video ? "Tap Watch video to open the official video player." : "This item has no available playback source."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
