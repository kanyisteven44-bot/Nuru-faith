import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { faithSearch, trustedChannel, trustRank } from "./content-policy";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * YouTube Data API v3 access.
 *
 * Compliance rules baked in here:
 * - we only ever request METADATA (search, videos, playlists, channels)
 * - we never proxy, download or transcode media; playback happens in the
 *   official YouTube IFrame player on the client
 * - the API key stays server-side and is never returned to the browser
 */

const API = "https://www.googleapis.com/youtube/v3";

export type YouTubeVideo = {
  youtubeVideoId: string;
  title: string;
  description: string;
  thumbnail: string;
  channelId: string;
  channelName: string;
  publishedAt: string;
  duration: string | null;
  source: "youtube";
};

export type YouTubePlaylist = {
  youtubePlaylistId: string;
  title: string;
  description: string;
  thumbnail: string;
  channelId: string;
  channelName: string;
  itemCount: number | null;
  source: "youtube";
};

export type YouTubeChannel = {
  youtubeChannelId: string;
  title: string;
  description: string;
  thumbnail: string;
  subscriberCount: string | null;
  source: "youtube";
};

export type YouTubeSearchResult = {
  videos: YouTubeVideo[];
  playlists: YouTubePlaylist[];
  channels: YouTubeChannel[];
  nextPageToken: string | null;
  /** Set when YouTube is unreachable / quota exhausted. UI falls back gracefully. */
  error: string | null;
};

const searchInput = z.object({
  query: z.string().trim().max(120).optional(),
  type: z.enum(["video", "playlist", "channel"]).default("video"),
  maxResults: z.number().int().min(1).max(25).default(12),
  pageToken: z.string().max(200).optional(),
  channelId: z.string().max(64).optional(),
  playlistId: z.string().max(64).optional(),
});

const thumbnailSchema = z.object({ url: z.string() });
const snippetSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  channelId: z.string().optional(),
  channelTitle: z.string().optional(),
  publishedAt: z.string().optional(),
  videoOwnerChannelId: z.string().optional(),
  videoOwnerChannelTitle: z.string().optional(),
  thumbnails: z
    .object({
      high: thumbnailSchema.optional(),
      medium: thumbnailSchema.optional(),
      default: thumbnailSchema.optional(),
    })
    .optional(),
});
const responseSchema = z.object({
  nextPageToken: z.string().optional(),
  items: z
    .array(
      z
        .object({
          id: z
            .union([
              z.string(),
              z.object({
                videoId: z.string().optional(),
                playlistId: z.string().optional(),
                channelId: z.string().optional(),
              }),
            ])
            .optional(),
          snippet: snippetSchema.optional(),
          contentDetails: z
            .object({
              videoId: z.string().optional(),
              duration: z.string().optional(),
              itemCount: z.number().optional(),
            })
            .optional(),
          statistics: z.object({ subscriberCount: z.string().optional() }).optional(),
        })
        .transform((item) => ({
          ...item,
          id: typeof item.id === "string" ? item.id : "",
          searchId: typeof item.id === "object" ? item.id : {},
        })),
    )
    .default([]),
});

function thumbOf(snippet: z.infer<typeof snippetSchema> | undefined): string {
  const t = snippet?.thumbnails ?? {};
  return t.high?.url ?? t.medium?.url ?? t.default?.url ?? "";
}

/** ISO-8601 (PT4M13S) -> 4:13 */
function readableDuration(iso?: string | null): string | null {
  if (!iso) return null;
  const m = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return null;
  const [, d, h, min, s] = m.map((v) => (v ? Number(v) : 0)) as unknown as number[];
  const hours = (d ?? 0) * 24 + (h ?? 0);
  const mm = min ?? 0;
  const ss = s ?? 0;
  return hours > 0
    ? `${hours}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
    : `${mm}:${String(ss).padStart(2, "0")}`;
}

async function call(path: string, params: Record<string, string | undefined>, key: string) {
  const url = new URL(`${API}/${path}`);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  url.searchParams.set("key", key);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[youtube] ${path} ${res.status} ${body.slice(0, 400)}`);
    throw new Error(res.status === 403 ? "quota" : "unavailable");
  }
  return responseSchema.parse(await res.json());
}

