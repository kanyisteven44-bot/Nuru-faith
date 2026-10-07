import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminWriteAssurance } from "@/lib/adminDirectoryAccess";
import { eligibleMusicVideo, eligiblePodcastVideo, isoSeconds, musicVideoEligibility } from "@/lib/musicImport";
import { parseYouTubeCreatorReference } from "@/lib/youtubeCreator";

const requireMediaAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ context, next }) => {
    const roles = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["super_admin", "moderator"]);
    if (roles.error || !roles.data?.length) {
      throw new Error("Music and media approval requires Super Admin or Moderator access.");
    }
    return next({ context });
  });

type ChannelResult = {
  channelId: string;
  title: string;
  description: string;
  thumbnail: string;
  subscriberCount: string | null;
};

type VideoResult = {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  channelId: string;
  channelName: string;
  publishedAt: string;
  durationSeconds: number;
};

async function youtubeCall(path: string, params: Record<string, string>) {
  const key = process.env["YOUTUBE_API_KEY"];
  if (!key) throw new Error("YouTube API is not configured on the server.");
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  url.search = new URLSearchParams({ ...params, key }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("YouTube API quota or permission is unavailable right now.");
    }
    throw new Error(`YouTube returned ${response.status}.`);
  }
  return (await response.json()) as {
    items?: Array<Record<string, any>>;
    nextPageToken?: string;
  };
}

function thumbOf(snippet: any): string {
  return (
    snippet?.thumbnails?.high?.url ??
    snippet?.thumbnails?.medium?.url ??
    snippet?.thumbnails?.default?.url ??
    ""
  );
}

export const adminYouTubeSearch = createServerFn({ method: "POST" })
  .middleware([requireMediaAdmin])
  .validator(
    z.object({
      query: z.string().trim().min(2).max(120),
      type: z.enum(["channel", "video"]),
      maxResults: z.number().int().min(1).max(20).default(12),
    }),
  )
  .handler(async ({ data }) => {
    const result = await youtubeCall("search", {
      part: "snippet",
      q: data.query,
      type: data.type,
      maxResults: String(data.maxResults),
      safeSearch: "strict",
      order: "relevance",
      ...(data.type === "video" ? { videoEmbeddable: "true" } : {}),
    });

    if (data.type === "channel") {
      const ids = (result.items ?? [])
        .map((item: any) => item.id?.channelId)
        .filter(Boolean)
        .join(",");
      if (!ids) return { channels: [] as ChannelResult[], videos: [] as VideoResult[] };
      const details = await youtubeCall("channels", {
        part: "snippet,statistics",
        id: ids,
      });
      return {
        channels: (details.items ?? []).map((item: any) => ({
          channelId: item.id ?? "",
          title: item.snippet?.title ?? "",
          description: item.snippet?.description ?? "",
          thumbnail: thumbOf(item.snippet),
          subscriberCount: item.statistics?.hiddenSubscriberCount
            ? null
            : (item.statistics?.subscriberCount ?? null),
        })),
        videos: [] as VideoResult[],
      };
    }

    const ids = (result.items ?? [])
      .map((item: any) => item.id?.videoId)
      .filter(Boolean)
      .join(",");
    if (!ids) return { channels: [] as ChannelResult[], videos: [] as VideoResult[] };
    const details = await youtubeCall("videos", {
      part: "snippet,status,contentDetails",
      id: ids,
    });
    return {
      channels: [] as ChannelResult[],
      videos: (details.items ?? [])
        .filter(
          (item: any) =>
            item.status?.embeddable === true &&
            item.status?.privacyStatus === "public" &&
            item.status?.uploadStatus === "processed" &&
            !item.contentDetails?.regionRestriction?.blocked?.includes("KE") &&
            (!item.contentDetails?.regionRestriction?.allowed ||
              item.contentDetails.regionRestriction.allowed.includes("KE")),
        )
        .map((item: any) => ({
          videoId: item.id ?? "",
          title: item.snippet?.title ?? "",
          description: item.snippet?.description ?? "",
          thumbnail: thumbOf(item.snippet),
          channelId: item.snippet?.channelId ?? "",
          channelName: item.snippet?.channelTitle ?? "",
          publishedAt: item.snippet?.publishedAt ?? "",
          durationSeconds: isoSeconds(item.contentDetails?.duration ?? ""),
        })),
    };
  });

