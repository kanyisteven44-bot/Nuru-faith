import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Read both generations of watch history with bounded URLs and complete row pagination. */
export async function fetchWatchedVideoIds(
  client: SupabaseClient<Database>,
  userId: string,
  videoIds: string[],
): Promise<Set<string>> {
  const watched = new Set<string>();
  const ids = [...new Set(videoIds)];
  for (let start = 0; start < ids.length; start += 200) {
    const batch = ids.slice(start, start + 200);
    let offset = 0;
    while (true) {
      const { data, error } = await client
        .from("media_history")
        .select("external_id")
        .eq("user_id", userId)
        .eq("source", "youtube_reel")
        .in("external_id", batch)
        .order("id")
        .range(offset, offset + 999);
      if (error) throw new Error("Watch history could not load. Please try again.");
      for (const row of data ?? []) if (row.external_id) watched.add(row.external_id);
      if ((data?.length ?? 0) < 1000) break;
      offset += 1000;
    }
    offset = 0;
    while (true) {
      const { data, error } = await client
        .from("reel_views")
        .select("reels!inner(external_id)")
        .eq("user_id", userId)
        .in("reels.external_id", batch)
        .order("id")
        .range(offset, offset + 999);
      if (error) throw new Error("Watch history could not load. Please try again.");
      for (const row of data ?? []) if (row.reels?.external_id) watched.add(row.reels.external_id);
      if ((data?.length ?? 0) < 1000) break;
      offset += 1000;
    }
  }
  return watched;
}
