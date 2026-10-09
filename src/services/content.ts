import { supabase } from "@/integrations/supabase/client";

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

/* ---------- profiles ---------- */

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*, churches(id, name, slug, city, denomination, cover_url, logo_url, verified)")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

type ProfilePatch = Partial<{
  full_name: string | null;
  username: string | null;
  bio: string | null;
  country: string | null;
  denomination: string | null;
  avatar_url: string | null;
  church_id: string | null;
  onboarded: boolean;
}>;

export async function updateProfile(userId: string, patch: ProfilePatch) {
  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
}

export async function checkUsernameAvailability(username: string, userId: string) {
  const handle = username.trim().replace(/^@+/, "").toLowerCase();
  if (!handle) return true;
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", handle)
    .neq("id", userId)
    .limit(1);
  if (error) throw new Error(error.message);
  return (data ?? []).length === 0;
}

export async function fetchMyRoles(userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role, church_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

const JOURNEY_PREFIX = "__journey:";

export async function saveInterests(userId: string, interests: string[]) {
  const { error: deleteError } = await supabase
    .from("user_interests")
    .delete()
    .eq("user_id", userId);
  if (deleteError) throw new Error(deleteError.message);
  if (interests.length === 0) return;
  const { error } = await supabase
    .from("user_interests")
    .insert(interests.map((interest) => ({ user_id: userId, interest })));
  if (error) throw new Error(error.message);
}

export async function fetchInterests(userId: string) {
  const { data, error } = await supabase
    .from("user_interests")
    .select("interest")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((r) => r.interest)
    .filter((interest) => !interest.startsWith(JOURNEY_PREFIX));
}

export async function fetchJourneyStage(userId: string) {
  const { data, error } = await supabase
    .from("user_interests")
    .select("interest")
    .eq("user_id", userId)
    .like("interest", `${JOURNEY_PREFIX}%`)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.interest?.slice(JOURNEY_PREFIX.length) ?? null;
}

export async function saveOnboardingInterests(
  userId: string,
  interests: string[],
  journeyStage: string,
) {
  await saveInterests(userId, [...interests, `${JOURNEY_PREFIX}${journeyStage}`]);
}

/* ---------- churches & groups ---------- */

export const fetchChurches = async (search?: string) => {
  const rows: import("@/integrations/supabase/types").Database["public"]["Tables"]["churches"]["Row"][] =
    [];
  for (let start = 0; ; start += 500) {
    let q = supabase
      .from("churches")
      .select("*")
      .order("region", { nullsFirst: false })
      .order("city", { nullsFirst: false })
      .order("denomination", { nullsFirst: false })
      .order("name")
      .order("id");
    if (search) q = q.ilike("name", `%${search}%`);
    const page = unwrap(await q.range(start, start + 499));
    rows.push(...page);
    if (page.length < 500) break;
  }
  return rows;
};

export async function fetchChurchById(id: string) {
  const { data, error } = await supabase
    .from("churches")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchChurchBySlug(slug: string) {
  const { data, error } = await supabase
    .from("churches")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export const fetchGroups = async (search?: string) => {
  let q = supabase.from("groups").select("*").order("member_count", { ascending: false }).limit(30);
  if (search) q = q.ilike("name", `%${search}%`);
  return unwrap(await q);
};

export async function fetchMyGroupIds(userId: string) {
  const { data, error } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.group_id);
}

export async function joinGroup(userId: string, groupId: string) {
  const { error } = await supabase
    .from("group_members")
    .insert({ user_id: userId, group_id: groupId });
  if (error) throw new Error(error.message);
}

export async function leaveGroup(userId: string, groupId: string) {
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("user_id", userId)
    .eq("group_id", groupId);
  if (error) throw new Error(error.message);
}

/* ---------- community ---------- */

type JoinedProfile = {
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

/**
 * PostgREST returns the joined row nested under `profiles`, but PostCard reads
 * flat author_* fields. Without this mapping every post rendered as
 * "Nuru member" with no handle or avatar.
 */
function authorFields(profiles: unknown) {
  const joined = (Array.isArray(profiles) ? profiles[0] : profiles) as JoinedProfile | null;
  return {
    author_name: joined?.full_name ?? null,
    author_handle: joined?.username ?? null,
    author_avatar_url: joined?.avatar_url ?? null,
  };
}

export const COMMUNITY_PAGE_SIZE = 20;

export async function fetchPostPage(page: number, authorIds?: string[]) {
  if (authorIds && authorIds.length === 0) return [];

  const from = page * COMMUNITY_PAGE_SIZE;
  const to = from + COMMUNITY_PAGE_SIZE - 1;

  let query = supabase
    .from("posts")
    .select("*, profiles(full_name, username, avatar_url)")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (authorIds) query = query.in("author_id", authorIds);

  const rows = unwrap(await query);
  return rows.map((row) => ({ ...row, ...authorFields(row.profiles) }));
}

export async function createPost(input: {
  author_id: string;
  kind: string;
  body: string;
  scripture_ref?: string | null;
  media_url?: string | null;
  music_track_id?: string | null;
  music_start_seconds?: number;
  group_id?: string | null;
}) {
  const { error } = await supabase.from("posts").insert(input as never);
  if (error) throw new Error(error.message);
}

/**
 * Permanently remove a post authored by the signed-in member.
 *
 * We restrict the DELETE to both the post ID and author ID; Supabase's
 * `posts delete own` RLS policy independently enforces auth.uid() ownership.
 * Returning the deleted row prevents a false success toast for a stale post
 * or a post owned by someone else.
 *
 * Uploaded media uses a fresh userId/UUID path. Only attempt to remove a file
 * in that exact folder/format, and only AFTER the database row was deleted.
 * Failure to delete the file is reported separately; the post is still gone.
 */
export async function deleteOwnPost(
  authorId: string,
  postId: string,
): Promise<{ mediaCleanupFailed: boolean }> {
  const { data: deleted, error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", authorId)
    .select("id, media_url")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!deleted) throw new Error("Post not found or you don't have permission to delete it.");

  const mediaUrl = deleted.media_url;
  if (!mediaUrl?.startsWith("post:")) return { mediaCleanupFailed: false };

  const path = mediaUrl.slice("post:".length);
  const [folder, filename, extra] = path.split("/");
  // Never delete external URLs, other members' files, or unexpected paths.
  const ownUpload =
    !extra &&
    folder === authorId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif|mp4|webm|mov)$/i.test(
      filename ?? "",
    );

  if (!ownUpload) return { mediaCleanupFailed: false };
  try {
    const { error: mediaError } = await supabase.storage.from("post-media").remove([path]);
    return { mediaCleanupFailed: !!mediaError };
  } catch {
    return { mediaCleanupFailed: true };
  }
}

/**
 * The counts the profile header shows. Each is a head-only count, so the rows
 * themselves are never transferred.
 */
export async function fetchProfileCounts(userId: string) {
  const [posts, followers, following] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", userId),
    supabase
      .from("user_follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", userId),
    supabase
      .from("user_follows")
      .select("following_id", { count: "exact", head: true })
      .eq("follower_id", userId),
  ]);
  return {
    posts: posts.count ?? 0,
    followers: followers.count ?? 0,
    following: following.count ?? 0,
  };
}

