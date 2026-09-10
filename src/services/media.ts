import { supabase } from "@/integrations/supabase/client";

export type MediaItem = {
  id: string;
  source: string;
  external_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  media_type: string;
  category: string | null;
  creator_name: string | null;
  youtube_channel_id: string | null;
  church_id: string | null;
  audio_url: string | null;
  duration_seconds: number | null;
  scripture_ref: string | null;
  can_download: boolean;
  is_featured: boolean;
};

const ITEM_COLUMNS =
  "id, source, external_id, title, description, thumbnail_url, media_type, category, creator_name, youtube_channel_id, church_id, audio_url, duration_seconds, scripture_ref, can_download, is_featured";

export async function fetchMediaCategories() {
  const { data, error } = await supabase
    .from("media_categories")
    .select("id, slug, name, position")
    .order("position");
  if (error) throw error;
  return data;
}

export async function fetchMediaItems(options?: {
  category?: string;
  mediaType?: string;
  source?: string;
  churchId?: string;
  featuredOnly?: boolean;
  limit?: number;
}) {
  let q = supabase.from("media_items").select(ITEM_COLUMNS).eq("is_approved", true);
  if (options?.category) q = q.eq("category", options.category);
  if (options?.mediaType) q = q.eq("media_type", options.mediaType);
  if (options?.source) q = q.eq("source", options.source);
  if (options?.churchId) q = q.eq("church_id", options.churchId);
  if (options?.featuredOnly) q = q.eq("is_featured", true);
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 20);
  if (error) throw error;
  return (data ?? []) as MediaItem[];
}

export async function fetchMediaPlaylists(options?: {
  kind?: string;
  churchId?: string;
  limit?: number;
}) {
  let q = supabase
    .from("media_playlists")
    .select(
      "id, title, slug, description, cover_url, kind, youtube_playlist_id, church_id, category, is_featured",
    )
    .eq("is_approved", true);
  if (options?.kind) q = q.eq("kind", options.kind);
  if (options?.churchId) q = q.eq("church_id", options.churchId);
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 30);
  if (error) throw error;
  return data ?? [];
}

export async function fetchMediaSources(options?: { sourceType?: string; churchId?: string }) {
  let q = supabase
    .from("media_sources")
    .select(
      "id, name, source_type, youtube_channel_id, church_id, description, avatar_url, is_verified",
    )
    .eq("is_approved", true);
  if (options?.sourceType) q = q.eq("source_type", options.sourceType);
  if (options?.churchId) q = q.eq("church_id", options.churchId);
  const { data, error } = await q.order("name");
  if (error) throw error;
  return data ?? [];
}

/* ---------- saved media ---------- */

export async function fetchMySavedMedia(userId: string) {
  const { data, error } = await supabase
    .from("user_media_saves")
    .select(`item_id, created_at, media_items(${ITEM_COLUMNS})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    savedAt: row.created_at,
    item: row.media_items as unknown as MediaItem | null,
  }));
}

export async function fetchMySavedMediaIds(userId: string) {
  const { data, error } = await supabase
    .from("user_media_saves")
    .select("item_id")
    .eq("user_id", userId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.item_id));
}

export async function toggleSavedMedia(userId: string, itemId: string, saved: boolean) {
  if (saved) {
    const { error } = await supabase
      .from("user_media_saves")
      .delete()
      .eq("user_id", userId)
      .eq("item_id", itemId);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase
    .from("user_media_saves")
    .insert({ user_id: userId, item_id: itemId });
  if (error) throw error;
  return true;
}

/* ---------- history ---------- */

export async function recordMediaHistory(
  userId: string,
  entry: {
    itemId?: string | null;
    source: string;
    externalId?: string | null;
    title: string;
    thumbnailUrl?: string | null;
    mediaType?: string | null;
    progressSeconds?: number;
  },
) {
  const { error } = await supabase.from("media_history").insert({
    user_id: userId,
    item_id: entry.itemId ?? null,
    source: entry.source,
    external_id: entry.externalId ?? null,
    title: entry.title,
    thumbnail_url: entry.thumbnailUrl ?? null,
    media_type: entry.mediaType ?? null,
    progress_seconds: entry.progressSeconds ?? 0,
  });
  if (error) throw error;
}

export async function fetchMediaHistory(userId: string, limit = 40) {
  const { data, error } = await supabase
    .from("media_history")
    .select(
      "id, item_id, source, external_id, title, thumbnail_url, media_type, progress_seconds, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function clearMediaHistory(userId: string) {
  const { error } = await supabase.from("media_history").delete().eq("user_id", userId);
  if (error) throw error;
}

/* ---------- follows ---------- */

export async function fetchMyMediaFollows(userId: string) {
  const { data, error } = await supabase
    .from("user_media_follows")
    .select("source_id")
    .eq("user_id", userId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.source_id));
}

export async function toggleMediaFollow(userId: string, sourceId: string, following: boolean) {
  if (following) {
    const { error } = await supabase
      .from("user_media_follows")
      .delete()
      .eq("user_id", userId)
      .eq("source_id", sourceId);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase
    .from("user_media_follows")
    .insert({ user_id: userId, source_id: sourceId });
  if (error) throw error;
  return true;
}

/* ---------- admin / church admin ---------- */

export async function upsertMediaItem(input: {
  source: string;
  external_id: string;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  media_type: string;
  category?: string | null;
  creator_name?: string | null;
  youtube_channel_id?: string | null;
  church_id?: string | null;
  scripture_ref?: string | null;
  is_approved?: boolean;
  is_featured?: boolean;
  created_by?: string | null;
}) {
  // YouTube media may never be marked downloadable — enforced in the database too.
  const payload = input.source === "youtube" ? { ...input, can_download: false } : input;
  const { data, error } = await supabase
    .from("media_items")
    .upsert(payload, { onConflict: "source,external_id" })
    .select(ITEM_COLUMNS)
    .single();
  if (error) throw error;
  return data as MediaItem;
}

export async function setMediaApproval(
  id: string,
  patch: { is_approved?: boolean; is_featured?: boolean },
) {
  const { error } = await supabase.from("media_items").update(patch).eq("id", id);
  if (error) throw error;
}

export async function upsertMediaSource(input: {
  name: string;
  source_type: string;
  youtube_channel_id?: string | null;
  church_id?: string | null;
  description?: string | null;
  avatar_url?: string | null;
  is_approved?: boolean;
  created_by?: string | null;
}) {
  const { data, error } = await supabase.from("media_sources").insert(input).select("id").single();
  if (error) throw error;
  return data;
}
