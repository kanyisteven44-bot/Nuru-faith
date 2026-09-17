import { createServerFn } from "@tanstack/react-start";
import type { YouTubeSearchResult, YouTubeVideo } from "./youtube.functions";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isChristianDiscoveryCandidate } from "./reelDiscoveryPolicy";

const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";
const PAGE_SIZE = 50;
// Deep-scan trusted upload playlists cheaply (playlistItems.list costs far less
// quota than search.list). The client still reveals only a tiny batch at a time.
const UPLOAD_PAGES_PER_CHANNEL = 40;
const CACHE_MS = 1000 * 60 * 60 * 6;
const MAX_FEED_RESULTS = 12_000;
const DISCOVERY_RESULTS = 50;
const APPROVED_TO_DISCOVERY_RATIO = 4;
const DETAIL_BATCH_CONCURRENCY = 12;

const FALLBACK_APPROVED_CHANNELS = [
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

type ApprovedChannel = { id: string; name: string };

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

async function fetchUploadsPlaylists(
  key: string,
  approvedChannels: ApprovedChannel[],
): Promise<Map<string, string>> {
  const playlists = new Map<string, string>();
  for (let index = 0; index < approvedChannels.length; index += 50) {
    const batch = approvedChannels.slice(index, index + 50);
    const url = new URL(`${YOUTUBE_API}/channels`);
    url.searchParams.set("part", "contentDetails");
    url.searchParams.set("id", batch.map((channel) => channel.id).join(","));
    url.searchParams.set("maxResults", String(batch.length));
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
    for (const item of json.items ?? []) {
      const uploads = item.contentDetails?.relatedPlaylists?.uploads;
      if (item.id && uploads) playlists.set(item.id, uploads);
    }
  }
  return playlists;
}

async function fetchChristianDiscoveryVideos(key: string): Promise<YouTubeVideo[]> {
  const url = new URL(`${YOUTUBE_API}/search`);
  url.searchParams.set("part", "snippet");
  url.searchParams.set(
    "q",
    "Christian shorts Bible Jesus prayer faith worship testimony encouragement",
  );
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(DISCOVERY_RESULTS));
  url.searchParams.set("safeSearch", "strict");
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("videoDuration", "short");
  url.searchParams.set("relevanceLanguage", "en");
  url.searchParams.set("regionCode", "KE");
  url.searchParams.set("order", "relevance");
  url.searchParams.set("key", key);

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.warn(`[youtube-reels] discovery ${response.status} ${body.slice(0, 240)}`);
    return [];
  }

  const json = (await response.json()) as {
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

  return (json.items ?? [])
    .filter((item) => {
      const id = item.id?.videoId;
      const snippet = item.snippet;
      return Boolean(
        id &&
        snippet?.channelId &&
        isChristianDiscoveryCandidate(snippet.title ?? "", snippet.description ?? ""),
      );
    })
    .map((item) => {
      const id = item.id!.videoId!;
      const snippet = item.snippet!;
      return {
        youtubeVideoId: id,
        title: snippet.title ?? "",
        // Descriptions are useful for discovery filtering, but not for the Reel
        // player. Dropping them keeps a 10k+ feed response materially smaller.
        description: "",
        thumbnail:
          snippet.thumbnails?.high?.url ??
          snippet.thumbnails?.medium?.url ??
          snippet.thumbnails?.default?.url ??
          `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        channelId: snippet.channelId ?? "",
        channelName: snippet.channelTitle ?? "",
        publishedAt: snippet.publishedAt ?? "",
        duration: null,
        source: "youtube" as const,
      };
    });
}

function mixFeed(approved: YouTubeVideo[], discovery: YouTubeVideo[]): YouTubeVideo[] {
  const mixed: YouTubeVideo[] = [];
  let approvedIndex = 0;
  let discoveryIndex = 0;
  while (
    mixed.length < MAX_FEED_RESULTS &&
    (approvedIndex < approved.length || discoveryIndex < discovery.length)
  ) {
    for (
      let count = 0;
      count < APPROVED_TO_DISCOVERY_RATIO && approvedIndex < approved.length;
      count += 1
    ) {
      mixed.push(approved[approvedIndex++]!);
      if (mixed.length === MAX_FEED_RESULTS) return mixed;
    }
    if (discoveryIndex < discovery.length) mixed.push(discovery[discoveryIndex++]!);
    else if (approvedIndex >= approved.length) break;
  }
  return mixed.slice(0, MAX_FEED_RESULTS);
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
        description: "",
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

  // Avoid creating hundreds of simultaneous outbound requests on a cold start.
  // A small bounded pool is substantially friendlier to serverless runtimes and
  // still validates thousands of candidate videos quickly.
  for (let start = 0; start < batches.length; start += DETAIL_BATCH_CONCURRENCY) {
    const window = batches.slice(start, start + DETAIL_BATCH_CONCURRENCY);
    const responses = await Promise.all(
      window.map(async (batch) => {
        const url = new URL(`${YOUTUBE_API}/videos`);
        url.searchParams.set("part", "contentDetails,status");
        url.searchParams.set("id", batch.map((video) => video.youtubeVideoId).join(","));
        url.searchParams.set("key", key);
        const response = await fetch(url.toString(), { cache: "no-store" });
        if (!response.ok)
          return [] as Array<{
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

export const youtubeReelsFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<YouTubeSearchResult> => {
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
      const { data: trustedRows, error: trustedError } = await context.supabase
        .from("approved_youtube_channels")
        .select("channel_id,channel_name,trust_level")
        .in("trust_level", ["official", "verified", "trusted"]);
      const approvedChannels: ApprovedChannel[] =
        !trustedError && trustedRows?.length
          ? trustedRows.map((channel) => ({ id: channel.channel_id, name: channel.channel_name }))
          : FALLBACK_APPROVED_CHANNELS.map((channel) => ({ ...channel }));

      const [uploads, discoveryCandidates] = await Promise.all([
        fetchUploadsPlaylists(key, approvedChannels),
        fetchChristianDiscoveryVideos(key),
      ]);
      const channelResults = await Promise.all(
        approvedChannels.map((channel) => {
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

      const approvedIds = new Set(byId.keys());
      const uniqueDiscovery = discoveryCandidates.filter(
        (video) => !approvedIds.has(video.youtubeVideoId),
      );
      const [approvedVideos, discoveryVideos] = await Promise.all([
        keepPlayableShorts([...byId.values()], key),
        keepPlayableShorts(uniqueDiscovery, key),
      ]);
      approvedVideos.sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
      discoveryVideos.sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));

      const feedVideos = mixFeed(approvedVideos, discoveryVideos);

      const result: YouTubeSearchResult = {
        videos: feedVideos,
        playlists: [],
        channels: [],
        nextPageToken: feedVideos.length > 0 ? "hybrid-christian-feed" : null,
        error: null,
      };
      cachedFeed = result;
      cachedAt = Date.now();
      console.info(
        `[youtube-reels] source=hybrid approved_channels=${approvedChannels.length} candidates=${byId.size} approved_playable=${approvedVideos.length} discovery_playable=${discoveryVideos.length} returned=${feedVideos.length}`,
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
  });