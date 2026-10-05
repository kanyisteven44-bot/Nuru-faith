import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type CallKind = "audio" | "video";
export type CallStatus = "ringing" | "active" | "declined" | "ended" | "missed";

export async function createCallSession(input: {
  callerId: string;
  calleeId: string;
  kind: CallKind;
  offer: RTCSessionDescriptionInit;
}) {
  const { data, error } = await supabase
    .from("call_sessions")
    .insert({
      caller_id: input.callerId,
      callee_id: input.calleeId,
      kind: input.kind,
      offer: input.offer as unknown as Json,
    })
    .select("*")
    .single();
  if (error) throw new Error("Couldn't start the call.");
  return data;
}

export async function fetchCallSession(callId: string) {
  const { data, error } = await supabase
    .from("call_sessions")
    .select("*")
    .eq("id", callId)
    .maybeSingle();
  if (error) throw new Error("Couldn't update the call.");
  return data;
}

export async function fetchIncomingCall(userId: string) {
  const cutoff = new Date(Date.now() - 90_000).toISOString();
  const { data, error } = await supabase
    .from("call_sessions")
    .select("*")
    .eq("callee_id", userId)
    .eq("status", "ringing")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Couldn't check incoming calls.");
  return data;
}

export async function answerCallSession(callId: string, answer: RTCSessionDescriptionInit) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("call_sessions")
    .update({
      answer: answer as unknown as Json,
      status: "active",
      answered_at: now,
    })
    .eq("id", callId)
    .eq("status", "ringing")
    .select("id")
    .single();
  if (error) throw new Error("This call is no longer ringing. Ask the caller to try again.");
}

export async function endCallSession(callId: string, status: "ended" | "declined" = "ended") {
  const { error } = await supabase
    .from("call_sessions")
    .update({ status, ended_at: new Date().toISOString() })
    .eq("id", callId);
  if (error) throw new Error("Couldn't end the call.");
}

export function waitForIceGatheringComplete(peer: RTCPeerConnection) {
  if (peer.iceGatheringState === "complete") return Promise.resolve();
  return new Promise<void>((resolve) => {
    const onState = () => {
      if (peer.iceGatheringState === "complete") {
        peer.removeEventListener("icegatheringstatechange", onState);
        resolve();
      }
    };
    peer.addEventListener("icegatheringstatechange", onState);
    window.setTimeout(() => {
      peer.removeEventListener("icegatheringstatechange", onState);
      resolve();
    }, 8000);
  });
}
