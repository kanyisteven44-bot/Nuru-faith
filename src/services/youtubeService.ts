import { queryOptions } from "@tanstack/react-query";
import { youtubeSearch, youtubeLookup } from "@/lib/youtube.functions";
import { youtubeReelsFeed } from "@/lib/youtubeReels.functions";
import type {
  YouTubeSearchResult,
  YouTubeVideo,
  YouTubePlaylist,
  YouTubeChannel,
} from "@/lib/youtube.functions";

export type { YouTubeSearchResult, YouTubeVideo, YouTubePlaylist, YouTubeChannel };

export type YouTubeQuery = {
  query?: string;
  type?: "video" | "playlist" | "channel";
  maxResults?: number;
  pageToken?: string;
  channelId?: string;
  playlistId?: string;
};

/**
 * React Query options for YouTube metadata.
 * Cached hard (30 min) so scrolling/rerenders never re-spend API quota.
 */
export function youtubeQuery(input: YouTubeQuery) {
  const enabled = Boolean(input.query?.trim() || input.channelId || input.playlistId);
  const isReelsDiscovery =
    input.type === "video" && input.query?.trim().toLowerCase() === "christian short encouragement";

  return queryOptions({
    queryKey: ["youtube", isReelsDiscovery ? "reels-pool-v2" : input],
    queryFn: () =>
      isReelsDiscovery
        ? youtubeReelsFeed()
        : youtubeSearch({ data: { ...input, query: input.query?.trim() } }),
    enabled,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  });
}

export function youtubeLookupQuery(kind: "video" | "playlist" | "channel", id: string) {
  return queryOptions({
    queryKey: ["youtube-lookup", kind, id],
    queryFn: () => youtubeLookup({ data: { kind, id } }),
    enabled: id.length > 2,
    staleTime: 1000 * 60 * 60,
  });
}

/** Extract a YouTube id from a pasted URL (or accept a bare id). */
export function parseYouTubeUrl(
  raw: string,
): { kind: "video" | "playlist" | "channel"; id: string } | null {
  const value = raw.trim();
  if (!value) return null;
  if (!value.includes("/") && !value.includes("?")) {
    if (value.startsWith("UC") && value.length > 20) return { kind: "channel", id: value };
    if (value.startsWith("PL") || value.startsWith("UU")) return { kind: "playlist", id: value };
    return { kind: "video", id: value };
  }
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    const list = url.searchParams.get("list");
    const v = url.searchParams.get("v");
    if (v) return { kind: "video", id: v };
    if (list) return { kind: "playlist", id: list };
    if (url.hostname.endsWith("youtu.be")) return { kind: "video", id: url.pathname.slice(1) };
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "shorts" && parts[1]) return { kind: "video", id: parts[1] };
    if (parts[0] === "embed" && parts[1]) return { kind: "video", id: parts[1] };
    if (parts[0] === "channel" && parts[1]) return { kind: "channel", id: parts[1] };
  } catch {
    return null;
  }
  return null;
}

/** Human-readable message for a failed YouTube call — never breaks the page. */
export function youtubeErrorMessage(error: string | null | undefined): string | null {
  if (!error) return null;
  if (error === "not-configured") return "YouTube discovery isn't switched on yet.";
  if (error === "quota")
    return "Online media is temporarily unavailable — daily YouTube limit reached.";
  if (error === "not-found") return "That YouTube link couldn't be found.";
  return "Online media is temporarily unavailable.";
}
