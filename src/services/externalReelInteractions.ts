import { supabase } from "@/integrations/supabase/client";

export type ExternalReelComment = {
  id: string;
  external_reel_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

export async function fetchExternalReelState(userId: string, externalReelId: string) {
  const [
    { data: likes, error: likeError },
    { data: saves, error: saveError },
    { count, error: countError },
  ] = await Promise.all([
    supabase
      .from("external_reel_likes")
      .select("external_reel_id")
      .eq("user_id", userId)
      .eq("external_reel_id", externalReelId)
      .maybeSingle(),
    supabase
      .from("external_reel_saves")
      .select("external_reel_id")
      .eq("user_id", userId)
      .eq("external_reel_id", externalReelId)
      .maybeSingle(),
    supabase
      .from("external_reel_comments")
      .select("id", { count: "exact", head: true })
      .eq("external_reel_id", externalReelId),
  ]);

  if (likeError) throw new Error(likeError.message);
  if (saveError) throw new Error(saveError.message);
  if (countError) throw new Error(countError.message);

  return {
    liked: !!likes,
    saved: !!saves,
    commentCount: count ?? 0,
  };
}

export async function toggleExternalReelLike(
  userId: string,
  externalReelId: string,
  liked: boolean,
) {
  if (liked) {
    const { error } = await supabase
      .from("external_reel_likes")
      .delete()
      .eq("user_id", userId)
      .eq("external_reel_id", externalReelId);
    if (error) throw new Error(error.message);
    return false;
  }

  const { error } = await supabase.from("external_reel_likes").insert({
    user_id: userId,
    external_reel_id: externalReelId,
  });
  if (error) throw new Error(error.message);
  return true;
}

export async function toggleExternalReelSave(
  userId: string,
  externalReelId: string,
  saved: boolean,
) {
  if (saved) {
    const { error } = await supabase
      .from("external_reel_saves")
      .delete()
      .eq("user_id", userId)
      .eq("external_reel_id", externalReelId);
    if (error) throw new Error(error.message);
    return false;
  }

  const { error } = await supabase.from("external_reel_saves").insert({
    user_id: userId,
    external_reel_id: externalReelId,
  });
  if (error) throw new Error(error.message);
  return true;
}

export async function fetchExternalReelComments(externalReelId: string) {
  const { data, error } = await supabase
    .from("external_reel_comments")
    .select("id, external_reel_id, user_id, content, created_at")
    .eq("external_reel_id", externalReelId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ExternalReelComment[];
}

export async function addExternalReelComment(
  userId: string,
  externalReelId: string,
  content: string,
) {
  const { error } = await supabase.from("external_reel_comments").insert({
    user_id: userId,
    external_reel_id: externalReelId,
    content,
  });
  if (error) throw new Error(error.message);
}

export async function deleteExternalReelComment(userId: string, commentId: string) {
  const { error } = await supabase
    .from("external_reel_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
