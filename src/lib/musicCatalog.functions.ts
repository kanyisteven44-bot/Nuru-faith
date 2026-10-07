import { catalogueTarget } from "./catalogTargets";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { trustedChannel } from "./content-policy";
import { eligibleMusicVideo, eligiblePodcastVideo, isoSeconds } from "./musicImport";

const thumb = z.object({ url: z.string() });
const videoSchema = z.object({
  id: z.string(),
  snippet: z.object({
    title: z.string(),
    channelId: z.string(),
    channelTitle: z.string(),
    categoryId: z.string(),
    publishedAt: z.string(),
    defaultAudioLanguage: z.string().optional(),
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

/** One bounded batch; the admin screen drives resumable reviewed imports. */
export const importReviewedCatalogPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      kind: z.enum(["music", "podcast"]).default("music"),
      restart: z.boolean().default(false),
      channelIds: z
        .array(z.string().regex(/^UC[A-Za-z0-9_-]{22}$/))
        .max(200)
        .default([]),
    }),
  )
  .handler(async ({ data, context }) => {
    const { data: roles, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["super_admin", "moderator"]);
    if (roleError || !roles?.length)
      throw new Error("Only Nuru administrators can import the shared catalogue.");
    const target = catalogueTarget(data.kind);
    // Music is exhaustive: the numeric target is a benchmark, not a stopping cap.
    const stopAtTarget = data.kind !== "music";
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
    // This owner-authorized metadata worker cannot change source approvals or user data.
    // Authenticate/authorize before loading the server-only privileged client.
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const leaseToken = crypto.randomUUID();
    const now = new Date().toISOString();
    const { data: progress, error: leaseError } = await db
      .from("media_catalog_imports")
      .update({ lease_token: leaseToken, lease_until: new Date(Date.now() + 90000).toISOString() })
      .eq("kind", data.kind)
      .or(`lease_until.is.null,lease_until.lt.${now}`)
      .select("*")
      .maybeSingle();
    if (leaseError) throw new Error(`Import progress unavailable (${leaseError.code}).`);
    if (!progress) throw new Error("Another import batch is running. Wait before resuming.");
    const cursor =
      data.restart ||
      (data.channelIds.length > 0 &&
        progress.channel_id &&
        !data.channelIds.includes(progress.channel_id))
        ? { channelId: null, pageToken: null }
        : { channelId: progress.channel_id, pageToken: progress.page_token };
    async function batch() {
      const songCount = async () => {
        const { count, error } = await db
          .from("media_items")
          .select("id", { head: true, count: "exact" })
          .eq("source", "youtube")
          .eq("media_type", data.kind)
          .eq("is_approved", true);
        if (error) throw new Error(`Catalogue database error (${error.code}): ${error.message}`);
        return count ?? 0;
      };
      const before = await songCount();
      if (stopAtTarget && before >= target)
        return {
          total: before,
          added: 0,
          next: null,
          targetReached: true,
          stats: { fetched: 0, parsed: 0, eligible: 0, inserted: 0, skippedExisting: 0 },
        };
      function sourceQuery() {
        let query = db
          .from("media_sources")
          .select("id,name,youtube_channel_id,language_codes")
          .eq("is_approved", true)
          .eq("is_verified", true)
          .eq("source_type", "youtube")
          .in("content_kind", [data.kind, "mixed"])
          .not("youtube_channel_id", "is", null);
        if (data.channelIds.length) query = query.in("youtube_channel_id", data.channelIds);
        return query;
      }
      let query = sourceQuery();
      if (cursor.channelId) query = query.eq("youtube_channel_id", cursor.channelId);
      const { data: sources, error } = await query.order("id").limit(1);
      if (error) throw new Error(`Catalogue database error (${error.code}): ${error.message}`);
      const source = sources?.[0];
      if (!source) {
        if (cursor.channelId)
          throw new Error("This source is no longer approved. Start a fresh scan.");
        return {
          total: before,
          added: 0,
          next: null,
          targetReached: false,
          stats: { fetched: 0, parsed: 0, eligible: 0, inserted: 0, skippedExisting: 0 },
        };
      }
      const { data: following, error: nextError } = await sourceQuery()
        .gt("id", source.id)
        .order("id")
        .limit(1);
      if (nextError)
        throw new Error(`Catalogue source error (${nextError.code}): ${nextError.message}`);
      const nextChannel = following?.[0]?.youtube_channel_id;
      const channelId = source.youtube_channel_id!;
      const { data: trust, error: trustError } = await db
        .from("approved_youtube_channels")
        .select("trust_level,is_verified")
        .eq("channel_id", channelId)
        .maybeSingle();
      if (trustError) throw new Error("Channel trust review is unavailable.");
      if (!trust?.is_verified || !trustedChannel(trust.trust_level))
        return {
          total: before,
          added: 0,
          next: nextChannel ? { channelId: nextChannel, pageToken: null } : null,
          targetReached: false,
          stats: { fetched: 0, parsed: 0, eligible: 0, inserted: 0, skippedExisting: 0 },
        };

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
      if (!uploads)
        return {
          total: before,
          added: 0,
          next: nextChannel ? { channelId: nextChannel, pageToken: null } : null,
          targetReached: false,
          stats: { fetched: 0, parsed: 0, eligible: 0, inserted: 0, skippedExisting: 0 },
        };
      const page = z
        .object({
          items: z
            .array(z.object({ contentDetails: z.object({ videoId: z.string() }) }))
            .default([]),
          nextPageToken: z.string().optional(),
        })
        .parse(
          await call("playlistItems", {
            part: "contentDetails",
            playlistId: uploads,
            maxResults: "50",
            ...(cursor.pageToken ? { pageToken: cursor.pageToken } : {}),
          }),
        );
      const ids = page.items.map((item) => item.contentDetails.videoId);
      const response = ids.length
        ? z
            .object({ items: z.array(z.unknown()).default([]) })
            .parse(
              await call("videos", { part: "snippet,status,contentDetails", id: ids.join(",") }),
            )
        : { items: [] };
      const parsedVideos = response.items.flatMap((item) => {
        // Upcoming/deleted uploads may lack duration or status metadata.
        // Reject only that incomplete video, preserving valid items in its page.
        const parsed = videoSchema.safeParse(item);
        return parsed.success ? [parsed.data] : [];
      });
      const eligibleVideos = parsedVideos.filter((video) =>
        (data.kind === "music" ? eligibleMusicVideo : eligiblePodcastVideo)(video, channelId),
      );
      const rows = eligibleVideos.map((video) => ({
        source: "youtube",
        external_id: video.id,
        source_id: source.id,
        title: video.snippet.title,
        creator_name: video.snippet.channelTitle,
        youtube_channel_id: channelId,
        media_type: data.kind,
        category: data.kind === "music" ? "worship" : "faith",
        language_code:
          video.snippet.defaultAudioLanguage?.split("-")[0] ?? source.language_codes[0] ?? "und",
        thumbnail_url:
          video.snippet.thumbnails.high?.url ?? video.snippet.thumbnails.medium?.url ?? null,
        duration_seconds: isoSeconds(video.contentDetails.duration),
        published_at: video.snippet.publishedAt,
        is_approved: true,
        can_download: false,
      }));
      let inserted = 0;
      if (rows.length) {
        const { data: insertedRows, error } = await db
          .from("media_items")
          .upsert(rows, { onConflict: "source,external_id", ignoreDuplicates: true })
          .select("id");
        if (error) throw new Error(`Catalogue database error (${error.code}): ${error.message}`);
        inserted = insertedRows?.length ?? 0;
      }
      const total = await songCount();
      const next = page.nextPageToken
        ? { channelId, pageToken: page.nextPageToken }
        : nextChannel
          ? { channelId: nextChannel, pageToken: null }
          : null;
      return {
        total,
        added: inserted,
        next: stopAtTarget && total >= target ? null : next,
        targetReached: stopAtTarget && total >= target,
        stats: {
          fetched: ids.length,
          parsed: parsedVideos.length,
          eligible: eligibleVideos.length,
          inserted,
          skippedExisting: Math.max(0, eligibleVideos.length - inserted),
        },
      };
    }
    try {
      const result = await batch();
      const { error } = await db
        .from("media_catalog_imports")
        .update({
          channel_id: result.next?.channelId ?? null,
          page_token: result.next?.pageToken ?? null,
          imported_total: result.total,
          pages_processed: progress.pages_processed + 1,
          status: result.targetReached
            ? "complete"
            : result.next
              ? "running"
              : data.channelIds.length
                ? "complete"
                : "exhausted",
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("kind", data.kind)
        .eq("lease_token", leaseToken);
      if (error) throw new Error(`Could not checkpoint catalogue progress (${error.code}).`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Catalogue import paused.";
      await db
        .from("media_catalog_imports")
        .update({ status: "paused", last_error: message, updated_at: new Date().toISOString() })
        .eq("kind", data.kind)
        .eq("lease_token", leaseToken);
      throw new Error(message);
    } finally {
      await db
        .from("media_catalog_imports")
        .update({ lease_token: null, lease_until: null })
        .eq("kind", data.kind)
        .eq("lease_token", leaseToken);
    }
  });
