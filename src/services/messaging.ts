import { supabase } from "@/integrations/supabase/client";
import { fetchCallHistory } from "./calls";
import { callHistoryLabel } from "@/lib/callHistory";
import type { Database } from "@/integrations/supabase/types";
import { chatAttachmentInfo } from "@/lib/chatAttachments";
import { directChatFilter } from "@/lib/chatPagination";

type DirectRow = Database["public"]["Tables"]["direct_messages"]["Row"];
type GroupRow = Database["public"]["Tables"]["group_chat_messages"]["Row"];
type MentorRow = Database["public"]["Tables"]["mentor_chat_messages"]["Row"];

export type MessageType = "text" | "voice" | "sticker" | "image" | "video" | "file" | "location";

export type ChatMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  message_type: MessageType;
  attachment_path: string | null;
  attachment_duration_ms: number | null;
  sticker_code: string | null;
  delivered_at: string | null;
  read_at: string | null;
};

export type MentorMessage = ChatMessage & {
  mentor_id: string;
  requester_id: string;
};

export type ChatTarget =
  { mentor: string; requester: string } | { group: string } | { user: string; self: string };

export const CHAT_LIMIT = 50;

export type DirectThread = {
  peer_id: string;
  body: string;
  created_at: string;
  sender_id: string;
  message_type: MessageType;
  delivered_at: string | null;
  read_at: string | null;
};

export type ChatProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  verified: boolean;
};

export type SendMessageOptions = {
  messageType?: MessageType;
  attachmentPath?: string | null;
  attachmentDurationMs?: number | null;
  stickerCode?: string | null;
};

function normalizeMessage(row: DirectRow | GroupRow | MentorRow): ChatMessage {
  const rich = row as DirectRow | GroupRow;
  return {
    id: row.id,
    sender_id: row.sender_id,
    body: row.body,
    created_at: row.created_at,
    message_type: ("message_type" in rich ? rich.message_type : "text") as MessageType,
    attachment_path: "attachment_path" in rich ? rich.attachment_path : null,
    attachment_duration_ms: "attachment_duration_ms" in rich ? rich.attachment_duration_ms : null,
    sticker_code: "sticker_code" in rich ? rich.sticker_code : null,
    delivered_at: "delivered_at" in rich ? rich.delivered_at : null,
    read_at: "read_at" in rich ? rich.read_at : null,
  };
}

export async function fetchChatMessages(
  target: ChatTarget,
  before?: Pick<ChatMessage, "created_at" | "id">,
) {
  if ("group" in target) {
    let q = supabase.from("group_chat_messages").select("*").eq("group_id", target.group);
    if (before) {
      q = q.or(
        `created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`,
      );
    }
    const { data, error } = await q
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(CHAT_LIMIT);
    if (error) throw new Error("Couldn't load messages. Please retry.");
    return (data ?? []).reverse().map(normalizeMessage);
  }

  if ("user" in target) {
    // Keep the peer constraint and cursor in ONE PostgREST logic tree:
    // calling .or() twice overwrites the first filter and mixes conversations.
    const q = supabase
      .from("direct_messages")
      .select("*")
      .or(directChatFilter(target.self, target.user, before));
    const { data, error } = await q
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(CHAT_LIMIT);
    if (error) throw new Error("Couldn't load messages. Please retry.");
    return (data ?? []).reverse().map(normalizeMessage);
  }

  let q = supabase
    .from("mentor_chat_messages")
    .select("*")
    .eq("mentor_id", target.mentor)
    .eq("requester_id", target.requester);
  if (before) {
    q = q.or(
      `created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`,
    );
  }
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(CHAT_LIMIT);
  if (error) throw new Error("Couldn't load messages. Please retry.");
  return (data ?? []).reverse().map(normalizeMessage);
}

export async function sendChatMessage(
  target: ChatTarget,
  senderId: string,
  body: string,
  id: string,
  options: SendMessageOptions = {},
) {
  const messageType = options.messageType ?? "text";
  const text = body.trim();
  if (!text || text.length > 2000) {
    throw new Error("Write a message of up to 2,000 characters.");
  }

  if ("group" in target) {
    const { error } = await supabase.from("group_chat_messages").insert({
      id,
      group_id: target.group,
      sender_id: senderId,
      body: text,
      message_type: messageType,
      attachment_path: options.attachmentPath ?? null,
      attachment_duration_ms: options.attachmentDurationMs ?? null,
      sticker_code: options.stickerCode ?? null,
    });
    if (error && error.code !== "23505") {
      throw new Error("Message wasn't confirmed. Check your connection and retry.");
    }
    return;
  }

  if ("user" in target) {
    const { error } = await supabase.from("direct_messages").insert({
      id,
      sender_id: senderId,
      recipient_id: target.user,
      body: text,
      message_type: messageType,
      attachment_path: options.attachmentPath ?? null,
      attachment_duration_ms: options.attachmentDurationMs ?? null,
      sticker_code: options.stickerCode ?? null,
    });
    if (error && error.code !== "23505") {
      throw new Error("Message wasn't confirmed. Check your connection and retry.");
    }
    return;
  }

  if (messageType !== "text") {
    throw new Error("Voice notes and stickers are available in people and group chats.");
  }
  const { error } = await supabase.from("mentor_chat_messages").insert({
    id,
    sender_id: senderId,
    body: text,
    mentor_id: target.mentor,
    requester_id: target.requester,
  });
  if (error && error.code !== "23505") {
    throw new Error("Message wasn't confirmed. Check your connection and retry.");
  }
}

