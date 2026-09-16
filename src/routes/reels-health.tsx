import { createFileRoute } from "@tanstack/react-router";
import { youtubeReelsFeed } from "@/lib/youtubeReels.functions";

export const Route = createFileRoute("/reels-health")({
  loader: async () => {
    const result = await youtubeReelsFeed();
    return {
      ok: !result.error,
      error: result.error,
      reelCount: result.videos.length,
      samples: result.videos.slice(0, 5).map((video) => ({
        id: video.youtubeVideoId,
        title: video.title,
        channel: video.channelName,
      })),
    };
  },
  component: HealthPage,
});

function HealthPage() {
  const data = Route.useLoaderData();
  return <pre>{JSON.stringify(data)}</pre>;
}
