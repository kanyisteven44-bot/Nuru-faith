import { createServerFn } from "@tanstack/react-start";
import type { YouTubeSearchResult, YouTubeVideo } from "./youtube.functions";

const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";
const PAGE_SIZE = 50;
const UPLOAD_PAGES_PER_CHANNEL = 4;
const CACHE_MS = 1000 * 60 * 30;

const APPROVED_CHANNELS = [
  { id: "UCVfwlh9XpX2Y_tQfjeln9QA", name: "BibleProject" },
  { id: "UCIQqvZbHSwX0yKNVK1MyYjQ", name: "Elevation Church" },
  { id: "UCSYGkbzVd5-EzAMEpf3EaGg", name: "Hillsong Church" },
  { id: "UC4q12NoPNySbVqwpw4iO5Vg", name: "Hillsong Worship" },
  { id: "UCsOoQeBWPnfWBYAwmO795zg", name: "Hillsong UNITED" },
  { id: "UCSf-NCzjwcnXErUBW_qeFvA", name: "Elevation Worship" },
  { id: "UCbertc-gMbkkHuSmg0qwnxw", name: "Bethel Music" },
  { id: "UCp7yiXtvaB3UmVMDEelFgWA", name: "WorshipU by Bethel Music" },
  { id: "UCXttfHaCtBRik2vCKmz2D8w", name: "Maverick City Music" },
  { id: "UCE8tXEgcltIcPvjFBWS5UXQ", name: "Joyous Celebration" },
  { id: "UCp0dT8yDEAVe2LVjP9QFwjw", name: "Spirit Of Praise" },
  { id: "UCn9mRGNo0CYj7nE6MepnWOQ", name: "Mercy Masika" },
  { id: "UCw5d9msTsAVx7DIk6vaFrfQ", name: "Kambua" },
] as const;

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

async function fetchUploadsPlaylists(key: string): Promise<Map<string, string>> {
  const url = new URL(`${YOUTUBE_API}/channels`);
  url.searchParams.set("part", "contentDetails");
  url.searchParams.set("id", APPROVED_CHANNELS.map((channel) => channel.id).join(","));
  url.searchParams.set("maxResults", String(APPROVED_CHANNELS.length));
  url.searchParams.set("key", key);

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error(`[youtube-reels] channels ${response.status} ${body.slice(0, 400)}`);
    throw new Error(response.status === 403 || response.status === 429 ? "quota" : "unavailable");
  }

  const json = (await response.json()) as {
    items?: Array<{
      id?: string;
      contentDetails?: { relatedPlaylists?: { uploads?: string } };
    }>;
  };

  const playlists = new Map<string, string>();
  for (const item of json.items ?? []) {
    const uploads = item.contentDetails?.relatedPlaylists?.uploads;
    if (item.id && uploads) playlists.set(item.id, uploads);
  }
  return playlists;
}

async function fetchUploadVideos(
  key: string,
  channelId: string,
  channelName: string,
  playlistId: string,
): Promise<YouTubeVideo[]> {
  const videos: YouTubeVideo[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < UPLOAD_PAGES_PER_CHANNEL; page += 1) {
    const url = new URL(`${YOUTUBE_API}/playlistItems`);
    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("maxResults", String(PAGE_SIZE));
    url.searchParams.set("key", key);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.warn(
        `[youtube-reels] playlist ${playlistId} ${response.status} ${body.slice(0, 240)}`,
      );
      break;
    }

    const json = (await response.json()) as {
      nextPageToken?: string;
      items?: Array<{
        contentDetails?: { videoId?: string };
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

    for (const item of json.items ?? []) {
      const id = item.contentDetails?.videoId;
      if (!id) continue;
      const snippet = item.snippet;
      videos.push({
        youtubeVideoId: id,
        title: snippet?.title ?? "",
        description: snippet?.description ?? "",
        thumbnail:
          snippet?.thumbnails?.high?.url ??
          snippet?.thumbnails?.medium?.url ??
          snippet?.thumbnails?.default?.url ??
          `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        channelId: snippet?.channelId ?? channelId,
        channelName: snippet?.channelTitle ?? channelName,
        publishedAt: snippet?.publishedAt ?? "",
        duration: null,
        source: "youtube",
      });
    }

    if (!json.nextPageToken) break;
    pageToken = json.nextPageToken;
  }

  return videos;
}

async function keepPlayableShorts(videos: YouTubeVideo[], key: string): Promise<YouTubeVideo[]> {
  const details = new Map<
    string,
    { duration: number | null; embeddable: boolean; privacyStatus: string }
  >();

  const batches: YouTubeVideo[][] = [];
  for (let index = 0; index < videos.length; index += 50) {
    batches.push(videos.slice(index, index + 50));
  }

  const responses = await Promise.all(
    batches.map(async (batch) => {
      const url = new URL(`${YOUTUBE_API}/videos`);
      url.searchParams.set("part", "contentDetails,status");
      url.searchParams.set("id", batch.map((video) => video.youtubeVideoId).join(","));
      url.searchParams.set("key", key);
      const response = await fetch(url.toString(), { cache: "no-store" });
      if (!response.ok) return [] as Array<{
        id?: string;
        contentDetails?: { duration?: string };
        status?: { embeddable?: boolean; privacyStatus?: string };
      }>;
      const json = (await response.json()) as {
        items?: Array<{
          id?: string;
          contentDetails?: { duration?: string };
          status?: { embeddable?: boolean; privacyStatus?: string };
        }>;
      };
      return json.items ?? [];
    }),
  );

  for (const items of responses) {
    for (const item of items) {
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

export const youtubeReelsFeed = createServerFn({ method: "GET" }).handler(
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
      const uploads = await fetchUploadsPlaylists(key);
      const channelResults = await Promise.all(
        APPROVED_CHANNELS.map((channel) => {
          const playlistId = uploads.get(channel.id);
          return playlistId
            ? fetchUploadVideos(key, channel.id, channel.name, playlistId)
            : Promise.resolve([] as YouTubeVideo[]);
        }),
      );

      const byId = new Map<string, YouTubeVideo>();
      for (const channelVideos of channelResults) {
        for (const video of channelVideos) byId.set(video.youtubeVideoId, video);
      }

      const videos = await keepPlayableShorts([...byId.values()], key);
      videos.sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));

      const result: YouTubeSearchResult = {
        videos,
        playlists: [],
        channels: [],
        nextPageToken: videos.length > 0 ? "approved-uploads" : null,
        error: null,
      };
      cachedFeed = result;
      cachedAt = Date.now();
      console.info(
        `[youtube-reels] source=approved-uploads discovered=${byId.size} playable=${videos.length}`,
      );
      return result;
    } catch (error) {
      console.error("[youtube-reels] feed failed", error);
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