function emptyResult(error: string | null = null): YouTubeSearchResult {
  return { videos: [], playlists: [], channels: [], nextPageToken: null, error };
}

/** Search / browse YouTube metadata. Returns normalized Nuru Faith shapes. */
export const youtubeSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => searchInput.parse(data))
  .handler(async ({ data, context }): Promise<YouTubeSearchResult> => {
    const key = process.env["YOUTUBE_API_KEY"];
    if (!key) return emptyResult("not-configured");
    async function filterTrusted(result: YouTubeSearchResult): Promise<YouTubeSearchResult> {
      const ids = [
        ...new Set([
          ...result.videos.map((v) => v.channelId),
          ...result.playlists.map((p) => p.channelId),
          ...result.channels.map((c) => c.youtubeChannelId),
        ]),
      ].filter(Boolean);
      if (!ids.length) return { ...result, videos: [], playlists: [], channels: [] };
      const [channels, sources] = await Promise.all([
        context.supabase
          .from("approved_youtube_channels")
          .select("channel_id,trust_level")
          .in("channel_id", ids),
        context.supabase
          .from("media_sources")
          .select("youtube_channel_id,is_verified")
          .eq("is_approved", true)
          .in("youtube_channel_id", ids),
      ]);
      if (channels.error || sources.error) throw new Error("trust-unavailable");
      const levels = new Map((channels.data ?? []).map((c) => [c.channel_id, c.trust_level]));
      for (const source of sources.data ?? []) {
        if (source.youtube_channel_id && !levels.has(source.youtube_channel_id))
          levels.set(source.youtube_channel_id, source.is_verified ? "verified" : "trusted");
      }
      const rank = (id: string) => trustRank(levels.get(id) ?? "blocked");
      return {
        ...result,
        videos: result.videos
          .filter((v) => trustedChannel(levels.get(v.channelId)))
          .sort((a, b) => rank(a.channelId) - rank(b.channelId)),
        playlists: result.playlists
          .filter((p) => trustedChannel(levels.get(p.channelId)))
          .sort((a, b) => rank(a.channelId) - rank(b.channelId)),
        channels: result.channels
          .filter((c) => trustedChannel(levels.get(c.youtubeChannelId)))
          .sort((a, b) => rank(a.youtubeChannelId) - rank(b.youtubeChannelId)),
      };
    }

    try {
      // Browsing a specific playlist's contents
      if (data.playlistId) {
        const json = await call(
          "playlistItems",
          {
            part: "snippet,contentDetails",
            playlistId: data.playlistId,
            maxResults: String(data.maxResults),
            pageToken: data.pageToken,
          },
          key,
        );
        const videos: YouTubeVideo[] = (json.items ?? [])
          .filter((i) => i.contentDetails?.videoId)
          .map((i) => ({
            youtubeVideoId: i.contentDetails?.videoId ?? "",
            title: i.snippet?.title ?? "",
            description: i.snippet?.description ?? "",
            thumbnail: thumbOf(i.snippet),
            channelId: i.snippet?.videoOwnerChannelId ?? "",
            channelName: i.snippet?.videoOwnerChannelTitle ?? i.snippet?.channelTitle ?? "",
            publishedAt: i.snippet?.publishedAt ?? "",
            duration: null,
            source: "youtube" as const,
          }));
        return await filterTrusted({
          ...emptyResult(),
          videos,
          nextPageToken: json.nextPageToken ?? null,
        });
      }

      const json = await call(
        "search",
        {
          part: "snippet",
          q: faithSearch(data.query ?? ""),
          type: data.type,
          channelId: data.channelId,
          maxResults: String(data.maxResults),
          pageToken: data.pageToken,
          safeSearch: "strict",
          order: data.query ? "relevance" : "date",
          videoEmbeddable: data.type === "video" ? "true" : undefined,
        },
        key,
      );

      const items = json.items ?? [];
      const result = emptyResult();
      result.nextPageToken = json.nextPageToken ?? null;

      result.videos = items
        .filter((i) => i.searchId?.videoId)
        .map((i) => ({
          youtubeVideoId: i.searchId.videoId ?? "",
          title: i.snippet?.title ?? "",
          description: i.snippet?.description ?? "",
          thumbnail: thumbOf(i.snippet),
          channelId: i.snippet?.channelId ?? "",
          channelName: i.snippet?.channelTitle ?? "",
          publishedAt: i.snippet?.publishedAt ?? "",
          duration: null,
          source: "youtube" as const,
        }));

      result.playlists = items
        .filter((i) => i.searchId?.playlistId)
        .map((i) => ({
          youtubePlaylistId: i.searchId.playlistId ?? "",
          title: i.snippet?.title ?? "",
          description: i.snippet?.description ?? "",
          thumbnail: thumbOf(i.snippet),
          channelId: i.snippet?.channelId ?? "",
          channelName: i.snippet?.channelTitle ?? "",
          itemCount: null,
          source: "youtube" as const,
        }));

      result.channels = items
        .filter((i) => i.searchId?.channelId && !i.searchId?.videoId && !i.searchId?.playlistId)
        .map((i) => ({
          youtubeChannelId: i.searchId.channelId ?? "",
          title: i.snippet?.title ?? "",
          description: i.snippet?.description ?? "",
          thumbnail: thumbOf(i.snippet),
          subscriberCount: null,
          source: "youtube" as const,
        }));

      // One extra call fills in durations for the video results.
      if (result.videos.length > 0) {
        try {
          const details = await call(
            "videos",
            { part: "contentDetails", id: result.videos.map((v) => v.youtubeVideoId).join(",") },
            key,
          );
          const byId = new Map<string, string | undefined>(
            (details.items ?? []).map((i) => [i.id, i.contentDetails?.duration]),
          );
          result.videos = result.videos.map((v) => ({
            ...v,
            duration: readableDuration(byId.get(v.youtubeVideoId)),
          }));
        } catch {
          /* durations are optional */
        }
      }

      return await filterTrusted(result);
    } catch (err) {
      return emptyResult(err instanceof Error ? err.message : "unavailable");
    }
  });

