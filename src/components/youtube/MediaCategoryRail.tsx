import { useQuery } from "@tanstack/react-query";
import { youtubeQuery, youtubeErrorMessage, type YouTubeVideo } from "@/services/youtubeService";
import { CardSkeleton, SectionHeader } from "@/components/nuru/Primitives";
import { VideoCard } from "./MediaCards";

/** A horizontal rail of YouTube videos for one Nuru Faith topic. */
export function MediaCategoryRail({
  title,
  query,
  channelId,
  onSelect,
  limit = 8,
}: {
  title: string;
  query?: string;
  channelId?: string;
  onSelect: (video: YouTubeVideo) => void;
  limit?: number;
}) {
  const result = useQuery(
    youtubeQuery({
      ...(query ? { query } : {}),
      ...(channelId ? { channelId } : {}),
      type: "video",
      maxResults: limit,
    }),
  );
  const message = youtubeErrorMessage(result.data?.error);
  const videos = result.data?.videos ?? [];

  if (!result.isLoading && !message && videos.length === 0) return null;

  return (
    <section className="pt-5">
      <div className="px-4">
        <SectionHeader title={title} />
      </div>
      {result.isLoading ? (
        <div className="px-4">
          <CardSkeleton count={2} height="h-40" />
        </div>
      ) : message ? (
        <p className="px-4 text-xs text-muted-foreground">{message}</p>
      ) : (
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
          {videos.map((v) => (
            <VideoCard
              key={v.youtubeVideoId}
              video={v}
              onSelect={onSelect}
              className="w-60 shrink-0"
            />
          ))}
        </div>
      )}
    </section>
  );
}
