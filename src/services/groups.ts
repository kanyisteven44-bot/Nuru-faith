import { supabase } from "@/integrations/supabase/client";

export async function fetchGroup(groupId: string) {
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchGroupPosts(groupId: string) {
  const { data, error } = await supabase
    .from("posts")
    .select("*, profiles(full_name,username,avatar_url)")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      ...row,
      author_name: profile?.full_name ?? row.author_name ?? "Nuru member",
      author_handle: profile?.username ?? row.author_handle ?? null,
      author_avatar_url: profile?.avatar_url ?? row.author_avatar_url ?? null,
    };
  });
}

export async function fetchGroupReels(groupId: string) {
  const { data, error } = await supabase
    .from("reels")
    .select("*")
    .eq("group_id", groupId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(36);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchGroupMembers(groupId: string) {
  const { data, error } = await supabase
    .from("group_members")
    .select("id,user_id,role,created_at")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true })
    .limit(250);
  if (error) throw new Error(error.message);
  const ids = (data ?? []).map((row) => row.user_id);
  if (!ids.length) return [];
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id,full_name,username,avatar_url,verified")
    .in("id", ids);
  if (profileError) throw new Error(profileError.message);
  const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return (data ?? []).map((membership) => ({
    ...membership,
    profile: byId.get(membership.user_id) ?? null,
  }));
}
