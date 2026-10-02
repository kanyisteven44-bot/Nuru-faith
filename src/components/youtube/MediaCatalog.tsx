import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Play, X } from "lucide-react";
import { fetchMediaCatalog, type MediaItem } from "@/services/media";
import { CoverImage } from "@/components/nuru/CoverImage";
import { CardSkeleton, EmptyState, PrimaryButton } from "@/components/nuru/Primitives";
import { resolveMedia } from "@/lib/media";
import { playableAudioUrl, youtubeVideoId } from "@/lib/mediaPlayback";
import { duration } from "@/lib/format";
import { YouTubePlayer } from "./YouTubePlayer";

export function MediaCatalog({
  mediaType,
  query = "",
  onPlay,
}: {
  mediaType: "music" | "podcast";
  query?: string;
  onPlay?: (item: MediaItem) => void;
}) {
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const catalog = useInfiniteQuery({
    queryKey: ["media-catalog", mediaType, query],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchMediaCatalog({ mediaType, query, page: pageParam }),
    getNextPageParam: (page, pages) => (page.hasMore ? pages.length : undefined),
  });
  const items = catalog.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <section
      className="space-y-3 px-4 py-4"
      aria-label={mediaType === "music" ? "Song catalogue" : "Podcast catalogue"}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">
          {mediaType === "music" ? "Song library" : "Podcast episodes"}
        </h2>
        {catalog.data && (
          <span className="text-xs text-muted-foreground">
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
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="nuru-card flex min-h-24 items-center gap-3 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => {
              if (onPlay) onPlay(item);
              else setSelected(item);
            }}
            aria-label={`Play ${item.title}`}
          >
            <CoverImage
              src={resolveMedia(item.thumbnail_url)}
              alt=""
              className="h-16 w-16 shrink-0 rounded-xl"
              width={96}
              height={96}
            />
            <span className="min-w-0 flex-1">
              <span className="block line-clamp-2 text-sm font-semibold">{item.title}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {item.creator_name}
              </span>
              <span className="text-xs text-muted-foreground">
                {duration(item.duration_seconds)}
              </span>
            </span>
            <Play className="h-4 w-4 shrink-0 text-primary" />
          </button>
        ))}
      </div>
      {catalog.hasNextPage && (
        <PrimaryButton
          onClick={() => void catalog.fetchNextPage()}
          disabled={catalog.isFetchingNextPage}
        >
          {catalog.isFetchingNextPage ? "Loading…" : "Load more"}
        </PrimaryButton>
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
  useEffect(() => setAudioFailed(false), [item.id]);
  const video = item.source === "youtube" ? youtubeVideoId(item.external_id) : null;
  const audio = playableAudioUrl(item.audio_url);
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto border-t border-border bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl"
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
            <YouTubePlayer key={video} videoId={video} title={item.title} autoplay muted={false} />
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
              key={item.id}
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
              <p role="alert" className="text-sm">
                The publisher’s audio could not load. Try again later.
              </p>
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
