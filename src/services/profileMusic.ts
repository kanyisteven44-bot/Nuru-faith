import { supabase } from "@/integrations/supabase/client";
import type { MediaItem } from "@/services/media";

export type ProfileSong = {
  addedAt: string;
  item: MediaItem;
};

// Only approved music can be attached to profiles. RLS also checks ownership
// for inserts/deletes, so clients cannot write to other members' profiles.
export async function fetchProfileMusic(userId: string): Promise<ProfileSong[]> {
  const { data, error } = await supabase
    .from("profile_music")
    .select(
      "item_id, created_at, media_items!inner(id,source,external_id,title,description,thumbnail_url,media_type,category,creator_name,youtube_channel_id,church_id,audio_url,duration_seconds,scripture_ref,can_download,is_featured,language_code,is_approved)",
    )
    .eq("user_id", userId)
    .eq("media_items.is_approved", true)
    .eq("media_items.media_type", "music")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap((row) => {
    const item = row.media_items;
    if (!item || item.media_type !== "music") return [];
    return [{ addedAt: row.created_at, item: item as MediaItem }];
  });
}

export async function addProfileMusic(userId: string, itemId: string): Promise<void> {
  const { error } = await supabase
    .from("profile_music")
    .upsert({ user_id: userId, item_id: itemId }, { onConflict: "user_id,item_id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

export async function removeProfileMusic(userId: string, itemId: string): Promise<void> {
  const { error } = await supabase
    .from("profile_music")
    .delete()
    .eq("user_id", userId)
    .eq("item_id", itemId);
  if (error) throw new Error(error.message);
}
