import { useQuery } from "@tanstack/react-query";
import { fetchYouTubeReelDetails } from "@/lib/youtubeReel.functions";

export function VideoSourceStats({ videoId, enabled }: { videoId: string; enabled: boolean }) {
  const details = useQuery({
    queryKey: ["youtube-reel-details", videoId],
    queryFn: () => fetchYouTubeReelDetails({ data: { videoId } }),
    enabled: enabled && /^[A-Za-z0-9_-]{11}$/.test(videoId),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const stats = details.data?.stats;
  return (
    <div
      className="mt-2 text-center text-[11px] text-muted-foreground"
      aria-label="Original video statistics"
    >
      <a
        href={`https://www.youtube.com/watch?v=${videoId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold"
      >
        YouTube
      </a>
      {stats ? (
        <>
          {stats.likes !== null && <span> · {BigInt(stats.likes).toLocaleString()} likes</span>}
          {stats.comments !== null && (
            <span> · {BigInt(stats.comments).toLocaleString()} comments</span>
          )}
        </>
      ) : (
        <span>
          {" "}
          ·{" "}
          {details.isError
            ? "Counts unavailable"
            : enabled
              ? "Loading counts…"
              : "Sign in to view counts"}
        </span>
      )}
    </div>
  );
}
