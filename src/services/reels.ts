import { supabase } from "@/integrations/supabase/client";

export const REEL_TOPICS = [
  "Bible Teaching",
  "Faith",
  "Prayer",
  "Worship",
  "Testimony",
  "Relationships",
  "Purpose",
  "Christian Life",
  "Church",
  "Youth",
  "Mental Wellness",
  "Career & Calling",
  "Leadership",
] as const;

export const REPORT_REASONS = [
  "Harassment",
  "Hate",
  "Sexual content",
  "Violence",
  "Spam",
  "False information",
  "Dangerous teaching",
  "Impersonation",
  "Other",
] as const;

export type ReelFeed = "For You" | "Following" | "My Church";

const REEL_SELECT =
  "id, author_id, creator_name, creator_handle, creator_avatar_url, caption, hashtags, video_url, poster_url, audio_title, scripture_ref, topic, is_bible_teaching, church_id, series_id, like_count, comment_count, view_count, created_at, source_type, rights_status, external_id, external_url, title, churches(name, slug, verified)";

export type ReelSourceType =
  | "nuru_original"
  | "user_upload"
  | "church_upload"
  | "creator_upload"
  | "youtube"
  | "tiktok"
  | "instagram";

export type Reel = {
  id: string;
  author_id: string | null;
  creator_name: string;
  creator_handle: string;
  creator_avatar_url: string | null;
  caption: string | null;
  hashtags: string[] | null;
  video_url: string | null;
  poster_url: string | null;
  audio_title: string | null;
  scripture_ref: string | null;
  topic: string | null;
  is_bible_teaching: boolean;
  church_id: string | null;
  series_id: string | null;
  like_count: number;
  comment_count: number;
  view_count: number;
  created_at: string;
  source_type: ReelSourceType;
  rights_status: string;
  external_id: string | null;
  external_url: string | null;
  title: string | null;
  churches: { name: string; slug: string; verified: boolean } | null;
};

export const REELS_PAGE_SIZE = 6;

/** How many reels each feed considers per request before ranking + paginating client-side. */
const CANDIDATE_POOL_SIZE = 500;

/**
 * Reel ids the person has already watched (logged after ~2s of active view),
 * newest watch first. Used to keep already-seen reels out of the feed for as
 * long as there's anything unseen left to show.
 */
export async function fetchViewedReelTimestamps(userId: string): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("reel_views")
    .select("reel_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);
  const lastViewedAt = new Map<string, string>();
  for (const row of data ?? []) {
    if (!lastViewedAt.has(row.reel_id)) lastViewedAt.set(row.reel_id, row.created_at);
  }
  return lastViewedAt;
}

/**
 * Feed logic is deliberately simple and explainable:
 * newest published reels, gently boosted by the topics the person cares about,
 * their church and the creators they follow. Never ranked by raw views.
 *
 * Reels the person has already watched are always ranked behind unwatched
 * ones, so nothing repeats while there's still something new — a reel
 * watched yesterday won't resurface today unless the whole pool has been
 * seen. Once that happens, the reel watched longest ago comes back first.
 */
export async function fetchReelPage(params: {
  feed: ReelFeed;
  page: number;
  userId: string | null;
  interests: string[];
  churchId: string | null;
  followingIds: string[];
}): Promise<Reel[]> {
  const { feed, page, userId, interests, churchId, followingIds } = params;
  const from = page * REELS_PAGE_SIZE;

  let q = supabase
    .from("reels")
    .select(REEL_SELECT)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(CANDIDATE_POOL_SIZE);

  if (feed === "Following") {
    if (followingIds.length === 0) return [];
    q = q.in("author_id", followingIds);
  }
  if (feed === "My Church") {
    if (!churchId) return [];
    q = q.eq("church_id", churchId);
  }

  const [{ data, error }, lastViewedAt] = await Promise.all([
    q,
    userId ? fetchViewedReelTimestamps(userId) : Promise.resolve(new Map<string, string>()),
  ]);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Reel[];

  const score = (r: Reel) => {
    if (feed !== "For You") return 0;
    let s = 0;
    if (
      r.topic &&
      interests.some((i) => i.toLowerCase().includes(r.topic!.toLowerCase().split(" ")[0]!))
    )
      s += 3;
    if (churchId && r.church_id === churchId) s += 2;
    if (r.author_id && followingIds.includes(r.author_id)) s += 2;
    if (r.is_bible_teaching) s += 1;
    return s;
  };

  const ranked = [...rows].sort((a, b) => {
    const aSeen = lastViewedAt.get(a.id);
    const bSeen = lastViewedAt.get(b.id);
    if (!aSeen !== !bSeen) return aSeen ? 1 : -1;
    if (aSeen && bSeen && aSeen !== bSeen) return aSeen < bSeen ? -1 : 1;
    return score(b) - score(a);
  });

  return ranked.slice(from, from + REELS_PAGE_SIZE);
}

