import { createServerFn } from "@tanstack/react-start";
import type { YouTubeSearchResult, YouTubeVideo } from "./youtube.functions";

const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";
const DISCOVERY_QUERY = "christian shorts bible jesus prayer worship gospel faith";
const SEARCH_PAGES = 24;
const PAGE_SIZE = 50;
const CACHE_MS = 1000 * 60 * 30;

let cachedFeed: YouTubeSearchResult | null = null;
let cachedAt = 0;

function parseDurationSeconds(iso?: string): number | null {
  if (!iso) return null;
  const match = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return null;
  return (
    Number(match[1] ?? 0) * 86400 +
    Number(match[2] ?? 0) * 3600 +
    Number(match[3] ?? 0) * 60 +
    Number(match[4] ?? 0)
  );
}

function formatDuration(seconds: number | null): string | null {
  if (seconds == null) return null;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

async function searchPage(
  key: string,
  pageToken?: string,
): Promise<{ videos: YouTubeVideo[]; nextPageToken: string | null }> {
  const url = new URL(`${YOUTUBE_API}/search`);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", DISCOVERY_QUERY);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(PAGE_SIZE));
  url.searchParams.set("safeSearch", "strict");
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("videoDuration", "short");
  url.searchParams.set("order", "relevance");
  url.searchParams.set("key", key);
  if (pageToken) url.searchParams.set("pageToken", pageToken);

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error(`[youtube-reels] search ${response.status} ${body.slice(0, 400)}`);
    throw new Error(response.status === 403 ? "quota" : "unavailable");
  }

  const json = (await response.json()) as {
    nextPageToken?: string;
    items?: Array<{
      id?: { videoId?: string };
      snippet?: {
        title?: string;
        description?: string;
        channelId?: string;
        channelTitle?: string;
        publishedAt?: string;
        thumbnails?: {
          high?: { url?: string };
          medium?: { url?: string };
          default?: { url?: string };
        };
      };
    }>;
  };

  const videos: YouTubeVideo[] = (json.items ?? [])
    .map((item): YouTubeVideo | null => {
      const id = item.id?.videoId;
      if (!id) return null;
      const snippet = item.snippet;
      return {
        youtubeVideoId: id,
        title: snippet?.title ?? "",
        description: snippet?.description ?? "",
        thumbnail:
          snippet?.thumbnails?.high?.url ??
          snippet?.thumbnails?.medium?.url ??
          snippet?.thumbnails?.default?.url ??
          `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        channelId: snippet?.channelId ?? "",
        channelName: snippet?.channelTitle ?? "YouTube",
        publishedAt: snippet?.publishedAt ?? "",
        duration: null,
        source: "youtube",
      };
    })
    .filter((video): video is YouTubeVideo => video !== null);

  return { videos, nextPageToken: json.nextPageToken ?? null };
}

async function keepPlayableShorts(videos: YouTubeVideo[], key: string): Promise<YouTubeVideo[]> {
  const details = new Map<
    string,
    { duration: number | null; embeddable: boolean; privacyStatus: string }
  >();

  for (let index = 0; index < videos.length; index += 50) {
    const batch = videos.slice(index, index + 50);
    const url = new URL(`${YOUTUBE_API}/videos`);
    url.searchParams.set("part", "contentDetails,status");
    url.searchParams.set("id", batch.map((video) => video.youtubeVideoId).join(","));
    url.searchParams.set("key", key);
    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) continue;

    const json = (await response.json()) as {
      items?: Array<{
        id?: string;
        contentDetails?: { duration?: string };
        status?: { embeddable?: boolean; privacyStatus?: string };
      }>;
    };

    for (const item of json.items ?? []) {
      if (!item.id) continue;
      details.set(item.id, {
        duration: parseDurationSeconds(item.contentDetails?.duration),
        embeddable: item.status?.embeddable === true,
        privacyStatus: item.status?.privacyStatus ?? "",
      });
    }
  }

  return videos
    .filter((video) => {
      const detail = details.get(video.youtubeVideoId);
      return Boolean(
        detail &&
          detail.embeddable &&
          detail.privacyStatus === "public" &&
          detail.duration != null &&
          detail.duration > 0 &&
          detail.duration <= 180,
      );
    })
    .map((video) => ({
      ...video,
      duration: formatDuration(details.get(video.youtubeVideoId)?.duration ?? null),
    }));
}

export const youtubeReelsFeed = createServerFn({ method: "POST" }).handler(
  async (): Promise<YouTubeSearchResult> => {
    if (cachedFeed && Date.now() - cachedAt < CACHE_MS) return cachedFeed;

    const key = process.env["YOUTUBE_API_KEY"];
    if (!key) {
      return {
        videos: [],
        playlists: [],
        channels: [],
        nextPageToken: null,
        error: "not-configured",
      };
    }

    try {
      const byId = new Map<string, YouTubeVideo>();
      let pageToken: string | undefined;

      for (let page = 0; page < SEARCH_PAGES; page += 1) {
        const result = await searchPage(key, pageToken);
        for (const video of result.videos) byId.set(video.youtubeVideoId, video);
        if (!result.nextPageToken) break;
        pageToken = result.nextPageToken;
      }

      const videos = await keepPlayableShorts([...byId.values()], key);
      const result: YouTubeSearchResult = {
        videos,
        playlists: [],
        channels: [],
        nextPageToken: pageToken ?? null,
        error: null,
      };
      cachedFeed = result;
      cachedAt = Date.now();
      console.info(`[youtube-reels] discovered=${byId.size} playable=${videos.length}`);
      return result;
    } catch (error) {
      return {
        videos: [],
        playlists: [],
        channels: [],
        nextPageToken: null,
        error: error instanceof Error ? error.message : "unavailable",
      };
    }
  },
);
