import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Play, X } from "lucide-react";
import { fetchMediaCatalog, type MediaItem } from "@/services/media";
import { CoverImage } from "@/components/nuru/CoverImage";
import { CardSkeleton, EmptyState, PrimaryButton } from "@/components/nuru/Primitives";
import { resolveMedia } from "@/lib/media";
import { playableAudioUrl, videoArtwork, youtubeVideoId } from "@/lib/mediaPlayback";
import { duration } from "@/lib/format";
import { useNowPlaying } from "@/hooks/useNowPlaying";
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
  const { play } = useNowPlaying();
  const nextPageMarker = useRef<HTMLDivElement>(null);
  const catalog = useInfiniteQuery({
    queryKey: ["media-catalog", mediaType, query, language, videoOnly],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchMediaCatalog({ mediaType, query, language, videoOnly, page: pageParam }),
    getNextPageParam: (page, pages) => (page.hasMore ? pages.length : undefined),
  });
  const items = catalog.data?.pages.flatMap((page) => page.items) ?? [];
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
          {mediaType === "music" ? "All songs" : videoOnly ? "Video episodes" : "All episodes"}
        </h2>
        {catalog.data && (
          <span className="text-xs text-muted-foreground" role="status" aria-live="polite">
            {items.length.toLocaleString()} of{" "}
            {(catalog.data.pages[0]?.total ?? 0).toLocaleString()} {query ? "matches" : "available"}
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
        {items.map((item, position) => (
          <button
            key={item.id}
            type="button"
            className="group nuru-card overflow-hidden text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => {
              // Songs and episodes both open in Nuru's own player, with the
              // rest of the list queued behind them.
              if (onPlay) onPlay(item);
              else play(items, position);
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
          All {items.length.toLocaleString()} {query ? "matching" : "available"}{" "}
          {mediaType === "music" ? "songs" : "episodes"} are displayed.
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
  useEffect(() => setAudioFailed(false), [item.id]);
  const video = item.source === "youtube" ? youtubeVideoId(item.external_id) : null;
  const audio = playableAudioUrl(item.audio_url);
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 md:inset-x-auto md:bottom-5 md:right-5 md:w-[420px] md:rounded-3xl md:border max-h-[85dvh] overflow-y-auto border-t border-border bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl"
      role="region"
      aria-label="Media player"
    >
      <div className="mx-auto max-w-xl space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.creator_name}</p>
          </div>
          <button
            type="button"
            className="nuru-soft-control flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
            aria-label="Close media player"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {video ? (
          <>
            <YouTubePlayer
              key={`${video}:${attempt}`}
              videoId={video}
              title={item.title}
              muted={false}
            />
            <p className="text-xs text-muted-foreground">
              Tap Play in the video to start listening with sound.
            </p>
            <PrimaryButton onClick={() => setAttempt((value) => value + 1)}>
              Reload player
            </PrimaryButton>
            <a
              href={`https://www.youtube.com/watch?v=${video}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-primary"
            >
              If playback is unavailable, open on YouTube
            </a>
          </>
        ) : audio ? (
          <>
            <audio
              key={`${item.id}:${attempt}`}
              src={audio}
              controls
              autoPlay
              preload="metadata"
              className="w-full"
              onError={() => setAudioFailed(true)}
            />
            <p className="text-xs text-muted-foreground">
              Streams directly from the publisher. Use the player controls to play, pause and seek.
            </p>
            {audioFailed && (
              <div role="alert" className="space-y-2 text-sm">
                <p>The publisher’s audio could not load.</p>
                <PrimaryButton
                  onClick={() => {
                    setAudioFailed(false);
                    setAttempt((value) => value + 1);
                  }}
                >
                  Retry playback
                </PrimaryButton>
                <a
                  href={audio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-primary"
                >
                  Open publisher audio
                </a>
              </div>
            )}
          </>
        ) : (
          <p role="alert" className="text-sm">
            This item has no available playback source.
          </p>
        )}
      </div>
    </div>
  );
}
