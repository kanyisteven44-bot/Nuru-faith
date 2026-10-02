import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { eligibleMusicVideo, isoSeconds, MUSIC_SOURCE_NAMES } from "./musicImport";

const thumb = z.object({ url: z.string() });
const videoSchema = z.object({
  id: z.string(),
  snippet: z.object({
    title: z.string(),
    channelId: z.string(),
    channelTitle: z.string(),
    categoryId: z.string(),
    publishedAt: z.string(),
    thumbnails: z.object({ high: thumb.optional(), medium: thumb.optional() }),
  }),
  status: z.object({
    embeddable: z.boolean(),
    privacyStatus: z.string(),
    uploadStatus: z.string(),
  }),
  contentDetails: z.object({
    duration: z.string(),
    regionRestriction: z
      .object({ blocked: z.array(z.string()).optional(), allowed: z.array(z.string()).optional() })
      .optional(),
  }),
});

/** One bounded batch; the admin screen drives resumable progress to 10,000. */
export const importMusicCatalogPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      channelId: z.string().max(64).nullable().default(null),
      pageToken: z.string().max(500).nullable().default(null),
    }),
  )
  .handler(async ({ data, context }) => {
    if (context.claims["aal"] !== "aal2")
      throw new Error("Verify your admin account with MFA before importing.");
    const { data: roles, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["super_admin", "moderator"]);
    if (roleError || !roles?.length)
      throw new Error("Only Nuru administrators can import the shared catalogue.");
    const key = process.env["YOUTUBE_API_KEY"];
    if (!key)
      throw new Error(
        "Set the server-only YOUTUBE_API_KEY in Vercel and redeploy before importing.",
      );
    async function call(path: string, params: Record<string, string>): Promise<unknown> {
      const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
      url.search = new URLSearchParams({ ...params, key: key! }).toString();
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!response.ok)
        throw new Error(
          `YouTube returned ${response.status}. Import paused; check the API key and quota, then resume.`,
        );
      return response.json();
    }
    const db = context.supabase;
    const songCount = async () => {
      const { count, error } = await db
        .from("media_items")
        .select("id", { head: true, count: "exact" })
        .eq("source", "youtube")
        .eq("media_type", "music")
        .eq("is_approved", true);
      if (error) throw error;
      return count ?? 0;
    };
    const before = await songCount();
    if (before >= 10000) return { total: before, added: 0, next: null, targetReached: true };
    const { data: sources, error } = await db
      .from("media_sources")
      .select("id,name,youtube_channel_id")
      .eq("is_approved", true)
      .eq("source_type", "youtube")
      .in("name", MUSIC_SOURCE_NAMES)
      .order("id");
    if (error) throw error;
    const eligibleSources = (sources ?? []).filter((source) => !!source.youtube_channel_id);
    const index = data.channelId
      ? eligibleSources.findIndex((source) => source.youtube_channel_id === data.channelId)
      : 0;
    if (index < 0) throw new Error("This source is no longer approved. Start a fresh import scan.");
    const source = eligibleSources[index];
    if (!source) return { total: before, added: 0, next: null, targetReached: false };
    const channelId = source.youtube_channel_id!;
    const channel = z
      .object({
        items: z
          .array(
            z.object({
              contentDetails: z.object({ relatedPlaylists: z.object({ uploads: z.string() }) }),
            }),
          )
          .default([]),
      })
      .parse(await call("channels", { part: "contentDetails", id: channelId }));
    const uploads = channel.items[0]?.contentDetails.relatedPlaylists.uploads;
    const nextChannel = eligibleSources[index + 1]?.youtube_channel_id;
    if (!uploads)
      return {
        total: before,
        added: 0,
        next: nextChannel ? { channelId: nextChannel, pageToken: null } : null,
        targetReached: false,
      };
    const page = z
      .object({
        items: z.array(z.object({ contentDetails: z.object({ videoId: z.string() }) })).default([]),
        nextPageToken: z.string().optional(),
      })
      .parse(
        await call("playlistItems", {
          part: "contentDetails",
          playlistId: uploads,
          maxResults: "50",
          ...(data.pageToken ? { pageToken: data.pageToken } : {}),
        }),
      );
    const ids = page.items.map((item) => item.contentDetails.videoId);
    const response = ids.length
      ? z
          .object({ items: z.array(videoSchema).default([]) })
          .parse(await call("videos", { part: "snippet,status,contentDetails", id: ids.join(",") }))
      : { items: [] };
    const rows = response.items
      .filter((video) => eligibleMusicVideo(video, channelId))
      .map((video) => ({
        source: "youtube",
        external_id: video.id,
        source_id: source.id,
        title: video.snippet.title,
        creator_name: video.snippet.channelTitle,
        youtube_channel_id: channelId,
        media_type: "music",
        category: "worship",
        thumbnail_url:
          video.snippet.thumbnails.high?.url ?? video.snippet.thumbnails.medium?.url ?? null,
        duration_seconds: isoSeconds(video.contentDetails.duration),
        published_at: video.snippet.publishedAt,
        is_approved: true,
        can_download: false,
      }));
    if (rows.length) {
      const { error } = await db
        .from("media_items")
        .upsert(rows, { onConflict: "source,external_id", ignoreDuplicates: true });
      if (error) throw error;
    }
    const total = await songCount();
    const next = page.nextPageToken
      ? { channelId, pageToken: page.nextPageToken }
      : nextChannel
        ? { channelId: nextChannel, pageToken: null }
        : null;
    return {
      total,
      added: total - before,
      next: total >= 10000 ? null : next,
      targetReached: total >= 10000,
    };
  });
