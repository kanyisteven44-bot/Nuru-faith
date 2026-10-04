import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowLeft, Play } from "lucide-react";
import { fetchMediaDirectory, type MediaItem } from "@/services/media";
import { youtubeSearch } from "@/lib/youtube.functions";
import { MEDIA_LANGUAGES, safeMediaTerm } from "@/lib/mediaDirectory";
import { youtubeErrorMessage, type YouTubeVideo } from "@/services/youtubeService";
import { CoverImage } from "@/components/nuru/CoverImage";
import { CardSkeleton, PrimaryButton } from "@/components/nuru/Primitives";
import { MediaCatalog } from "./MediaCatalog";

type Creator = Awaited<ReturnType<typeof fetchMediaDirectory>>["items"][number];
const pill = "min-h-11 shrink-0 rounded-full border border-border px-4 text-sm font-medium";

export function MusicDiscovery({
  onPlay,
  onPlayItem,
  query = "",
  mediaType = "music",
}: {
  onPlay: (video: YouTubeVideo) => void;
  onPlayItem: (item: MediaItem) => void;
  query?: string;
  mediaType?: "music" | "podcast";
}) {
  const [selected, setSelected] = useState<Creator | null>(null);
  const [view, setView] = useState("All");
  const [language, setLanguage] = useState("all");
  const isMusic = mediaType === "music";
  const creatorLabel = isMusic ? "Artists" : "Creators";
  const contentLabel = isMusic ? "Songs" : "Episodes";
  const directory = useInfiniteQuery({
    queryKey: ["media-directory", mediaType, language, query],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchMediaDirectory({ kind: mediaType, language, query, page: pageParam }),
    getNextPageParam: (page, pages) => (page.hasMore ? pages.length : undefined),
    staleTime: 5 * 60 * 1000,
  });
  const creators = directory.data?.pages.flatMap((page) => page.items) ?? [];
  const channelId = selected?.youtube_channel_id ?? undefined;
  const songs = useInfiniteQuery({
    queryKey: ["creator-videos", mediaType, channelId],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const result = await youtubeSearch({
        data: {
          channelId,
          musicOnly: isMusic,
          podcastOnly: !isMusic,
          type: "video",
          maxResults: 50,
          pageToken: pageParam,
        },
      });
      if (result.error)
        throw new Error(youtubeErrorMessage(result.error) ?? "Videos could not load.");
      return result;
    },
    getNextPageParam: (page) => page.nextPageToken ?? undefined,
    enabled: !!channelId,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
  const videos = [
    ...new Map(
      (songs.data?.pages.flatMap((page) => page.videos) ?? []).map((video) => [
        video.youtubeVideoId,
        video,
      ]),
    ).values(),
  ];
  const { hasNextPage, isFetching, isError, fetchNextPage } = songs;
  const pageCount = songs.data?.pages.length ?? 0;
  useEffect(() => {
    if (hasNextPage && !isFetching && !isError && videos.length < 12 && pageCount < 4)
      void fetchNextPage();
  }, [hasNextPage, isFetching, isError, pageCount, fetchNextPage, videos.length]);
  const term = safeMediaTerm(query).toLocaleLowerCase();
  const visibleVideos = videos.filter(
    (video) => !term || video.title.toLocaleLowerCase().includes(term),
  );
  return (
    <section
      className="space-y-4 py-5"
      aria-label={isMusic ? "Discover music" : "Discover video podcasts"}
    >
      <div className="space-y-4 px-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">
            {isMusic ? "Music for every moment" : "Watch. Learn. Grow."}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isMusic
              ? "Worship, praise and gospel from around the world."
              : "Video conversations, Bible teaching and faith for everyday life."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Browse library">
          {["All", creatorLabel, contentLabel].map((label) => (
            <button
              key={label}
              type="button"
              aria-pressed={!selected && view === label}
              className={`${pill} ${!selected && view === label ? "bg-primary text-primary-foreground" : "bg-surface-1"}`}
              onClick={() => {
                setSelected(null);
                setView(label);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1" aria-label="Choose language">
          {MEDIA_LANGUAGES.map((option) => (
            <button
              key={option.code}
              type="button"
              aria-pressed={language === option.code}
              className={`${pill} ${language === option.code ? "border-primary bg-primary/10 text-primary" : "bg-surface-1"}`}
              onClick={() => {
                setLanguage(option.code);
                setSelected(null);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        {selected ? (
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="flex min-h-11 items-center gap-2 text-sm text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {view.toLowerCase()}
          </button>
        ) : (
          view !== contentLabel && (
            <>
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-lg font-semibold">{creatorLabel}</h3>
                <p role="status" className="text-xs text-muted-foreground">
                  {directory.data?.pages[0]?.total ?? 0} available
                </p>
              </div>
              {directory.isPending && <CardSkeleton count={4} height="h-20" />}
              {directory.isError && (
                <div role="alert">
                  <p>The directory could not load.</p>
                  <PrimaryButton onClick={() => void directory.refetch()}>
                    Retry directory
                  </PrimaryButton>
                </div>
              )}
              {!directory.isPending && !directory.isError && !creators.length && (
                <p className="text-sm text-muted-foreground">
                  No creators match these filters. Try another language or search.
                </p>
              )}
              <div
                className={
                  view === "All"
                    ? "no-scrollbar flex gap-3 overflow-x-auto pb-2"
                    : "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
                }
              >
                {(view === "All" ? creators.slice(0, 8) : creators).map((creator) => (
                  <button
                    type="button"
                    key={creator.id}
                    aria-label={`Browse ${creator.name}`}
                    onClick={() => setSelected(creator)}
                    className={`nuru-card flex items-center gap-3 p-3 text-left ${view === "All" ? "w-56 shrink-0" : ""}`}
                  >
                    <CoverImage
                      src={creator.avatar_url ?? undefined}
                      alt=""
                      width={64}
                      height={64}
                      className="h-12 w-12 shrink-0 rounded-full"
                    />
                    <span className="min-w-0">
                      <span className="line-clamp-2 block text-sm font-semibold">
                        {creator.name}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Browse {contentLabel.toLowerCase()}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              {view === "All" && creators.length > 0 && (
                <button
                  type="button"
                  className="min-h-11 text-sm font-semibold text-primary"
                  onClick={() => setView(creatorLabel)}
                >
                  View all {creatorLabel.toLowerCase()} →
                </button>
              )}
              {view === creatorLabel && directory.hasNextPage && (
                <PrimaryButton
                  disabled={directory.isFetchingNextPage}
                  onClick={() => void directory.fetchNextPage()}
                >
                  {directory.isFetchingNextPage
                    ? "Loading…"
                    : `Load more ${creatorLabel.toLowerCase()}`}
                </PrimaryButton>
              )}
            </>
          )
        )}
        {selected && (
          <>
            <h3 className="font-display text-xl font-semibold">{selected.name}</h3>
            {songs.isPending && <CardSkeleton count={4} height="h-44" />}
            {songs.isError && (
              <div role="alert">
                <p>{songs.error?.message}</p>
                <PrimaryButton onClick={() => void songs.refetch()}>Try again</PrimaryButton>
              </div>
            )}
            <p role="status" className="text-xs text-muted-foreground">
              {visibleVideos.length} {contentLabel.toLowerCase()} loaded
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {visibleVideos.map((video) => (
                <button
                  key={video.youtubeVideoId}
                  type="button"
                  onClick={() => onPlay(video)}
                  aria-label={`Play ${video.title}`}
                  className="group overflow-hidden rounded-2xl border border-border bg-surface-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="relative block">
                    <CoverImage
                      src={video.thumbnail}
                      alt=""
                      width={480}
                      height={270}
                      className="aspect-video w-full"
                    />
                    <span className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Play className="h-4 w-4 fill-current" />
                    </span>
                    {video.duration && (
                      <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-[10px] text-white">
                        {video.duration}
                      </span>
                    )}
                  </span>
                  <span className="block p-3">
                    <span className="line-clamp-2 block min-h-10 text-sm font-semibold">
                      {video.title}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {video.channelName}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            {songs.data && !visibleVideos.length && (
              <p className="text-sm text-muted-foreground">
                No matching videos in these batches. Load more or try another creator.
              </p>
            )}
            {songs.hasNextPage && (
              <PrimaryButton
                disabled={songs.isFetchingNextPage}
                onClick={() => void songs.fetchNextPage()}
              >
                {songs.isFetchingNextPage ? "Loading…" : `Load more ${contentLabel.toLowerCase()}`}
              </PrimaryButton>
            )}
            {songs.isFetchNextPageError && (
              <p role="alert">The next batch could not load. Try Load more again.</p>
            )}
            {songs.data && !songs.hasNextPage && (
              <p className="text-xs text-muted-foreground">
                You’ve reached the end of this collection.
              </p>
            )}
          </>
        )}
      </div>
      {!selected && view !== creatorLabel && (
        <MediaCatalog
          mediaType={mediaType}
          query={query}
          language={language}
          videoOnly={!isMusic}
          onPlay={onPlayItem}
        />
      )}
    </section>
  );
}