export const resolveYouTubeCreatorLink = createServerFn({ method: "POST" })
  .middleware([requireMediaAdmin])
  .validator(
    z.object({
      input: z.string().trim().min(2).max(500),
    }),
  )
  .handler(async ({ data }) => {
    const reference = parseYouTubeCreatorReference(data.input);
    if (!reference) {
      throw new Error(
        "Use a YouTube @handle link, /channel/ link, legacy /user/ link, channel ID, or any video link from the creator.",
      );
    }

    let channelId = "";
    if (reference.kind === "channel") {
      channelId = reference.id;
    } else if (reference.kind === "handle") {
      const channels = await youtubeCall("channels", {
        part: "snippet,statistics",
        forHandle: reference.handle,
      });
      channelId = String((channels.items?.[0] as any)?.id ?? "");
    } else if (reference.kind === "username") {
      const channels = await youtubeCall("channels", {
        part: "snippet,statistics",
        forUsername: reference.username,
      });
      channelId = String((channels.items?.[0] as any)?.id ?? "");
    } else {
      const videos = await youtubeCall("videos", {
        part: "snippet",
        id: reference.id,
      });
      channelId = String((videos.items?.[0] as any)?.snippet?.channelId ?? "");
    }

    if (!channelId) {
      throw new Error("YouTube could not resolve that link to a creator channel.");
    }

    const details = await youtubeCall("channels", {
      part: "snippet,statistics",
      id: channelId,
    });
    const channel = details.items?.[0] as any;
    if (!channel) throw new Error("YouTube could not load that creator channel.");

    return {
      channelId,
      title: String(channel.snippet?.title ?? ""),
      description: String(channel.snippet?.description ?? ""),
      thumbnail: thumbOf(channel.snippet),
      subscriberCount: channel.statistics?.hiddenSubscriberCount
        ? null
        : String(channel.statistics?.subscriberCount ?? "") || null,
    } satisfies ChannelResult;
  });

export const approveYouTubeSource = createServerFn({ method: "POST" })
  .middleware([requireMediaAdmin])
  .validator(
    z.object({
      channelId: z.string().regex(/^UC[A-Za-z0-9_-]{22}$/),
      contentKind: z.enum(["music", "podcast", "mixed"]),
      languageCodes: z.array(z.string().regex(/^[a-z]{2,3}$/)).min(1).max(8).default(["en"]),
    }),
  )
  .handler(async ({ data, context }) => {
    assertAdminWriteAssurance(context.claims.aal);

    const channels = await youtubeCall("channels", {
      part: "snippet",
      id: data.channelId,
    });
    const channel = channels.items?.[0] as any;
    if (!channel) throw new Error("That YouTube channel could not be found.");

    const name = String(channel.snippet?.title ?? "").trim();
    if (!name) throw new Error("YouTube did not return a channel name.");
    const description = String(channel.snippet?.description ?? "").slice(0, 5000) || null;
    const avatarUrl = thumbOf(channel.snippet) || null;

    const existing = await context.supabase
      .from("media_sources")
      .select("id")
      .eq("youtube_channel_id", data.channelId)
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);

    let sourceId: string;
    if (existing.data) {
      const updated = await context.supabase
        .from("media_sources")
        .update({
          name,
          source_type: "youtube",
          description,
          avatar_url: avatarUrl,
          is_approved: true,
          is_verified: true,
          content_kind: data.contentKind,
          language_codes: data.languageCodes,
        })
        .eq("id", existing.data.id)
        .select("id")
        .single();
      if (updated.error) throw new Error(updated.error.message);
      sourceId = updated.data.id;
    } else {
      const inserted = await context.supabase
        .from("media_sources")
        .insert({
          name,
          source_type: "youtube",
          youtube_channel_id: data.channelId,
          description,
          avatar_url: avatarUrl,
          is_approved: true,
          is_verified: true,
          content_kind: data.contentKind,
          language_codes: data.languageCodes,
          created_by: context.userId,
        })
        .select("id")
        .single();
      if (inserted.error) throw new Error(inserted.error.message);
      sourceId = inserted.data.id;
    }

    const trust = await context.supabase
      .from("approved_youtube_channels")
      .upsert(
        {
          channel_id: data.channelId,
          channel_name: name,
          category: data.contentKind === "podcast" ? "podcast" : "music",
          trust_level: "trusted",
          is_verified: true,
          notes: "Reviewed and approved in the Nuru Faith admin media workspace.",
          created_by: context.userId,
        },
        { onConflict: "channel_id" },
      );
    if (trust.error) throw new Error(trust.error.message);

    return { id: sourceId, name, channelId: data.channelId, contentKind: data.contentKind };
  });

