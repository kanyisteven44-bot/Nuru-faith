import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { YouTubeSearchResult, YouTubeVideo } from "./youtube.functions";

const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";
const RSS_BASE = "https://www.youtube.com/feeds/videos.xml?channel_id=";

function decodeXml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function tag(entry: string, name: string): string {
  const match = entry.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match ? decodeXml(match[1]!.replace(/<!\[CDATA\[|\]\]>/g, "").trim()) : "";
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

async function fetchChannelFeed(channelId: string): Promise<YouTubeVideo[]> {
  const response = await fetch(`${RSS_BASE}${encodeURIComponent(channelId)}`, {
    headers: { "user-agent": "NuruFaith/1.0" },
  });
  if (!response.ok) return [];
  const xml = await response.text();
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];

  return entries
    .map((entry): YouTubeVideo | null => {
      const youtubeVideoId = tag(entry, "yt:videoId");
      if (!youtubeVideoId) return null;
      const channelName = tag(entry, "name") || tag(entry, "author");
      return {
        youtubeVideoId,
        title: tag(entry, "title"),
        description: "",
        thumbnail: `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`,
        channelId,
        channelName,
        publishedAt: tag(entry, "published"),
        duration: null,
        source: "youtube",
      };
    })
    .filter((video): video is YouTubeVideo => video !== null);
}

async function keepPlayableShorts(videos: YouTubeVideo[], key: string): Promise<YouTubeVideo[]> {
  const details = new Map<string, { duration: number | null; embeddable: boolean; privacyStatus: string }>();

  for (let i = 0; i < videos.length; i += 50) {
    const batch = videos.slice(i, i + 50);
    const url = new URL(`${YOUTUBE_API}/videos`);
    url.searchParams.set("part", "contentDetails,status");
    url.searchParams.set("id", batch.map((video) => video.youtubeVideoId).join(","));
    url.searchParams.set("key", key);
    const response = await fetch(url.toString());
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

/**
 * Build a large Reels pool from every approved YouTube channel.
 * Channel RSS feeds are quota-free; the Data API is only used in cheap batched
 * videos.list calls to verify that each candidate is public, embeddable and <=3 minutes.
 */
export const youtubeReelsFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<YouTubeSearchResult> => {
    const { data: approved, error } = await context.supabase
      .from("approved_youtube_channels")
      .select("channel_id,channel_name,trust_level,is_verified")
      .eq("is_verified", true);

    if (error) return { videos: [], playlists: [], channels: [], nextPageToken: null, error: "trust-unavailable" };

    const channels = (approved ?? []).filter((channel) =>
      ["official", "verified", "trusted"].includes(channel.trust_level ?? ""),
    );

    const pages = await Promise.all(channels.map((channel) => fetchChannelFeed(channel.channel_id)));
    const byId = new Map<string, YouTubeVideo>();
    for (const page of pages) {
      for (const video of page) byId.set(video.youtubeVideoId, video);
    }

    let videos = [...byId.values()];
    const key = process.env["YOUTUBE_API_KEY"];
    if (key) videos = await keepPlayableShorts(videos, key);
    else videos = videos.filter((video) => /#shorts?\b|\bshorts?\b/i.test(video.title));

    videos.sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));

    return {
      videos,
      playlists: [],
      channels: [],
      nextPageToken: null,
      error: null,
    };
  });
