import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { YouTubeSearchResult, YouTubeVideo } from "./youtube.functions";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";
const PAGE_SIZE = 50;
const CHANNELS_PER_REQUEST = 4;
const MIN_RESULTS_PER_REQUEST = 24;
const MAX_GROUPS_PER_REQUEST = 3;
const MAX_PAGES_PER_CHANNEL = 40;
const PAGE_CACHE_MS = 1000 * 60 * 60 * 6;
const MAX_CACHED_PAGES = 160;
const QUOTA_COOLDOWN_MS = 1000 * 60 * 60 * 6;
let quotaCooldownUntil = 0;

/**
 * Stable ordering mixes Bible teaching, church content and worship. The DB is
 * the source of truth; this list is also the fallback when the DB is unavailable.
 */
const FALLBACK_APPROVED_CHANNELS = [
  { id: "UCVfwlh9XpX2Y_tQfjeln9QA", name: "BibleProject" },
  { id: "UCoDt562cJaageYU-LYKt4Pw", name: "Life.Church" },
  { id: "UCQMwm-DeHyFK5VPp6KySR5Q", name: "The Gospel Coalition" },
  { id: "UCFOwIsXQ-MN3MkYIagbfPNw", name: "Spoken Gospel" },
  { id: "UCIQqvZbHSwX0yKNVK1MyYjQ", name: "Elevation Church" },
  { id: "UCUvrv1Ox5rRwzG-SHCN7zrg", name: "Brandon Lake" },
  { id: "UC-XSYe_TuXZX1iIBVbUG7sg", name: "Phil Wickham" },
  { id: "UCeu-nBG7189QmZmiVVE1oUg", name: "Gateway Worship" },
  { id: "UCtCEoFMIllD5aOYneLrP4Vw", name: "The Bible Recap" },
  { id: "UCrHADU8H0P2Q_79sAhYjlGA", name: "Got Questions Ministries" },
  { id: "UCBXOFnNTULFaAnj24PAeblg", name: "The Chosen" },
  { id: "UCkvTYtzvEDc7i0ATeWC-wHg", name: "Saddleback Church" },
  { id: "UCzT4tQfAZEsm_yMql_10dpg", name: "Passion City Church" },
  { id: "UCSf-NCzjwcnXErUBW_qeFvA", name: "Elevation Worship" },
  { id: "UCsTOvGh6rj41bHRkq2ZpIiQ", name: "Worship Together" },
  { id: "UCVxDKSuzQnPZ4Z-0wPYTiwg", name: "Sovereign Grace Music" },
  { id: "UCPJFvbf8tNE9-_aYgeXfdKA", name: "Lauren Daigle" },
  { id: "UCeqMRt_qlZOAfQ_fDxc0D4g", name: "for KING + COUNTRY" },
  { id: "UCcKxZzWKezUfFMsAUSiMY8A", name: "DonMoenTV" },
  { id: "UCSYGkbzVd5-EzAMEpf3EaGg", name: "Hillsong Church" },
  { id: "UC4q12NoPNySbVqwpw4iO5Vg", name: "Hillsong Worship" },
  { id: "UCsOoQeBWPnfWBYAwmO795zg", name: "Hillsong UNITED" },
  { id: "UCbertc-gMbkkHuSmg0qwnxw", name: "Bethel Music" },
  { id: "UCp7yiXtvaB3UmVMDEelFgWA", name: "WorshipU by Bethel Music" },
  { id: "UCXttfHaCtBRik2vCKmz2D8w", name: "Maverick City Music" },
  { id: "UCE8tXEgcltIcPvjFBWS5UXQ", name: "Joyous Celebration" },
  { id: "UCp0dT8yDEAVe2LVjP9QFwjw", name: "Spirit Of Praise" },
  { id: "UCn9mRGNo0CYj7nE6MepnWOQ", name: "Mercy Masika" },
  { id: "UCw5d9msTsAVx7DIk6vaFrfQ", name: "Kambua" },
] as const;

type ApprovedChannel = { id: string; name: string };
type FeedCursor = {
  v: 1;
  nextIndex: number;
  tokens: Record<string, string>;
  pages: Record<string, number>;
  exhausted: string[];
};
type PlayablePage = { videos: YouTubeVideo[]; nextPageToken: string | null };
type CachedPage = { at: number; value: PlayablePage };

type VideoDetail = {
  duration: number | null;
  embeddable: boolean;
  privacyStatus: string;
};

const pageCache = new Map<string, CachedPage>();

const feedInput = z.object({
  cursor: z.string().max(16_000).nullable().optional(),
});

