import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ChatMessage = { id: string; sender_id: string; body: string; created_at: string };
export type MentorMessage = ChatMessage & { mentor_id: string; requester_id: string };
type GroupMessage = ChatMessage & { group_id: string };
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
export type ChatTarget = { mentor: string; requester: string } | { group: string };
export const CHAT_LIMIT = 50;

export async function fetchChatMessages(
  target: ChatTarget,
  before?: Pick<ChatMessage, "created_at" | "id">,
) {
  let q =
    "group" in target
      ? chat.from("group_chat_messages").select("*").eq("group_id", target.group)
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
  return (data ?? []).reverse();
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
      : await chat
          .from("mentor_chat_messages")
          .insert({ ...row, mentor_id: target.mentor, requester_id: target.requester });
  // A retry of the same UUID cannot deliver the message twice.
  if (error && error.code !== "23505")
    throw new Error("Message wasn't confirmed. Check your connection and retry.");
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

export async function fetchChatNames(ids: string[]) {
  if (!ids.length) return {} as Record<string, string>;
  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,username")
    .in("id", [...new Set(ids)]);
  if (error) throw new Error("Couldn't load participant names.");
  return Object.fromEntries(
    (data ?? []).map((p) => [p.id, p.full_name || p.username || "Nuru member"]),
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
