import { useQuery } from "@tanstack/react-query";
import { youtubeVideoStats } from "@/lib/youtube.functions";

/**
 * YouTube's own view and like counts for a video Nuru did not publish.
 *
 * A reel sourced from YouTube belongs to its creator, so Nuru's internal
 * counters are the wrong number to show beside it — they read as the
 * creator's video having no likes. Both the action rail and the view label
 * call this, and React Query's cache means that is still one request.
 *
 * Returns nulls when the key is not configured or the call fails, so callers
 * can show nothing rather than a figure they cannot stand behind. Cached for
 * an hour: these move slowly and each call costs API quota.
 */
export function useYoutubeVideoStats(externalId: string, enabled: boolean) {
  const query = useQuery({
    queryKey: ["youtube-video-stats", externalId],
    queryFn: () => youtubeVideoStats({ data: { ids: [externalId] } }),
    enabled: enabled && /^[\w-]{11}$/.test(externalId),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
  const stats = query.data?.stats?.[externalId];
  return {
    views: stats?.viewCount ?? null,
    likes: stats?.likeCount ?? null,
  };
}