function initialCursor(): FeedCursor {
  return { v: 1, nextIndex: 0, tokens: {}, pages: {}, exhausted: [] };
}

function decodeCursor(raw?: string | null): FeedCursor {
  if (!raw) return initialCursor();
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<FeedCursor>;
    if (parsed.v !== 1) return initialCursor();

    const tokens: Record<string, string> = {};
    if (parsed.tokens && typeof parsed.tokens === "object") {
      for (const [key, value] of Object.entries(parsed.tokens)) {
        if (typeof value === "string") tokens[key] = value;
      }
    }

    const pages: Record<string, number> = {};
    if (parsed.pages && typeof parsed.pages === "object") {
      for (const [key, value] of Object.entries(parsed.pages)) {
        if (typeof value === "number" && Number.isFinite(value)) {
          pages[key] = Math.max(0, Math.min(MAX_PAGES_PER_CHANNEL, value));
        }
      }
    }

    return {
      v: 1,
      nextIndex: Number.isFinite(parsed.nextIndex) ? Math.max(0, Number(parsed.nextIndex)) : 0,
      tokens,
      pages,
      exhausted: Array.isArray(parsed.exhausted)
        ? parsed.exhausted.filter((value): value is string => typeof value === "string")
        : [],
    };
  } catch {
    return initialCursor();
  }
}

function encodeCursor(cursor: FeedCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

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

function uploadsPlaylistId(channelId: string): string {
  return channelId.startsWith("UC") ? `UU${channelId.slice(2)}` : channelId;
}

function cacheKey(channelId: string, token?: string): string {
  return `${channelId}:${token ?? "first"}`;
}

function putCachedPage(key: string, value: PlayablePage): void {
  pageCache.set(key, { at: Date.now(), value });
  while (pageCache.size > MAX_CACHED_PAGES) {
    const oldestKey = pageCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    pageCache.delete(oldestKey);
  }
}
const RSS_CHANNELS_PER_REQUEST = 8;
const RSS_VIDEOS_PER_CHANNEL = 3;

function decodeXmlText(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function xmlTag(block: string, tag: string): string {
  const safeTag = tag.replace(":", "\\:");
  const match = new RegExp("<" + safeTag + "[^>]*>([\\s\\S]*?)<\\/" + safeTag + ">", "i").exec(block);
  return match ? decodeXmlText(match[1] ?? "") : "";
}

/**
 * Public YouTube Atom feeds give Nuru a no-key fallback when Data API
 * configuration or quota is unavailable. Playback still stays on YouTube.
 */
async function fetchRssFallback(channels: ApprovedChannel[]): Promise<YouTubeVideo[]> {
  const selected = channels.slice(0, RSS_CHANNELS_PER_REQUEST);
  const pages = await Promise.all(
    selected.map(async (channel) => {
      try {
        const response = await fetch(
          `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channel.id)}`,
          { cache: "no-store" },
        );
        if (!response.ok) return [] as YouTubeVideo[];
        const xml = await response.text();
        const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)]
          .slice(0, RSS_VIDEOS_PER_CHANNEL)
          .map((match) => match[1] ?? "");

        return entries
          .map((entry): YouTubeVideo | null => {
            const id = xmlTag(entry, "yt:videoId");
            if (!id) return null;
            const title = xmlTag(entry, "title") || "YouTube video";
            const publishedAt = xmlTag(entry, "published");
            return {
              youtubeVideoId: id,
              title,
              description: "",
              thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
              channelId: channel.id,
              channelName: channel.name,
              publishedAt,
              duration: null,
              source: "youtube",
            };
          })
          .filter((video): video is YouTubeVideo => video !== null);
      } catch {
        return [] as YouTubeVideo[];
      }
    }),
  );

  const deduped = new Map<string, YouTubeVideo>();
  for (const video of pages.flat()) deduped.set(video.youtubeVideoId, video);
  return [...deduped.values()].sort((a, b) =>
    (b.publishedAt || "").localeCompare(a.publishedAt || ""),
  );
}

