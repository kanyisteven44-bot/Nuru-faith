import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { fetchMediaSources } from "@/services/media";
import { youtubeSearch } from "@/lib/youtube.functions";
import { MUSIC_SOURCE_NAMES } from "@/lib/musicImport";
import { youtubeErrorMessage, type YouTubeVideo } from "@/services/youtubeService";
import { CoverImage } from "@/components/nuru/CoverImage";
import { CardSkeleton, PrimaryButton } from "@/components/nuru/Primitives";

export function MusicDiscovery({ onPlay }: { onPlay: (video: YouTubeVideo) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const sources = useQuery({
    queryKey: ["media-sources", "artist"],
    queryFn: () => fetchMediaSources({ sourceType: "youtube" }),
  });
  const artists = (sources.data ?? []).filter(
    (source) => source.youtube_channel_id && MUSIC_SOURCE_NAMES.includes(source.name),
  );
  const channelId = selected ?? artists[0]?.youtube_channel_id ?? undefined;
  const artist = artists.find((source) => source.youtube_channel_id === channelId);
  const songs = useInfiniteQuery({
    queryKey: ["music-discovery", channelId],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const result = await youtubeSearch({
        data: { channelId, musicOnly: true, type: "video", maxResults: 50, pageToken: pageParam },
      });
      if (result.error)
        throw new Error(youtubeErrorMessage(result.error) ?? "Music could not load.");
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
  return (
    <section className="space-y-4 px-4 py-5" aria-label="Discover music">
      <div>
        <h2 className="font-display text-2xl font-semibold">Find your next favourite</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Praise, worship and gospel from artists you love.
        </p>
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2" aria-label="Choose an artist">
        {artists.map((source) => (
          <button
            key={source.id}
            type="button"
            aria-pressed={channelId === source.youtube_channel_id}
            onClick={() => setSelected(source.youtube_channel_id)}
            className={
              channelId === source.youtube_channel_id
                ? "min-h-11 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
                : "min-h-11 shrink-0 rounded-full border border-border bg-surface-1 px-4 text-sm font-medium"
            }
          >
            {source.name}
          </button>
        ))}
      </div>
      {(sources.isLoading || (!!channelId && songs.isPending)) && (
        <CardSkeleton count={4} height="h-44" />
      )}
      {(sources.isError || songs.isError) && (
        <div role="alert" className="nuru-card p-4">
          <p className="mb-3 text-sm">{songs.error?.message ?? "Artists could not load."}</p>
          <PrimaryButton
            onClick={() => {
              void sources.refetch();
              void songs.refetch();
            }}
          >
            Try again
          </PrimaryButton>
        </div>
      )}
      {artist && songs.data && (
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold">{artist.name}</h3>
          <p role="status" className="text-xs text-muted-foreground">
            {videos.length} songs loaded
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {videos.map((video) => (
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
              <span className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                <Play className="h-4 w-4 fill-current" />
              </span>
              {video.duration && (
                <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-1 text-[10px] text-white">
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
      {songs.data && !videos.length && (
        <p className="text-sm text-muted-foreground">
          No available songs in this batch. Choose another artist or load more.
        </p>
      )}
      {songs.hasNextPage && (
        <PrimaryButton
          disabled={songs.isFetchingNextPage}
          onClick={() => void songs.fetchNextPage()}
        >
          {songs.isFetchingNextPage ? "Loading songs…" : "Load more songs"}
        </PrimaryButton>
      )}
      {songs.isFetchNextPageError && (
        <p role="alert" className="text-sm">
          Could not load the next songs. Try Load more again.
        </p>
      )}
      {songs.data && !songs.hasNextPage && (
        <p className="text-xs text-muted-foreground">
          You’ve reached the end of this artist’s available collection.
        </p>
      )}
    </section>
  );
}
