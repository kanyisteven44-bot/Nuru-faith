import { supabase } from "@/integrations/supabase/client";

export type SeriesRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  category: string;
  difficulty: string;
  estimated_duration: number;
  session_count: number;
  status: string;
  is_featured: boolean;
  church_id: string | null;
};

export type SessionScripture = {
  id: string;
  session_id: string;
  reference: string;
  book: string | null;
  scripture_role: "primary" | "supporting" | "further_reading";
  explanation: string | null;
  position: number;
};

export type SeriesSession = {
  id: string;
  series_id: string;
  position: number;
  title: string;
  introduction: string | null;
  context_note: string | null;
  main_teaching: string | null;
  connections: string | null;
  reflection_questions: string[];
  prayer: string | null;
  practical_action: string | null;
  discussion_prompt: string | null;
  /** Optional handwritten words stacked over the session hero. */
  hero_words: string[] | null;
  /** Optional handwritten phrase set beside the Scripture card. */
  pull_quote: string | null;
};

export type SeriesProgress = {
  series_id: string;
  current_session_id: string | null;
  progress_percent: number;
  completed_at: string | null;
};

const SERIES_COLUMNS =
  "id, title, slug, description, cover_image, category, difficulty, estimated_duration, session_count, status, is_featured, church_id";

export const SERIES_PAGE_SIZE = 60;

export async function fetchSeries(
  search?: string,
  category?: string,
  page = 0,
  pageSize = SERIES_PAGE_SIZE,
): Promise<SeriesRow[]> {
  const from = Math.max(0, page) * pageSize;
  let q = supabase
    .from("scripture_series")
    .select(SERIES_COLUMNS)
    .eq("status", "published")
    .order("is_featured", { ascending: false })
    .order("title")
    .range(from, from + pageSize - 1);

  const cleanedSearch = search?.trim().replace(/[%_,()]/g, " ");
  if (cleanedSearch) {
    q = q.or(
      `title.ilike.%${cleanedSearch}%,description.ilike.%${cleanedSearch}%,category.ilike.%${cleanedSearch}%`,
    );
  }
  if (category) q = q.eq("category", category);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as SeriesRow[];
}

/**
 * The library seed (`nuru-library-*` slugs) generates 1,200 filler series
 * for browse/search volume. Screens that spotlight Nuru's hand-written
 * series (Series home) fetch by slug directly so that bulk content never
 * crowds out the curated set.
 */
export async function fetchCuratedSeries(slugs: string[]): Promise<SeriesRow[]> {
  const { data, error } = await supabase
    .from("scripture_series")
    .select(SERIES_COLUMNS)
    .in("slug", slugs);
  if (error) throw new Error(error.message);
  return (data ?? []) as SeriesRow[];
}

export async function fetchSeriesBySlug(slug: string): Promise<SeriesRow | null> {
  const { data, error } = await supabase
    .from("scripture_series")
    .select(SERIES_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as SeriesRow | null;
}

export async function fetchSeriesById(id: string): Promise<SeriesRow | null> {
  const { data, error } = await supabase
    .from("scripture_series")
    .select(SERIES_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as SeriesRow | null;
}

export async function fetchSessions(seriesId: string): Promise<SeriesSession[]> {
  const { data, error } = await supabase
    .from("scripture_series_sessions")
    .select("*")
    .eq("series_id", seriesId)
    .order("position");
  if (error) throw new Error(error.message);
  return (data ?? []) as SeriesSession[];
}

export async function fetchSessionScriptures(sessionId: string): Promise<SessionScripture[]> {
  const { data, error } = await supabase
    .from("session_scriptures")
    .select("*")
    .eq("session_id", sessionId)
    .order("position");
  if (error) throw new Error(error.message);
  return (data ?? []) as SessionScripture[];
}

/* ---------- progress ---------- */

export async function fetchMyProgress(userId: string): Promise<SeriesProgress[]> {
  const { data, error } = await supabase
    .from("series_progress")
    .select("series_id, current_session_id, progress_percent, completed_at")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []) as SeriesProgress[];
}

export async function fetchMyCompletedSessions(
  userId: string,
  seriesId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("session_progress")
    .select("session_id, completed")
    .eq("user_id", userId)
    .eq("series_id", seriesId)
    .eq("completed", true);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.session_id);
}