export async function fetchFollowingIds(userId: string) {
  const { data, error } = await supabase
    .from("user_follows")
    .select("following_id")
    .eq("follower_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.following_id);
}

export async function toggleFollow(userId: string, targetId: string, following: boolean) {
  if (following) {
    const { error } = await supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", userId)
      .eq("following_id", targetId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("user_follows")
      .insert({ follower_id: userId, following_id: targetId });
    if (error) throw new Error(error.message);
  }
}

/* ---------- comments ---------- */

export type ReelComment = {
  id: string;
  reel_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  pinned: boolean;
  like_count: number;
  created_at: string;
  profiles: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    verified: boolean;
  } | null;
};

export async function fetchReelComments(reelId: string) {
  const { data, error } = await supabase
    .from("reel_comments")
    .select("*, profiles(full_name, username, avatar_url, verified)")
    .eq("reel_id", reelId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ReelComment[];
}

export async function addReelComment(input: {
  reelId: string;
  userId: string;
  content: string;
  parentId?: string | null;
}) {
  const { error } = await supabase.from("reel_comments").insert({
    reel_id: input.reelId,
    user_id: input.userId,
    content: input.content,
    parent_comment_id: input.parentId ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function deleteReelComment(id: string) {
  const { error } = await supabase.from("reel_comments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function pinReelComment(id: string, pinned: boolean) {
  const { error } = await supabase.from("reel_comments").update({ pinned }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchMyCommentLikes(userId: string) {
  const { data, error } = await supabase
    .from("reel_comment_likes")
    .select("comment_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.comment_id);
}

export async function toggleCommentLike(userId: string, commentId: string, liked: boolean) {
  if (liked) {
    const { error } = await supabase
      .from("reel_comment_likes")
      .delete()
      .eq("user_id", userId)
      .eq("comment_id", commentId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("reel_comment_likes")
      .insert({ user_id: userId, comment_id: commentId });
    if (error) throw new Error(error.message);
  }
}

/* ---------- views, reports, creation ---------- */

export async function recordReelView(
  userId: string,
  reelId: string,
  watchDuration: number,
  completed: boolean,
) {
  await supabase
    .from("reel_views")
    .insert({ user_id: userId, reel_id: reelId, watch_duration: watchDuration, completed });
}

export async function reportReel(input: {
  reelId: string;
  userId: string;
  reason: string;
  details?: string;
}) {
  const { error } = await supabase.from("reel_reports").insert({
    reel_id: input.reelId,
    reported_by: input.userId,
    reason: input.reason,
    details: input.details ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function createReel(input: {
  authorId: string;
  creatorName: string;
  creatorHandle: string;
  creatorAvatarUrl: string | null;
  caption: string;
  videoUrl: string | null;
  posterUrl: string | null;
  scriptureRef: string | null;
  hashtags: string[];
  topic: string;
  isBibleTeaching: boolean;
  churchId: string | null;
  groupId: string | null;
  /** Only set for imported (non-Nuru) Reels; uploads keep the column defaults. */
  sourceType?: ReelSourceType;
  rightsStatus?: string;
  externalId?: string | null;
  externalUrl?: string | null;
}) {
  const { error } = await supabase.from("reels").insert({
    author_id: input.authorId,
    creator_name: input.creatorName,
    creator_handle: input.creatorHandle,
    creator_avatar_url: input.creatorAvatarUrl,
    caption: input.caption,
    video_url: input.videoUrl,
    poster_url: input.posterUrl,
    scripture_ref: input.scriptureRef,
    hashtags: input.hashtags,
    topic: input.topic,
    is_bible_teaching: input.isBibleTeaching,
    church_id: input.churchId,
    group_id: input.groupId,
    status: "published",
    ...(input.sourceType ? { source_type: input.sourceType } : {}),
    ...(input.rightsStatus ? { rights_status: input.rightsStatus } : {}),
    ...(input.externalId !== undefined ? { external_id: input.externalId } : {}),
    ...(input.externalUrl !== undefined ? { external_url: input.externalUrl } : {}),
  });
  if (error) throw new Error(error.message);
}

export async function uploadReelVideo(userId: string, file: File) {
  const path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
  const { error } = await supabase.storage.from("reel-media").upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);
  const { data } = await supabase.storage
    .from("reel-media")
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  return data?.signedUrl ?? null;
}

/* ---------- recommendation feedback (not moderation) ---------- */

export async function fetchMyReelFeedback(userId: string) {
  const { data, error } = await supabase
    .from("reel_feedback")
    .select("reel_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.reel_id);
}

export async function addReelFeedback(
  userId: string,
  reelId: string,
  feedbackType: "not_interested" | "hide_creator" = "not_interested",
) {
  const { error } = await supabase
    .from("reel_feedback")
    .insert({ user_id: userId, reel_id: reelId, feedback_type: feedbackType });
  if (error && !error.message.includes("duplicate")) throw new Error(error.message);
}

export async function deleteReel(reelId: string) {
  const { error } = await supabase.from("reels").delete().eq("id", reelId);
  if (error) throw new Error(error.message);
}

export async function updateReelCaption(reelId: string, caption: string) {
  const { error } = await supabase.from("reels").update({ caption }).eq("id", reelId);
  if (error) throw new Error(error.message);
}

export async function fetchReelById(id: string): Promise<Reel | null> {
  const { data, error } = await supabase
    .from("reels")
    .select(REEL_SELECT)
    .eq("id", id)
    .eq("status", "published")
    .eq("is_public", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Reel | null;
}
