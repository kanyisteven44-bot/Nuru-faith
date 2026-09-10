import { supabase } from "@/integrations/supabase/client";

export type AiRole = "user" | "assistant";

export type AiMessage = {
  id: string;
  conversation_id: string;
  role: AiRole;
  content: string;
  created_at: string;
};

export type AiConversation = {
  id: string;
  title: string;
  context_type: string | null;
  context_label: string | null;
  context_id: string | null;
  updated_at: string;
};

export async function fetchConversations(userId: string) {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id, title, context_type, context_label, context_id, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);
  return (data ?? []) as AiConversation[];
}

export async function fetchMessages(conversationId: string) {
  const { data, error } = await supabase
    .from("ai_messages")
    .select("id, conversation_id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as AiMessage[];
}

export async function createConversation(input: {
  userId: string;
  title: string;
  contextType?: string | null;
  contextLabel?: string | null;
  contextId?: string | null;
}) {
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({
      user_id: input.userId,
      title: input.title.slice(0, 80),
      context_type: input.contextType ?? null,
      context_label: input.contextLabel ?? null,
      context_id:
        input.contextId &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.contextId)
          ? input.contextId
          : null,
    })
    .select("id, title, context_type, context_label, context_id, updated_at")
    .single();
  if (error) throw new Error(error.message);
  return data as AiConversation;
}

export async function saveMessage(input: {
  conversationId: string;
  userId: string;
  role: AiRole;
  content: string;
}) {
  const { data, error } = await supabase
    .from("ai_messages")
    .insert({
      conversation_id: input.conversationId,
      user_id: input.userId,
      role: input.role,
      content: input.content,
    })
    .select("id, conversation_id, role, content, created_at")
    .single();
  if (error) throw new Error(error.message);
  await supabase
    .from("ai_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", input.conversationId);
  return data as AiMessage;
}

export async function deleteConversation(id: string) {
  await supabase.from("ai_messages").delete().eq("conversation_id", id);
  const { error } = await supabase.from("ai_conversations").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function saveAiResponse(userId: string, messageId: string) {
  const { error } = await supabase
    .from("ai_saved_responses")
    .insert({ user_id: userId, message_id: messageId });
  if (error && !error.message.includes("duplicate")) throw new Error(error.message);
}

export async function addPrayerJournalEntry(input: {
  userId: string;
  title: string | null;
  content: string;
  scriptureRef?: string | null;
  source?: string | null;
  sourceId?: string | null;
}) {
  const { error } = await supabase.from("prayer_journal").insert({
    user_id: input.userId,
    title: input.title,
    content: input.content,
    scripture_ref: input.scriptureRef ?? null,
    source: input.source ?? null,
    source_id: input.sourceId ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function fetchPrayerJournal(userId: string) {
  const { data, error } = await supabase
    .from("prayer_journal")
    .select("id, title, content, scripture_ref, source, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}