/** Look up one video / playlist / channel — used by admins pasting a YouTube URL. */
export const youtubeLookup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        kind: z.enum(["video", "playlist", "channel"]),
        id: z.string().trim().min(3).max(64),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: roles, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (
      roleError ||
      !roles?.some((r) => ["super_admin", "moderator", "church_admin"].includes(r.role))
    )
      throw new Error("Media management access required");
    const key = process.env["YOUTUBE_API_KEY"];
    if (!key) return { item: null, error: "not-configured" as const };

    try {
      if (data.kind === "video") {
        const json = await call("videos", { part: "snippet,contentDetails", id: data.id }, key);
        const i = json.items?.[0];
        if (!i) return { item: null, error: "not-found" as const };
        return {
          error: null,
          item: {
            youtubeVideoId: i.id,
            title: i.snippet?.title ?? "",
            description: i.snippet?.description ?? "",
            thumbnail: thumbOf(i.snippet),
            channelId: i.snippet?.channelId ?? "",
            channelName: i.snippet?.channelTitle ?? "",
            publishedAt: i.snippet?.publishedAt ?? "",
            duration: readableDuration(i.contentDetails?.duration),
            source: "youtube" as const,
          },
        };
      }
      if (data.kind === "playlist") {
        const json = await call("playlists", { part: "snippet,contentDetails", id: data.id }, key);
        const i = json.items?.[0];
        if (!i) return { item: null, error: "not-found" as const };
        return {
          error: null,
          item: {
            youtubePlaylistId: i.id,
            title: i.snippet?.title ?? "",
            description: i.snippet?.description ?? "",
            thumbnail: thumbOf(i.snippet),
            channelId: i.snippet?.channelId ?? "",
            channelName: i.snippet?.channelTitle ?? "",
            itemCount: i.contentDetails?.itemCount ?? null,
            source: "youtube" as const,
          },
        };
      }
      const json = await call("channels", { part: "snippet,statistics", id: data.id }, key);
      const i = json.items?.[0];
      if (!i) return { item: null, error: "not-found" as const };
      return {
        error: null,
        item: {
          youtubeChannelId: i.id,
          title: i.snippet?.title ?? "",
          description: i.snippet?.description ?? "",
          thumbnail: thumbOf(i.snippet),
          subscriberCount: i.statistics?.subscriberCount ?? null,
          source: "youtube" as const,
        },
      };
    } catch (err) {
      return { item: null, error: err instanceof Error ? err.message : "unavailable" };
    }
  });
