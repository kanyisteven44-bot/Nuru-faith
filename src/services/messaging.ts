import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ChatMessage = { id: string; sender_id: string; body: string; created_at: string };
export type MentorMessage = ChatMessage & { mentor_id: string; requester_id: string };
type GroupMessage = ChatMessage & { group_id: string };
export type DirectMessage = ChatMessage & { recipient_id: string };
type Table<Row extends ChatMessage> = {
  Row: Row;
  Insert: Omit<Row, "created_at">;
  Update: never;
  Relationships: [];
};
type ChatDatabase = {
  public: Omit<Database["public"], "Tables" | "Views" | "Functions"> & {
    Tables: Database["public"]["Tables"] & {
      mentor_chat_messages: Table<MentorMessage>;
      group_chat_messages: Table<GroupMessage>;
      direct_messages: Table<DirectMessage>;
    };
    Functions: Database["public"]["Functions"] & {
      create_chat_group: {
        Args: { group_name: string; group_description: string };
        Returns: string;
      };
    };
    Views: Database["public"]["Views"] & {
      mentor_chat_threads: { Row: MentorMessage; Relationships: [] };
    };
  };
};
const chat = supabase as unknown as SupabaseClient<ChatDatabase>;
export type ChatTarget =
  | { mentor: string; requester: string }
  | { group: string }
  | { user: string; self: string };
export const CHAT_LIMIT = 50;

export type DirectThread = {
  peer_id: string;
  body: string;
  created_at: string;
  sender_id: string;
};

export type ChatProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  verified: boolean;
};

export async function fetchChatMessages(
  target: ChatTarget,
  before?: Pick<ChatMessage, "created_at" | "id">,
) {
  let q =
    "group" in target
      ? chat.from("group_chat_messages").select("*").eq("group_id", target.group)
      : "user" in target
        ? chat
            .from("direct_messages")
            .select("*")
            .or(
              `and(sender_id.eq.${target.self},recipient_id.eq.${target.user}),and(sender_id.eq.${target.user},recipient_id.eq.${target.self})`,
            )
        : chat
            .from("mentor_chat_messages")
            .select("*")
            .eq("mentor_id", target.mentor)
            .eq("requester_id", target.requester);
  if (before)
    q = q.or(
      `created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`,
    );
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(CHAT_LIMIT);
  if (error) throw new Error("Couldn't load messages. Please retry.");
  return (data ?? []).reverse() as ChatMessage[];
}

export async function sendChatMessage(
  target: ChatTarget,
  senderId: string,
  body: string,
  id: string,
) {
  const text = body.trim();
  if (!text || text.length > 2000) throw new Error("Write a message of up to 2,000 characters.");
  const row = { id, sender_id: senderId, body: text };
  const { error } =
    "group" in target
      ? await chat.from("group_chat_messages").insert({ ...row, group_id: target.group })
      : "user" in target
        ? await chat.from("direct_messages").insert({ ...row, recipient_id: target.user })
        : await chat
            .from("mentor_chat_messages")
            .insert({ ...row, mentor_id: target.mentor, requester_id: target.requester });
  // A retry of the same UUID cannot deliver the message twice.
  if (error && error.code !== "23505")
    throw new Error("Message wasn't confirmed. Check your connection and retry.");
}

export async function fetchDirectThreads(userId: string) {
  const { data, error } = await chat
    .from("direct_messages")
    .select("*")
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(500);
  if (error) throw new Error("Couldn't load direct conversations.");

  const threads = new Map<string, DirectThread>();
  for (const message of data ?? []) {
    const peerId = message.sender_id === userId ? message.recipient_id : message.sender_id;
    if (!threads.has(peerId)) {
      threads.set(peerId, {
        peer_id: peerId,
        body: message.body,
        created_at: message.created_at,
        sender_id: message.sender_id,
      });
    }
  }
  return [...threads.values()];
}

export async function fetchMentorThreads() {
  const threads: MentorMessage[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await chat
      .from("mentor_chat_threads")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + 499);
    if (error) throw new Error("Couldn't load conversations.");
    threads.push(...(data ?? []));
    if (!data || data.length < 500) break;
  }
  return threads;
}

export async function fetchChatProfiles(ids: string[]) {
  if (!ids.length) return {} as Record<string, ChatProfile>;
  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,username,avatar_url,verified")
    .in("id", [...new Set(ids)]);
  if (error) throw new Error("Couldn't load participant profiles.");
  return Object.fromEntries((data ?? []).map((profile) => [profile.id, profile]));
}

export async function fetchChatNames(ids: string[]) {
  const profiles = await fetchChatProfiles(ids);
  return Object.fromEntries(
    Object.values(profiles).map((p) => [p.id, p.full_name || p.username || "Nuru member"]),
  );
}

export async function createChatGroup(name: string, description: string) {
  const { data, error } = await chat.rpc("create_chat_group", {
    group_name: name.trim(),
    group_description: description.trim(),
  });
  if (error) throw new Error("Couldn't create this group. Please retry.");
  return data;
}