export const approveYouTubeVideo = createServerFn({ method: "POST" })
  .middleware([requireMediaAdmin])
  .validator(
    z.object({
      videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
      mediaType: z.enum(["music", "podcast"]),
    }),
  )
  .handler(async ({ data, context }) => {
    assertAdminWriteAssurance(context.claims.aal);

    const response = await youtubeCall("videos", {
      part: "snippet,status,contentDetails",
      id: data.videoId,
    });
    const video = response.items?.[0] as any;
    if (!video) throw new Error("That YouTube video could not be found.");

    const channelId = String(video.snippet?.channelId ?? "");
    const source = await context.supabase
      .from("media_sources")
      .select("id,name,content_kind,is_approved,is_verified")
      .eq("youtube_channel_id", channelId)
      .maybeSingle();
    if (source.error) throw new Error(source.error.message);
    if (!source.data?.is_approved || !source.data?.is_verified) {
      throw new Error("Approve this YouTube artist or creator first, then approve its videos.");
    }
    if (
      source.data.content_kind !== "mixed" &&
      source.data.content_kind !== data.mediaType
    ) {
      throw new Error(
        `This source is approved for ${source.data.content_kind}, not ${data.mediaType}. Change the source type first if needed.`,
      );
    }

    const musicCheck =
      data.mediaType === "music" ? musicVideoEligibility(video, channelId) : null;
    const eligible =
      data.mediaType === "music"
        ? musicCheck!.eligible
        : eligiblePodcastVideo(video, channelId);
    if (!eligible) {
      throw new Error(
        data.mediaType === "music"
          ? `This video cannot be approved as music: ${musicCheck!.reasons.join("; ")}.`
          : "This video does not pass Nuru's podcast checks (public, embeddable, Kenya-available and long enough).",
      );
    }

    const row = {
      source: "youtube",
      external_id: data.videoId,
      source_id: source.data.id,
      title: String(video.snippet?.title ?? ""),
      description: String(video.snippet?.description ?? "") || null,
      thumbnail_url: thumbOf(video.snippet) || null,
      media_type: data.mediaType,
      category: data.mediaType === "music" ? "worship" : "faith",
      creator_name: String(video.snippet?.channelTitle ?? source.data.name ?? ""),
      youtube_channel_id: channelId,
      duration_seconds: isoSeconds(video.contentDetails?.duration ?? ""),
      published_at: video.snippet?.publishedAt ?? null,
      can_download: false,
      is_approved: true,
      created_by: context.userId,
    };

    const saved = await context.supabase
      .from("media_items")
      .upsert(row, { onConflict: "source,external_id" })
      .select("id,title,media_type")
      .single();
    if (saved.error) throw new Error(saved.error.message);
    return saved.data;
  });

export const reviewMediaItem = createServerFn({ method: "POST" })
  .middleware([requireMediaAdmin])
  .validator(
    z.object({
      id: z.string().uuid(),
      approved: z.boolean(),
      featured: z.boolean().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    assertAdminWriteAssurance(context.claims.aal);

    const item = await context.supabase
      .from("media_items")
      .select("id,source,external_id,media_type,youtube_channel_id,source_id")
      .eq("id", data.id)
      .maybeSingle();
    if (item.error || !item.data) throw new Error("Media item not found.");

    if (data.approved && item.data.source === "youtube") {
      if (!["music", "podcast"].includes(item.data.media_type)) {
        throw new Error("Only reviewed music and podcast videos can be approved here.");
      }
      const channelId = item.data.youtube_channel_id ?? "";
      const source = await context.supabase
        .from("media_sources")
        .select("id,is_approved,is_verified,content_kind")
        .eq("id", item.data.source_id ?? "")
        .maybeSingle();
      if (source.error || !source.data?.is_approved || !source.data.is_verified) {
        throw new Error("Approve and verify the YouTube source before approving this video.");
      }
      const response = await youtubeCall("videos", {
        part: "snippet,status,contentDetails",
        id: item.data.external_id,
      });
      const video = response.items?.[0] as any;
      if (!video) throw new Error("YouTube no longer returns this video.");
      const musicCheck =
        item.data.media_type === "music" ? musicVideoEligibility(video, channelId) : null;
      const eligible =
        item.data.media_type === "music"
          ? musicCheck!.eligible
          : eligiblePodcastVideo(video, channelId);
      if (!eligible) {
        throw new Error(
          item.data.media_type === "music"
            ? `This video cannot be approved as music: ${musicCheck!.reasons.join("; ")}.`
            : "This video no longer passes Nuru's podcast playback and content eligibility checks.",
        );
      }
    }

    const patch: { is_approved: boolean; is_featured?: boolean } = {
      is_approved: data.approved,
    };
    if (data.featured !== undefined) patch.is_featured = data.featured;
    const updated = await context.supabase
      .from("media_items")
      .update(patch)
      .eq("id", data.id)
      .select("id,title,is_approved,is_featured")
      .single();
    if (updated.error) throw new Error(updated.error.message);
    return updated.data;
  });
