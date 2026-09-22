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
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw new Error(error.message);
}

export async function fetchMyRoles(userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role, church_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

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
  return (data ?? []).map((r) => r.interest);
}

/* ---------- churches & groups ---------- */

export const fetchChurches = async (search?: string) => {
  let q = supabase.from("churches").select("*").order("verified", { ascending: false }).limit(30);
  if (search) q = q.ilike("name", `%${search}%`);
  return unwrap(await q);
};

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

export const fetchPosts = async (limit = 20) => {
  const rows = unwrap(
    await supabase
      .from("posts")
      .select("*, profiles(full_name, username, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(limit),
  );
  return rows.map((row) => ({ ...row, ...authorFields(row.profiles) }));
};

export async function createPost(input: {
  author_id: string;
  kind: string;
  body: string;
  scripture_ref?: string | null;
  group_id?: string | null;
}) {
  const { error } = await supabase.from("posts").insert(input as never);
  if (error) throw new Error(error.message);
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
      .order("created_at", { ascending: true }),
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

export const fetchPrayerRequests = async () =>
  unwrap(
    await supabase
      .from("prayer_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30),
  );

export async function createPrayerRequest(userId: string, body: string, isAnonymous: boolean) {
  const { error } = await supabase
    .from("prayer_requests")
    .insert({ user_id: userId, body, is_anonymous: isAnonymous });
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
  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------- AI ---------- */

export const fetchConversations = async (userId: string) =>
  unwrap(
    await supabase
      .from("ai_conversations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  );

export const fetchMessages = async (conversationId: string) =>
  unwrap(
    await supabase
      .from("ai_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at"),
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
