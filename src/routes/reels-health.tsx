import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const probeYouTubeReels = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["YOUTUBE_API_KEY"];
  if (!key) return { ok: false, error: "not-configured", searchCount: 0, playableCount: 0 };

  try {
    const search = new URL("https://www.googleapis.com/youtube/v3/search");
    search.searchParams.set("part", "snippet");
    search.searchParams.set("q", "christian shorts bible jesus prayer worship gospel faith");
    search.searchParams.set("type", "video");
    search.searchParams.set("maxResults", "25");
    search.searchParams.set("safeSearch", "strict");
    search.searchParams.set("videoEmbeddable", "true");
    search.searchParams.set("videoDuration", "short");
    search.searchParams.set("key", key);

    const searchResponse = await fetch(search.toString(), { cache: "no-store" });
    const searchJson = (await searchResponse.json().catch(() => ({}))) as {
      items?: Array<{ id?: { videoId?: string } }>;
      error?: { message?: string; errors?: Array<{ reason?: string }> };
    };
    if (!searchResponse.ok) {
      return {
        ok: false,
        error: searchJson.error?.errors?.[0]?.reason ?? searchJson.error?.message ?? `search-${searchResponse.status}`,
        searchCount: 0,
        playableCount: 0,
      };
    }

    const ids = (searchJson.items ?? []).map((item) => item.id?.videoId).filter((id): id is string => Boolean(id));
    if (!ids.length) return { ok: true, error: null, searchCount: 0, playableCount: 0 };

    const details = new URL("https://www.googleapis.com/youtube/v3/videos");
    details.searchParams.set("part", "status,contentDetails");
    details.searchParams.set("id", ids.join(","));
    details.searchParams.set("key", key);
    const detailsResponse = await fetch(details.toString(), { cache: "no-store" });
    const detailsJson = (await detailsResponse.json().catch(() => ({}))) as {
      items?: Array<{ status?: { embeddable?: boolean; privacyStatus?: string } }>;
      error?: { message?: string; errors?: Array<{ reason?: string }> };
    };
    if (!detailsResponse.ok) {
      return {
        ok: false,
        error: detailsJson.error?.errors?.[0]?.reason ?? detailsJson.error?.message ?? `details-${detailsResponse.status}`,
        searchCount: ids.length,
        playableCount: 0,
      };
    }

    const playableCount = (detailsJson.items ?? []).filter(
      (item) => item.status?.embeddable === true && item.status?.privacyStatus === "public",
    ).length;

    return { ok: true, error: null, searchCount: ids.length, playableCount };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "unknown",
      searchCount: 0,
      playableCount: 0,
    };
  }
});

export const Route = createFileRoute("/reels-health")({
  loader: () => probeYouTubeReels(),
  component: HealthPage,
});

function HealthPage() {
  const data = Route.useLoaderData();
  return <pre>{JSON.stringify(data)}</pre>;
}