export async function startSeries(userId: string, seriesId: string, firstSessionId: string | null) {
  const { error } = await supabase
    .from("series_progress")
    .upsert(
      { user_id: userId, series_id: seriesId, current_session_id: firstSessionId },
      { onConflict: "user_id,series_id", ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
}

export async function completeSession(input: {
  userId: string;
  seriesId: string;
  sessionId: string;
  nextSessionId: string | null;
  totalSessions: number;
}) {
  const { userId, seriesId, sessionId, nextSessionId, totalSessions } = input;
  const { error } = await supabase.from("session_progress").upsert(
    {
      user_id: userId,
      series_id: seriesId,
      session_id: sessionId,
      completed: true,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,session_id" },
  );
  if (error) throw new Error(error.message);

  const done = await fetchMyCompletedSessions(userId, seriesId);
  const percent = totalSessions > 0 ? Math.round((done.length / totalSessions) * 100) : 0;
  const { error: pErr } = await supabase.from("series_progress").upsert(
    {
      user_id: userId,
      series_id: seriesId,
      current_session_id: nextSessionId ?? sessionId,
      progress_percent: percent,
      completed_at: percent >= 100 ? new Date().toISOString() : null,
    },
    { onConflict: "user_id,series_id" },
  );
  if (pErr) throw new Error(pErr.message);
  return percent;
}

export async function markActionDone(
  userId: string,
  sessionId: string,
  seriesId: string,
  done: boolean,
) {
  const { error } = await supabase
    .from("session_progress")
    .upsert(
      { user_id: userId, series_id: seriesId, session_id: sessionId, action_done: done },
      { onConflict: "user_id,session_id" },
    );
  if (error) throw new Error(error.message);
}

/* ---------- private reflections ---------- */

export async function fetchReflection(userId: string, sessionId: string) {
  const { data, error } = await supabase
    .from("scripture_reflections")
    .select("content")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.content ?? "";
}

export async function saveReflection(input: {
  userId: string;
  seriesId: string;
  sessionId: string;
  content: string;
}) {
  const { error } = await supabase.from("scripture_reflections").upsert(
    {
      user_id: input.userId,
      series_id: input.seriesId,
      session_id: input.sessionId,
      content: input.content,
    },
    { onConflict: "user_id,session_id" },
  );
  if (error) throw new Error(error.message);
}

/* ---------- saved passages ---------- */

export async function fetchSavedScriptures(userId: string) {
  const { data, error } = await supabase
    .from("saved_scriptures")
    .select("id, reference, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function saveScripture(userId: string, reference: string) {
  const { error } = await supabase
    .from("saved_scriptures")
    .upsert(
      { user_id: userId, reference },
      { onConflict: "user_id,reference", ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
}

export async function removeSavedScripture(userId: string, reference: string) {
  const { error } = await supabase
    .from("saved_scriptures")
    .delete()
    .eq("user_id", userId)
    .eq("reference", reference);
  if (error) throw new Error(error.message);
}

/* ---------- verse highlights ---------- */

export const HIGHLIGHT_COLORS = [
  { key: "yellow", label: "Yellow", swatch: "#f4c453", bgClass: "bg-amber-300/50" },
  { key: "green", label: "Green", swatch: "#86efac", bgClass: "bg-green-300/50" },
  { key: "blue", label: "Blue", swatch: "#93c5fd", bgClass: "bg-blue-300/50" },
  { key: "pink", label: "Pink", swatch: "#f9a8d4", bgClass: "bg-pink-300/50" },
  { key: "purple", label: "Purple", swatch: "#d8b4fe", bgClass: "bg-purple-300/50" },
] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number]["key"];

export type VerseHighlight = {
  id: string;
  reference: string;
  verse: number;
  verse_text: string;
  color: HighlightColor;
  created_at: string;
};

export async function fetchHighlights(
  userId: string,
  reference: string,
): Promise<VerseHighlight[]> {
  const { data, error } = await supabase
    .from("verse_highlights")
    .select("id, reference, verse, verse_text, color, created_at")
    .eq("user_id", userId)
    .eq("reference", reference);
  if (error) throw new Error(error.message);
  return (data ?? []) as VerseHighlight[];
}

export async function fetchAllHighlights(userId: string): Promise<VerseHighlight[]> {
  const { data, error } = await supabase
    .from("verse_highlights")
    .select("id, reference, verse, verse_text, color, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as VerseHighlight[];
}

export async function setHighlight(input: {
  userId: string;
  reference: string;
  verse: number;
  verseText: string;
  color: HighlightColor;
}) {
  const { error } = await supabase.from("verse_highlights").upsert(
    {
      user_id: input.userId,
      reference: input.reference,
      verse: input.verse,
      verse_text: input.verseText,
      color: input.color,
    },
    { onConflict: "user_id,reference,verse" },
  );
  if (error) throw new Error(error.message);
}

export async function removeHighlight(userId: string, reference: string, verse: number) {
  const { error } = await supabase
    .from("verse_highlights")
    .delete()
    .eq("user_id", userId)
    .eq("reference", reference)
    .eq("verse", verse);
  if (error) throw new Error(error.message);
}
