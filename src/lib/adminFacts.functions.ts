import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const requireStaff = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ context, next }) => {
    const roles = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["super_admin", "moderator"]);
    if (roles.error || !roles.data?.length) throw new Error("Staff access required");
    return next({ context });
  });

async function exactCount(
  query: PromiseLike<{ count: number | null; error: { message: string } | null }>,
): Promise<number> {
  const result = await query;
  if (result.error) throw new Error(result.error.message);
  return result.count ?? 0;
}

export type AdminFactSnapshot = {
  capturedAt: string;
  source: "supabase";
  youtubeApiConfigured: boolean;
  counts: {
    profiles: number;
    churches: number;
    verifiedChurches: number;
    groups: number;
    events: number;
    mentors: number;
    verifiedMentors: number;
    reels: number;
    courses: number;
    devotionals: number;
    scriptureSeries: number;
    posts: number;
    prayerRequests: number;
    directMessages: number;
    mediaItemsTotal: number;
    pendingMediaItems: number;
    approvedMusicSources: number;
    approvedPodcastSources: number;
    approvedMusicItems: number;
    approvedPodcastItems: number;
    pendingMusicItems: number;
    pendingPodcastItems: number;
    trustedYouTubeChannels: number;
  };
  imports: Array<{
    kind: string;
    status: string;
    importedTotal: number;
    pagesProcessed: number;
    channelId: string | null;
    hasNextPage: boolean;
    lastError: string | null;
    updatedAt: string;
  }>;
  latestMediaUpdate: string | null;
};

export const getAdminFactSnapshot = createServerFn({ method: "GET" })
  .middleware([requireStaff])
  .handler(async (): Promise<AdminFactSnapshot> => {
    // Staff authorization runs before the privileged client is loaded. Only aggregate
    // operational facts are returned; private message/prayer contents never leave the database.
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const [
      profiles,
      churches,
      verifiedChurches,
      groups,
      events,
      mentors,
      verifiedMentors,
      reels,
      courses,
      devotionals,
      scriptureSeries,
      posts,
      prayerRequests,
      directMessages,
      mediaItemsTotal,
      pendingMediaItems,
      approvedMusicSources,
      approvedPodcastSources,
      approvedMusicItems,
      approvedPodcastItems,
      pendingMusicItems,
      pendingPodcastItems,
      trustedYouTubeChannels,
      imports,
      latestMedia,
    ] = await Promise.all([
      exactCount(db.from("profiles").select("id", { head: true, count: "exact" })),
      exactCount(db.from("churches").select("id", { head: true, count: "exact" })),
      exactCount(
        db.from("churches").select("id", { head: true, count: "exact" }).eq("verified", true),
      ),
      exactCount(db.from("groups").select("id", { head: true, count: "exact" })),
      exactCount(db.from("events").select("id", { head: true, count: "exact" })),
      exactCount(db.from("mentors").select("id", { head: true, count: "exact" })),
      exactCount(
        db.from("mentors").select("id", { head: true, count: "exact" }).eq("verified", true),
      ),
      exactCount(db.from("reels").select("id", { head: true, count: "exact" })),
      exactCount(db.from("courses").select("id", { head: true, count: "exact" })),
      exactCount(db.from("devotionals").select("id", { head: true, count: "exact" })),
      exactCount(db.from("scripture_series").select("id", { head: true, count: "exact" })),
      exactCount(db.from("posts").select("id", { head: true, count: "exact" })),
      exactCount(db.from("prayer_requests").select("id", { head: true, count: "exact" })),
      exactCount(db.from("direct_messages").select("id", { head: true, count: "exact" })),
      exactCount(db.from("media_items").select("id", { head: true, count: "exact" })),
      exactCount(
        db.from("media_items").select("id", { head: true, count: "exact" }).eq("is_approved", false),
      ),
      exactCount(
        db
          .from("media_sources")
          .select("id", { head: true, count: "exact" })
          .eq("source_type", "youtube")
          .eq("is_approved", true)
          .eq("is_verified", true)
          .in("content_kind", ["music", "mixed"]),
      ),
      exactCount(
        db
          .from("media_sources")
          .select("id", { head: true, count: "exact" })
          .eq("source_type", "youtube")
          .eq("is_approved", true)
          .eq("is_verified", true)
          .in("content_kind", ["podcast", "mixed"]),
      ),
      exactCount(
        db
          .from("media_items")
          .select("id", { head: true, count: "exact" })
          .eq("source", "youtube")
          .eq("media_type", "music")
          .eq("is_approved", true),
      ),
      exactCount(
        db
          .from("media_items")
          .select("id", { head: true, count: "exact" })
          .eq("source", "youtube")
          .eq("media_type", "podcast")
          .eq("is_approved", true),
      ),
      exactCount(
        db
          .from("media_items")
          .select("id", { head: true, count: "exact" })
          .eq("source", "youtube")
          .eq("media_type", "music")
          .eq("is_approved", false),
      ),
      exactCount(
        db
          .from("media_items")
          .select("id", { head: true, count: "exact" })
          .eq("source", "youtube")
          .eq("media_type", "podcast")
          .eq("is_approved", false),
      ),
      exactCount(
        db
          .from("approved_youtube_channels")
          .select("id", { head: true, count: "exact" })
          .eq("is_verified", true)
          .in("trust_level", ["official", "verified", "trusted"]),
      ),
      db
        .from("media_catalog_imports")
        .select("kind,status,imported_total,pages_processed,channel_id,page_token,last_error,updated_at")
        .order("kind"),
      db
        .from("media_items")
        .select("updated_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (imports.error) throw new Error(imports.error.message);
    if (latestMedia.error) throw new Error(latestMedia.error.message);

    return {
      capturedAt: new Date().toISOString(),
      source: "supabase",
      youtubeApiConfigured: Boolean(process.env["YOUTUBE_API_KEY"]),
      counts: {
        profiles,
        churches,
        verifiedChurches,
        groups,
        events,
        mentors,
        verifiedMentors,
        reels,
        courses,
        devotionals,
        scriptureSeries,
        posts,
        prayerRequests,
        directMessages,
        mediaItemsTotal,
        pendingMediaItems,
        approvedMusicSources,
        approvedPodcastSources,
        approvedMusicItems,
        approvedPodcastItems,
        pendingMusicItems,
        pendingPodcastItems,
        trustedYouTubeChannels,
      },
      imports: (imports.data ?? []).map((row) => ({
        kind: row.kind,
        status: row.status,
        importedTotal: row.imported_total,
        pagesProcessed: row.pages_processed,
        channelId: row.channel_id,
        hasNextPage: Boolean(row.page_token),
        lastError: row.last_error,
        updatedAt: row.updated_at,
      })),
      latestMediaUpdate: latestMedia.data?.updated_at ?? null,
    };
  });