async function fetchPlayableUploadPage(
  key: string,
  channel: ApprovedChannel,
  pageToken?: string,
): Promise<PlayablePage> {
  if (Date.now() < quotaCooldownUntil) throw new Error("quota");

  const pageKey = cacheKey(channel.id, pageToken);
  const cached = pageCache.get(pageKey);
  if (cached && Date.now() - cached.at < PAGE_CACHE_MS) return cached.value;

  const playlistUrl = new URL(`${YOUTUBE_API}/playlistItems`);
  playlistUrl.searchParams.set("part", "snippet,contentDetails");
  playlistUrl.searchParams.set("playlistId", uploadsPlaylistId(channel.id));
  playlistUrl.searchParams.set("maxResults", String(PAGE_SIZE));
  playlistUrl.searchParams.set("key", key);
  if (pageToken) playlistUrl.searchParams.set("pageToken", pageToken);

  const playlistResponse = await fetch(playlistUrl.toString(), { cache: "no-store" });
  if (!playlistResponse.ok) {
    const body = await playlistResponse.text().catch(() => "");
    if (playlistResponse.status === 403 || playlistResponse.status === 429) {
      quotaCooldownUntil = Date.now() + QUOTA_COOLDOWN_MS;
      console.warn(`[youtube-reels] quota unavailable; pausing API calls for 6h (${playlistResponse.status})`);
      throw new Error("quota");
    }
    console.warn(
      `[youtube-reels] playlist ${channel.id} unavailable (${playlistResponse.status}) ${body.slice(0, 180)}`,
    );
    return { videos: [], nextPageToken: null };
  }

  const playlist = (await playlistResponse.json()) as {
    nextPageToken?: string;
    items?: Array<{
      contentDetails?: { videoId?: string };
      snippet?: {
        title?: string;
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

  const candidates: YouTubeVideo[] = [];
  for (const item of playlist.items ?? []) {
    const id = item.contentDetails?.videoId;
    if (!id) continue;
    const snippet = item.snippet;
    candidates.push({
      youtubeVideoId: id,
      title: snippet?.title ?? "",
      description: "",
      thumbnail:
        snippet?.thumbnails?.high?.url ??
        snippet?.thumbnails?.medium?.url ??
        snippet?.thumbnails?.default?.url ??
        `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      channelId: channel.id,
      channelName: snippet?.channelTitle ?? channel.name,
      publishedAt: snippet?.publishedAt ?? "",
      duration: null,
      source: "youtube",
    });
  }

  if (candidates.length === 0) {
    const value: PlayablePage = {
      videos: [],
      nextPageToken: playlist.nextPageToken ?? null,
    };
    putCachedPage(pageKey, value);
    return value;
  }

  const detailsUrl = new URL(`${YOUTUBE_API}/videos`);
  detailsUrl.searchParams.set("part", "contentDetails,status");
  detailsUrl.searchParams.set("id", candidates.map((video) => video.youtubeVideoId).join(","));
  detailsUrl.searchParams.set("key", key);

  const detailsResponse = await fetch(detailsUrl.toString(), { cache: "no-store" });
  if (!detailsResponse.ok) {
    if (detailsResponse.status === 403 || detailsResponse.status === 429) {
      quotaCooldownUntil = Date.now() + QUOTA_COOLDOWN_MS;
      console.warn(
        `[youtube-reels] quota unavailable; pausing API calls for 6h (${detailsResponse.status})`,
      );
      throw new Error("quota");
    }
    return { videos: [], nextPageToken: playlist.nextPageToken ?? null };
  }

  const detailsJson = (await detailsResponse.json()) as {
    items?: Array<{
      id?: string;
      contentDetails?: { duration?: string };
      status?: { embeddable?: boolean; privacyStatus?: string };
    }>;
  };

  const details = new Map<string, VideoDetail>();
  for (const item of detailsJson.items ?? []) {
    if (!item.id) continue;
    details.set(item.id, {
      duration: parseDurationSeconds(item.contentDetails?.duration),
      embeddable: item.status?.embeddable === true,
      privacyStatus: item.status?.privacyStatus ?? "",
    });
  }

  const videos: YouTubeVideo[] = [];
  for (const video of candidates) {
    const detail = details.get(video.youtubeVideoId);
    if (
      !detail ||
      !detail.embeddable ||
      detail.privacyStatus !== "public" ||
      detail.duration == null ||
      detail.duration <= 0 ||
      detail.duration > 180
    ) {
      continue;
    }
    videos.push({ ...video, duration: formatDuration(detail.duration) });
  }

  const value: PlayablePage = {
    videos,
    nextPageToken: playlist.nextPageToken ?? null,
  };
  putCachedPage(pageKey, value);
  return value;
}

function orderedApprovedChannels(rows: ApprovedChannel[]): ApprovedChannel[] {
  const priority = new Map<string, number>(
    FALLBACK_APPROVED_CHANNELS.map((channel, index) => [channel.id, index]),
  );
  return [...rows].sort((a, b) => {
    const aRank = priority.get(a.id) ?? 10_000;
    const bRank = priority.get(b.id) ?? 10_000;
    return aRank - bRank || a.id.localeCompare(b.id);
  });
}

function selectChannels(
  channels: ApprovedChannel[],
  cursor: FeedCursor,
  exhausted: Set<string>,
): Array<{ channel: ApprovedChannel; index: number }> {
  if (channels.length === 0) return [];
  const selected: Array<{ channel: ApprovedChannel; index: number }> = [];
  let scanned = 0;
  let index = cursor.nextIndex % channels.length;

  while (scanned < channels.length && selected.length < CHANNELS_PER_REQUEST) {
    const channel = channels[index]!;
    const pages = cursor.pages[channel.id] ?? 0;
    if (!exhausted.has(channel.id) && pages < MAX_PAGES_PER_CHANNEL) {
      selected.push({ channel, index });
    } else {
      exhausted.add(channel.id);
    }
    index = (index + 1) % channels.length;
    scanned += 1;
  }

  return selected;
}

export const youtubeReelsFeed = createServerFn({ method: "GET" })
  .validator(feedInput)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<YouTubeSearchResult> => {
    const key = process.env["YOUTUBE_API_KEY"];
    if (!key) {
      const videos = await fetchRssFallback(
        FALLBACK_APPROVED_CHANNELS.map((channel) => ({ ...channel })),
      );
      return {
        videos,
        playlists: [],
        channels: [],
        nextPageToken: null,
        error: videos.length ? null : "not-configured",
      };
    }

    try {
      const { data: trustedRows, error: trustedError } = await context.supabase
        .from("approved_youtube_channels")
        .select("channel_id,channel_name,trust_level")
        .in("trust_level", ["official", "verified", "trusted"]);

      const approvedChannels = orderedApprovedChannels(
        !trustedError && trustedRows?.length
          ? trustedRows.map((channel) => ({ id: channel.channel_id, name: channel.channel_name }))
          : FALLBACK_APPROVED_CHANNELS.map((channel) => ({ ...channel })),
      );

      const cursor = decodeCursor(data.cursor);
      if (approvedChannels.length === 0) {
        return { videos: [], playlists: [], channels: [], nextPageToken: null, error: null };
      }

      cursor.nextIndex %= approvedChannels.length;
      const exhausted = new Set<string>(cursor.exhausted);
      const byId = new Map<string, YouTubeVideo>();
      let groups = 0;

      while (groups < MAX_GROUPS_PER_REQUEST && byId.size < MIN_RESULTS_PER_REQUEST) {
        const selected = selectChannels(approvedChannels, cursor, exhausted);
        if (selected.length === 0) break;

        const pages = await Promise.all(
          selected.map(async ({ channel }) => ({
            channel,
            page: await fetchPlayableUploadPage(key, channel, cursor.tokens[channel.id]),
          })),
        );

        for (const { channel, page } of pages) {
          const nextCount = (cursor.pages[channel.id] ?? 0) + 1;
          cursor.pages[channel.id] = nextCount;
          if (page.nextPageToken && nextCount < MAX_PAGES_PER_CHANNEL) {
            cursor.tokens[channel.id] = page.nextPageToken;
          } else {
            delete cursor.tokens[channel.id];
            exhausted.add(channel.id);
          }
          for (const video of page.videos) byId.set(video.youtubeVideoId, video);
        }

        const last = selected[selected.length - 1]!;
        cursor.nextIndex = (last.index + 1) % approvedChannels.length;
        groups += 1;
      }

      cursor.exhausted = [...exhausted];
      const hasMore = approvedChannels.some(
        (channel) =>
          !exhausted.has(channel.id) && (cursor.pages[channel.id] ?? 0) < MAX_PAGES_PER_CHANNEL,
      );
      const videos = [...byId.values()].sort((a, b) =>
        (b.publishedAt || "").localeCompare(a.publishedAt || ""),
      );

      console.info(
        `[youtube-reels] source=paged-trusted trusted_channels=${approvedChannels.length} groups=${groups} returned=${videos.length} exhausted=${exhausted.size}`,
      );

      return {
        videos,
        playlists: [],
        channels: [],
        nextPageToken: hasMore ? encodeCursor(cursor) : null,
        error: null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "unavailable";
      if (message === "quota")
        console.warn("[youtube-reels] Data API quota unavailable; using RSS fallback");
      else console.error("[youtube-reels] Data API feed failed; using RSS fallback", error);

      const videos = await fetchRssFallback(
        FALLBACK_APPROVED_CHANNELS.map((channel) => ({ ...channel })),
      );
      return {
        videos,
        playlists: [],
        channels: [],
        nextPageToken: null,
        error: videos.length ? null : message,
      };
    }
  });
