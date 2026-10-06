import { supabase } from "@/integrations/supabase/client";

export type GroupCallKind = "audio" | "video";

export type GroupCallRoom = {
  id: string;
  group_id: string;
  kind: GroupCallKind;
  status: "active" | "ended";
  created_by: string;
  created_at: string;
  ended_at: string | null;
};

export type GroupCallParticipant = {
  room_id: string;
  user_id: string;
  joined_at: string;
  updated_at: string;
};

export type GroupCallSignal = {
  id: string;
  room_id: string;
  sender_id: string;
  recipient_id: string;
  signal_type: "offer" | "answer";
  payload: RTCSessionDescriptionInit;
  created_at: string;
};

type UntypedQuery = {
  select: (...args: any[]) => any;
  insert: (...args: any[]) => any;
  update: (...args: any[]) => any;
  delete: (...args: any[]) => any;
  upsert: (...args: any[]) => any;
};

function table(name: string) {
  return (supabase as unknown as { from: (value: string) => UntypedQuery }).from(name);
}

export async function fetchActiveGroupCall(groupId: string) {
  const { data, error } = await table("group_call_rooms")
    .select("*")
    .eq("group_id", groupId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Couldn't check the group call.");
  if (!data) return null;

  const room = data as GroupCallRoom;
  // Never keep a crashed room blocking a group forever.
  if (Date.now() - new Date(room.created_at).getTime() > 4 * 60 * 60 * 1000) {
    await table("group_call_rooms")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", room.id);
    return null;
  }
  return room;
}

export async function startOrJoinGroupCall(
  groupId: string,
  userId: string,
  kind: GroupCallKind,
) {
  let room = await fetchActiveGroupCall(groupId);
  if (!room) {
    const created = await table("group_call_rooms")
      .insert({ group_id: groupId, created_by: userId, kind })
      .select("*")
      .single();
    if (created.error) {
      // Another member may have created the room at the same moment.
      if (created.error.code !== "23505") throw new Error("Couldn't start the group call.");
      room = await fetchActiveGroupCall(groupId);
      if (!room) throw new Error("Couldn't open the group call.");
    } else {
      room = created.data as GroupCallRoom;
    }
  }

  const joined = await table("group_call_participants").upsert(
    {
      room_id: room.id,
      user_id: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "room_id,user_id" },
  );
  if (joined.error) throw new Error("Couldn't join the group call.");
  return room;
}

export async function heartbeatGroupCall(roomId: string, userId: string) {
  const { error } = await table("group_call_participants")
    .update({ updated_at: new Date().toISOString() })
    .eq("room_id", roomId)
    .eq("user_id", userId);
  if (error) throw new Error("Couldn't refresh your group call connection.");
}

export async function fetchGroupCallParticipants(roomId: string) {
  const { data, error } = await table("group_call_participants")
    .select("*")
    .eq("room_id", roomId)
    .order("joined_at");
  if (error) throw new Error("Couldn't load call participants.");
  return (data ?? []) as GroupCallParticipant[];
}

export async function sendGroupCallSignal(input: {
  roomId: string;
  senderId: string;
  recipientId: string;
  signalType: "offer" | "answer";
  payload: RTCSessionDescriptionInit;
}) {
  const { error } = await table("group_call_signals").insert({
    room_id: input.roomId,
    sender_id: input.senderId,
    recipient_id: input.recipientId,
    signal_type: input.signalType,
    payload: input.payload,
  });
  if (error) throw new Error("Couldn't connect this group call.");
}

export async function fetchPendingGroupCallSignals(roomId: string, userId: string) {
  const recent = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data, error } = await table("group_call_signals")
    .select("*")
    .eq("room_id", roomId)
    .eq("recipient_id", userId)
    .gte("created_at", recent)
    .order("created_at");
  if (error) throw new Error("Couldn't receive group call signalling.");
  return (data ?? []) as GroupCallSignal[];
}

export async function clearGroupCallSignal(id: string) {
  await table("group_call_signals").delete().eq("id", id);
}

export async function leaveGroupCall(roomId: string, userId: string) {
  const removed = await table("group_call_participants")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", userId);
  if (removed.error) return;

  const count = await table("group_call_participants")
    .select("user_id", { count: "exact", head: true })
    .eq("room_id", roomId);
  if (!count.error && (count.count ?? 0) === 0) {
    await table("group_call_rooms")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", roomId);
  }
}