/** This person's own posts, newest first, for the profile grid. */
export async function fetchMyPosts(userId: string) {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Posts this person saved, resolved from saved_posts to the posts themselves. */
export async function fetchMySavedPostRows(userId: string) {
  const ids = await fetchMySavedPosts(userId);
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .in("id", ids)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Ids of the people this user follows — powers the Community "Following" tab. */
export async function fetchMyFollowing(userId: string) {
  const { data, error } = await supabase
    .from("user_follows")
    .select("following_id")
    .eq("follower_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.following_id);
}

export async function fetchMyPostLikes(userId: string) {
  const { data, error } = await supabase.from("post_likes").select("post_id").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.post_id);
}

export async function togglePostLike(userId: string, postId: string, liked: boolean) {
  if (liked) {
    const { error } = await supabase
      .from("post_likes")
      .delete()
      .eq("user_id", userId)
      .eq("post_id", postId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("post_likes")
      .insert({ user_id: userId, post_id: postId });
    if (error) throw new Error(error.message);
  }
}

export async function toggleSavedPost(userId: string, postId: string, saved: boolean) {
  if (saved) {
    const { error } = await supabase
      .from("saved_posts")
      .delete()
      .eq("user_id", userId)
      .eq("post_id", postId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("saved_posts")
      .insert({ user_id: userId, post_id: postId });
    if (error) throw new Error(error.message);
  }
}

export async function fetchMySavedPosts(userId: string) {
  const { data, error } = await supabase
    .from("saved_posts")
    .select("post_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.post_id);
}

export const fetchComments = async (postId: string) => {
  const rows = unwrap(
    await supabase
      .from("post_comments")
      .select("*, profiles(full_name, username, avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(100),
  );
  return rows.map((row) => ({ ...row, ...authorFields(row.profiles) }));
};

export async function addComment(postId: string, authorId: string, body: string) {
  const { error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, author_id: authorId, body });
  if (error) throw new Error(error.message);
}

export async function reportContent(
  reporterId: string,
  targetType: string,
  targetId: string,
  reason: string,
) {
  const { error } = await supabase
    .from("reports")
    .insert({ reporter_id: reporterId, target_type: targetType, target_id: targetId, reason });
  if (error) throw new Error(error.message);
}

/* ---------- reels ---------- */

export const fetchReels = async () =>
  unwrap(
    await supabase
      .from("reels")
      .select("*, churches(name, slug)")
      .eq("status", "published")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(12),
  );

export async function fetchMyReelLikes(userId: string) {
  const { data, error } = await supabase.from("reel_likes").select("reel_id").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.reel_id);
}

export async function toggleReelLike(userId: string, reelId: string, liked: boolean) {
  if (liked) {
    const { error } = await supabase
      .from("reel_likes")
      .delete()
      .eq("user_id", userId)
      .eq("reel_id", reelId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("reel_likes")
      .insert({ user_id: userId, reel_id: reelId });
    if (error) throw new Error(error.message);
  }
}

export async function toggleSavedReel(userId: string, reelId: string, saved: boolean) {
  if (saved) {
    const { error } = await supabase
      .from("saved_reels")
      .delete()
      .eq("user_id", userId)
      .eq("reel_id", reelId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("saved_reels")
      .insert({ user_id: userId, reel_id: reelId });
    if (error) throw new Error(error.message);
  }
}

export async function fetchMySavedReels(userId: string) {
  const { data, error } = await supabase
    .from("saved_reels")
    .select("reel_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.reel_id);
}

/* ---------- bible & learn ---------- */

export const fetchDevotionals = async () =>
  unwrap(
    await supabase
      .from("devotionals")
      .select("*")
      .order("publish_date", { ascending: false })
      .limit(12),
  );

export const fetchReadingPlans = async () =>
  unwrap(await supabase.from("reading_plans").select("*").order("days"));

export const fetchPlanDays = async (planId: string) =>
  unwrap(
    await supabase.from("reading_plan_days").select("*").eq("plan_id", planId).order("day_number"),
  );

/* ---------- events, mentors, serve ---------- */

export const fetchEvents = async () =>
  unwrap(
    await supabase
      .from("events")
      .select("*, churches(name, slug)")
      .gte("starts_at", new Date(Date.now() - 86400000).toISOString())
      .order("starts_at"),
  );

export async function fetchMyEventIds(userId: string) {
  const { data, error } = await supabase
    .from("event_attendees")
    .select("event_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.event_id);
}

export async function toggleAttendance(userId: string, eventId: string, going: boolean) {
  if (going) {
    const { error } = await supabase
      .from("event_attendees")
      .delete()
      .eq("user_id", userId)
      .eq("event_id", eventId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("event_attendees")
      .insert({ user_id: userId, event_id: eventId });
    if (error) throw new Error(error.message);
  }
}

export const fetchMentors = async () =>
  unwrap(await supabase.from("mentors").select("*").order("verified", { ascending: false }));

export async function fetchMentorById(id: string) {
  const { data, error } = await supabase.from("mentors").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export const fetchMyMentorshipRequests = async (userId: string) =>
  unwrap(
    await supabase
      .from("mentorship_requests")
      .select("*, mentors(display_name, role_title, photo_url)")
      .eq("requester_id", userId)
      .order("created_at", { ascending: false }),
  );

export async function requestMentorship(input: {
  mentor_id: string;
  requester_id: string;
  reason: string;
  message: string;
}) {
  const { error } = await supabase.from("mentorship_requests").insert(input);
  if (error) throw new Error(error.message);
}

export const fetchServeOpportunities = async () =>
  unwrap(
    await supabase.from("serve_opportunities").select("*, churches(name)").order("created_at"),
  );

/* ---------- media ---------- */

export const fetchPlaylists = async () =>
  unwrap(
    await supabase.from("music_playlists").select("*").order("featured", { ascending: false }),
  );

export const fetchTracks = async () =>
  unwrap(await supabase.from("music_tracks").select("*").order("title"));

export const fetchPodcasts = async () =>
  unwrap(await supabase.from("podcasts").select("*, podcast_episodes(*)").order("title"));

/* ---------- prayer & notifications ---------- */

export type PrayerRequestRow = {
  id: string;
  body: string;
  title: string | null;
  is_anonymous: boolean;
  created_at: string;
  /** Whether this is the caller's own request, so they can delete it. */
  is_mine: boolean;
};

/**
 * Prayer requests are read without author identity on purpose: a prayer
 * request is sensitive, and attributing one is a product decision, not a
 * default. list_prayer_requests() compares user_id server-side and returns
 * only `is_mine`, and authenticated has no SELECT on user_id, so authors stay
 * hidden from the REST API too (anonymous rows included).
 */
export async function fetchPrayerRequests(userId: string | null): Promise<PrayerRequestRow[]> {
  const { data, error } = await supabase.rpc("list_prayer_requests", { p_limit: 30 });
  if (!error) return (data ?? []) as PrayerRequestRow[];
  // Until the hide_prayer_request_authors migration is applied the RPC is missing.
  if (error.code !== "PGRST202" && error.code !== "42883") throw new Error(error.message);

  const rows = unwrap(
    await supabase
      .from("prayer_requests")
      .select("id, body, title, is_anonymous, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(30),
  ) as {
    id: string;
    body: string;
    title: string | null;
    is_anonymous: boolean;
    created_at: string;
    user_id: string | null;
  }[];

  return rows.map(({ user_id, ...row }) => ({
    ...row,
    is_mine: !!userId && user_id === userId,
  }));
}

export async function createPrayerRequest(userId: string, body: string, isAnonymous: boolean) {
  const { error } = await supabase
    .from("prayer_requests")
    .insert({ user_id: userId, body, is_anonymous: isAnonymous });
  if (error) throw new Error(error.message);
}

export async function deletePrayerRequest(id: string) {
  const { error } = await supabase.from("prayer_requests").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * "I prayed for this" lives in prayer_support. Note what this can and cannot
 * tell you: the table's RLS is `USING (user_id = auth.uid())`, so a SELECT only
 * ever returns the caller's own rows — there is no way to read how many other
 * people prayed. prayer_requests.prayer_count is no help either: nothing
 * maintains it and authenticated has no UPDATE policy on the table. So the UI
 * shows whether *you* prayed, and no supporter total.
 */
export async function fetchMyPrayerSupport(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("prayer_support")
    .select("prayer_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((row) => row.prayer_id));
}

export async function addPrayerSupport(userId: string, prayerId: string) {
  const { error } = await supabase
    .from("prayer_support")
    .insert({ user_id: userId, prayer_id: prayerId });
  if (error && !error.message.includes("duplicate")) throw new Error(error.message);
}

export async function removePrayerSupport(userId: string, prayerId: string) {
  const { error } = await supabase
    .from("prayer_support")
    .delete()
    .eq("user_id", userId)
    .eq("prayer_id", prayerId);
  if (error) throw new Error(error.message);
}

export const fetchNotifications = async (userId: string) =>
  unwrap(
    await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  );

export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true, read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchUnreadNotificationCount(userId: string) {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/* ---------- AI ---------- */

export const fetchConversations = async (userId: string) =>
  unwrap(
    await supabase
      .from("ai_conversations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  );

export const fetchMessages = async (conversationId: string) =>
  unwrap(
    await supabase
      .from("ai_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at")
      .limit(150),
  );

export async function startConversation(userId: string, title: string) {
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({ user_id: userId, title })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function addMessage(
  conversationId: string,
  userId: string,
  role: string,
  content: string,
) {
  const { error } = await supabase
    .from("ai_messages")
    .insert({ conversation_id: conversationId, user_id: userId, role, content });
  if (error) throw new Error(error.message);
}

/* ---------- church membership ---------- */

export async function joinChurch(userId: string, churchId: string) {
  const { error } = await supabase
    .from("church_members")
    .upsert({ user_id: userId, church_id: churchId }, { onConflict: "user_id,church_id" });
  if (error) throw new Error(error.message);
}

export async function leaveChurch(userId: string, churchId: string) {
  const { error } = await supabase
    .from("church_members")
    .delete()
    .eq("user_id", userId)
    .eq("church_id", churchId);
  if (error) throw new Error(error.message);
}

export async function fetchMyChurchIds(userId: string) {
  const { data, error } = await supabase
    .from("church_members")
    .select("church_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.church_id);
}

/* ---------- followers / following ---------- */

export type PersonRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  verified: boolean;
};

/**
 * `user_follows` declares no foreign key to `profiles`, so PostgREST cannot
 * embed the profile in one request — the ids and the people are fetched
 * separately, then put back in the order the follow rows came in (newest
 * follow first).
 */
async function peopleByIds(ids: string[]): Promise<PersonRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, bio, verified")
    .in("id", ids);
  if (error) throw new Error(error.message);

  const byId = new Map((data ?? []).map((p) => [p.id, p as PersonRow]));
  return ids.map((id) => byId.get(id)).filter((p): p is PersonRow => !!p);
}

/** The people who follow this user, most recent follower first. */
export async function fetchFollowers(userId: string): Promise<PersonRow[]> {
  const { data, error } = await supabase
    .from("user_follows")
    .select("follower_id, created_at")
    .eq("following_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return peopleByIds((data ?? []).map((r) => r.follower_id));
}

/** The people this user follows, most recently followed first. */
export async function fetchFollowing(userId: string): Promise<PersonRow[]> {
  const { data, error } = await supabase
    .from("user_follows")
    .select("following_id, created_at")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return peopleByIds((data ?? []).map((r) => r.following_id));
}

/**
 * Everyone else on Nuru, for the Community People tab.
 *
 * Without somewhere to discover people, nobody can follow anybody and the
 * Followers/Following lists stay permanently empty.
 */
export const PEOPLE_PAGE_SIZE = 50;

export async function fetchPeoplePage(userId: string, page: number): Promise<PersonRow[]> {
  const from = page * PEOPLE_PAGE_SIZE;
  const to = from + PEOPLE_PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, bio, verified")
    .neq("id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw new Error(error.message);
  return (data ?? []) as PersonRow[];
}

/* ---------- moderation ---------- */

export type ModerationItem = {
  id: string;
  source: "report" | "reel" | "external_reel";
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  target: string;
  source_url: string | null;
};

export async function fetchModerationQueue(): Promise<ModerationItem[]> {
  const [generic, reels, external] = await Promise.all([
    supabase
      .from("reports")
      .select("id, target_type, target_id, reason, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("reel_reports")
      .select("id, reel_id, reason, details, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("external_reel_reports")
      .select("id, external_reel_id, reason, details, source_url, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  for (const result of [generic, reels, external]) {
    if (result.error) throw new Error(result.error.message);
  }

  const rows: ModerationItem[] = [
    ...(generic.data ?? []).map((row) => ({
      id: row.id,
      source: "report" as const,
      reason: row.reason,
      details: null,
      status: row.status,
      created_at: row.created_at,
      target: `${row.target_type} · ${row.target_id}`,
      source_url: null,
    })),
    ...(reels.data ?? []).map((row) => ({
      id: row.id,
      source: "reel" as const,
      reason: row.reason,
      details: row.details,
      status: row.status,
      created_at: row.created_at,
      target: `Reel · ${row.reel_id}`,
      source_url: null,
    })),
    ...(external.data ?? []).map((row) => ({
      id: row.id,
      source: "external_reel" as const,
      reason: row.reason,
      details: row.details,
      status: row.status,
      created_at: row.created_at,
      target: `External Reel · ${row.external_reel_id}`,
      source_url: row.source_url,
    })),
  ];

  return rows.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export async function updateModerationStatus(
  source: ModerationItem["source"],
  id: string,
  status: "reviewing" | "resolved" | "dismissed",
) {
  const table =
    source === "report" ? "reports" : source === "reel" ? "reel_reports" : "external_reel_reports";

  const { error } = await supabase.from(table).update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchDevotionalLibrary(search = "", page = 0) {
  let q = supabase
    .from("devotionals")
    .select("*")
    .lte("publish_date", new Date().toISOString().slice(0, 10))
    .order("publish_date", { ascending: false })
    .order("id")
    .range(page * 24, page * 24 + 23);
  const term = search.trim().replace(/[%_,()]/g, " ");
  if (term)
    q = q.or(`title.ilike.%${term}%,subtitle.ilike.%${term}%,scripture_ref.ilike.%${term}%`);
  return unwrap(await q);
}
