import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enforceNuruRateLimit } from "./rateLimit";

import { response, commentsResponse } from "./youtubeReelMetadata";

async function api(path: string, params: Record<string, string>) {
  const key = process.env["YOUTUBE_API_KEY"];
  if (!key) throw new Error("YouTube details are unavailable. Please try again later.");
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  Object.entries({ ...params, key }).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    if (body?.error?.errors?.some((e: { reason: string }) => e.reason === "commentsDisabled"))
      throw new Error("Comments are disabled on this YouTube video.");
    throw new Error("YouTube details could not load. Please try again later.");
  }
  return res.json();
}
const cache = new Map<
  string,
  { expires: number; value: Awaited<ReturnType<typeof response.parse>> }
>();
async function metadata(path: string, params: Record<string, string>) {
  const key = JSON.stringify([path, params]);
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = response.parse(await api(path, params));
  if (cache.size >= 300) cache.delete(cache.keys().next().value!);
  cache.set(key, { expires: Date.now() + 5 * 60 * 1000, value });
  return value;
}
export const fetchYouTubeReelDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) =>
    z
      .object({
        videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
        section: z.enum(["video", "comments", "channel"]).default("video"),
        pageToken: z.string().max(200).optional(),
      })
      .parse(value),
  )
  .handler(async ({ data, context }) => {
    await enforceNuruRateLimit(
      context.supabase,
      "youtube_search",
      "Please wait a moment before loading more YouTube details.",
    );
    const video = (await metadata("videos", { part: "snippet,statistics", id: data.videoId }))
      .items[0];
    if (!video?.snippet?.channelId) throw new Error("This video is no longer available.");
    const channelId = video.snippet.channelId;
    const trusted = await context.supabase
      .from("media_sources")
      .select("id")
      .eq("is_approved", true)
      .eq("youtube_channel_id", channelId)
      .limit(1);
    if (trusted.error) throw trusted.error;
    if (!trusted.data?.length) {
      const approved = await context.supabase
        .from("approved_youtube_channels")
        .select("trust_level")
        .eq("channel_id", channelId)
        .in("trust_level", ["official", "trusted", "verified"])
        .limit(1);
      if (approved.error) throw approved.error;
      if (!approved.data?.length)
        throw new Error("This creator is not available in the approved directory.");
    }
    const stats = {
      likes: video.statistics?.likeCount ?? null,
      comments: video.statistics?.commentCount ?? null,
      views: video.statistics?.viewCount ?? null,
    };
    const channel = (
      await metadata("channels", { part: "snippet,statistics,contentDetails", id: channelId })
    ).items[0];
    const creator = {
      id: channelId,
      name: channel?.snippet?.title ?? "Creator",
      description: channel?.snippet?.description ?? "",
      avatar: channel?.snippet?.thumbnails?.["default"]?.url ?? null,
      subscribers: channel?.statistics?.hiddenSubscriberCount
        ? null
        : (channel?.statistics?.subscriberCount ?? null),
    };
    let comments: {
      id: string;
      author: string;
      avatar: string;
      text: string;
      likes: number;
      replies: number;
      publishedAt: string;
    }[] = [];
    let uploads: { id: string; title: string; thumbnail: string }[] = [];
    let nextPageToken: string | null = null;
    if (data.section === "comments") {
      const rows = commentsResponse.parse(
        await api("commentThreads", {
          part: "snippet",
          videoId: data.videoId,
          maxResults: "20",
          order: "relevance",
          textFormat: "plainText",
          ...(data.pageToken ? { pageToken: data.pageToken } : {}),
        }),
      );
      nextPageToken = rows.nextPageToken ?? null;
      comments = rows.items.map((r) => {
        const s = r.snippet.topLevelComment.snippet;
        return {
          id: r.id,
          author: s.authorDisplayName,
          avatar: s.authorProfileImageUrl,
          text: s.textDisplay,
          likes: s.likeCount,
          replies: r.snippet.totalReplyCount,
          publishedAt: s.publishedAt,
        };
      });
    }
    if (data.section === "channel") {
      const playlistId = channel?.contentDetails?.relatedPlaylists?.uploads;
      if (playlistId) {
        const rows = await metadata("playlistItems", {
          part: "snippet,contentDetails",
          playlistId,
          maxResults: "20",
          ...(data.pageToken ? { pageToken: data.pageToken } : {}),
        });
        nextPageToken = rows.nextPageToken ?? null;
        uploads = rows.items
          .filter((r) => r.contentDetails?.videoId)
          .map((r) => ({
            id: r.contentDetails!.videoId!,
            title: r.snippet?.title ?? "Video",
            thumbnail: r.snippet?.thumbnails?.["medium"]?.url ?? "",
          }));
      }
    }
    return { stats, creator, comments, uploads, nextPageToken };
  });
