import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { fetchMediaDirectory, type MediaItem } from "@/services/media";
import { MEDIA_LANGUAGES } from "@/lib/mediaDirectory";
import { type YouTubeVideo } from "@/services/youtubeService";
import { CoverImage } from "@/components/nuru/CoverImage";
import { CardSkeleton, PrimaryButton } from "@/components/nuru/Primitives";
import { MediaCatalog } from "./MediaCatalog";
import { MediaCategoryRail } from "./MediaCategoryRail";

type Creator = Awaited<ReturnType<typeof fetchMediaDirectory>>["items"][number];
const pill = "min-h-11 shrink-0 rounded-full border border-border px-4 text-sm font-medium";

export function MusicDiscovery({
  onPlay,
  onPlayItem,
  query = "",
  mediaType = "music",
  catalogPlayback = "all",
  onBrowseChange,
}: {
  onPlay: (video: YouTubeVideo) => void;
  onPlayItem: (item: MediaItem) => void;
  query?: string;
  mediaType?: "music" | "podcast";
  catalogPlayback?: "all" | "audio" | "video";
  onBrowseChange?: (view: "artists" | "songs") => void;
}) {
  const [selected, setSelected] = useState<Creator | null>(null);
  const [language, setLanguage] = useState("all");
  const isMusic = mediaType === "music";
  const [view, setView] = useState(isMusic ? "Songs" : "Episodes");
  const creatorLabel = isMusic ? "Artists" : "Creators";
  const contentLabel = isMusic ? "Songs" : "Episodes";
  const directory = useInfiniteQuery({
    queryKey: ["media-directory", mediaType, language, query],
    enabled: view === creatorLabel && !selected,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchMediaDirectory({ kind: mediaType, language, query, page: pageParam }),
    getNextPageParam: (page, pages) => (page.hasMore ? pages.length : undefined),
    staleTime: 5 * 60 * 1000,
  });
  const creators = directory.data?.pages.flatMap((page) => page.items) ?? [];
  const channelId = selected?.youtube_channel_id ?? undefined;
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
          {[creatorLabel, contentLabel].map((label) => (
            <button
              key={label}
              type="button"
              aria-pressed={!selected && view === label}
              className={`${pill} ${!selected && view === label ? "bg-primary text-primary-foreground" : "bg-surface-1"}`}
              onClick={() => {
                setSelected(null);
                setView(label);
                onBrowseChange?.(label === creatorLabel ? "artists" : "songs");
              }}
            >
              {label === creatorLabel
                ? `All ${creatorLabel.toLowerCase()}`
                : label === contentLabel
                  ? `All ${contentLabel.toLowerCase()}`
                  : label}
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
            onClick={() => {
              setSelected(null);
              onBrowseChange?.("artists");
            }}
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
                    onClick={() => {
                      setSelected(creator);
                      onBrowseChange?.("songs");
                    }}
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
        {selected && <h3 className="font-display text-xl font-semibold">{selected.name}</h3>}
      </div>
      {(selected || view === contentLabel) && (!selected || channelId) && (
        <>
          <MediaCatalog
            mediaType={mediaType}
            channelId={channelId}
            creatorName={selected?.name}
            query={query}
            language={language}
            playback={catalogPlayback}
            hideEmptyState={!!selected && !!channelId}
            onPlay={onPlayItem}
          />
          {selected && channelId && (
            <div className="px-4">
              <MediaCategoryRail
                title={isMusic ? `${selected.name} songs` : `${selected.name} episodes`}
                channelId={channelId}
                onSelect={onPlay}
                showUnavailableNotice
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}