export async function uploadVoiceNote(target: ChatTarget, senderId: string, blob: Blob) {
  if ("mentor" in target) throw new Error("Voice notes are not available in mentor chats yet.");
  const extension = blob.type.includes("ogg") ? "ogg" : blob.type.includes("mp4") ? "m4a" : "webm";
  const id = crypto.randomUUID();
  const path =
    "group" in target
      ? `group/${target.group}/${senderId}/${id}.${extension}`
      : `direct/${senderId}/${target.user}/${id}.${extension}`;
  const { error } = await supabase.storage.from("chat-media").upload(path, blob, {
    contentType: blob.type || "audio/webm",
    upsert: false,
  });
  if (error) throw new Error("Couldn't upload the voice note. Please try again.");
  return path;
}

export async function removeChatMedia(path: string) {
  await supabase.storage.from("chat-media").remove([path]);
}

export async function createChatMediaSignedUrl(path: string) {
  const { data, error } = await supabase.storage.from("chat-media").createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) throw new Error("Couldn't load this attachment.");
  return data.signedUrl;
}

export async function downloadChatMedia(path: string) {
  const { data, error } = await supabase.storage.from("chat-media").download(path);
  if (error || !data) throw new Error("Couldn't download this attachment. Please retry.");
  return data;
}

export async function markDirectMessagesDelivered(userId: string) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("direct_messages")
    .update({ delivered_at: now })
    .eq("recipient_id", userId)
    .is("delivered_at", null);
  if (error) throw new Error(error.message);
}

export async function markDirectThreadRead(userId: string, peerId: string) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("direct_messages")
    .update({ delivered_at: now, read_at: now })
    .eq("recipient_id", userId)
    .eq("sender_id", peerId)
    .is("read_at", null);
  if (error) throw new Error(error.message);
}

export async function touchDirectPresence(userId: string, peerId: string) {
  const { error } = await supabase.from("direct_presence").upsert(
    {
      user_id: userId,
      peer_id: peerId,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id,peer_id" },
  );
  if (error) throw new Error("Couldn't update chat presence.");
}

export async function fetchDirectPeerOnline(userId: string, peerId: string) {
  const { data, error } = await supabase
    .from("direct_presence")
    .select("last_seen_at")
    .eq("user_id", peerId)
    .eq("peer_id", userId)
    .maybeSingle();
  if (error) throw new Error("Couldn't check online status.");
  if (!data?.last_seen_at) return false;
  return Date.now() - new Date(data.last_seen_at).getTime() < 45_000;
}

export async function fetchDirectThreads(userId: string) {
  const { data, error } = await supabase
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
        message_type: message.message_type as MessageType,
        delivered_at: message.delivered_at,
        read_at: message.read_at,
      });
    }
  }
  for (const call of await fetchCallHistory(userId)) {
    const peerId = call.caller_id === userId ? call.callee_id : call.caller_id;
    const previous = threads.get(peerId);
    if (!previous || previous.created_at < call.created_at)
      threads.set(peerId, {
        peer_id: peerId,
        body: callHistoryLabel(call, userId),
        created_at: call.created_at,
        sender_id: call.caller_id,
        message_type: "text",
        delivered_at: null,
        read_at: null,
      });
  }
  return [...threads.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function fetchMentorThreads() {
  const threads: MentorMessage[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from("mentor_chat_threads")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + 499);
    if (error) throw new Error("Couldn't load conversations.");
    threads.push(
      ...(data ?? []).map((row) => ({
        ...normalizeMessage(row as MentorRow),
        mentor_id: row.mentor_id!,
        requester_id: row.requester_id!,
      })),
    );
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
  const { data, error } = await supabase.rpc("create_chat_group", {
    group_name: name.trim(),
    group_description: description.trim(),
  });
  if (error) throw new Error("Couldn't create this group. Please retry.");
  return data;
}

export async function uploadChatFile(target: ChatTarget, senderId: string, file: File) {
  const { extension: ext, mime } = chatAttachmentInfo(file);
  if ("mentor" in target) throw new Error("Attachments are available in people and group chats.");
  const id = crypto.randomUUID();
  const path =
    "group" in target
      ? `group/${target.group}/${senderId}/${id}.${ext}`
      : `direct/${senderId}/${target.user}/${id}.${ext}`;
  const { error } = await supabase.storage
    .from("chat-media")
    .upload(path, file, { contentType: mime, upsert: false });
  if (error) throw new Error("Couldn't upload this file. Please retry.");
  return path;
}
