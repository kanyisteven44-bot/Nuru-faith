import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Phone, Video, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { endCallSession, fetchIncomingCall, type CallKind } from "@/services/calls";
import { fetchChatProfiles, markDirectMessagesDelivered, type ChatProfile } from "@/services/messaging";
import { CallPanel } from "./CallPanel";
import { Avatar } from "./AppShell";

type ActiveCall = {
  kind: CallKind;
  peer: ChatProfile;
  incoming?: { id: string; kind: string; offer: unknown; caller_id: string };
};
const CallContext = createContext<{
  startCall: (kind: CallKind, peer: ChatProfile) => void;
  activeCall: ActiveCall | null;
} | null>(null);
export function useCallManager() {
  const value = useContext(CallContext);
  if (!value) throw new Error("Call manager unavailable");
  return value;
}
export function CallManager({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [error, setError] = useState("");
  const [sound, setSound] = useState(true);
  const audio = useRef<AudioContext | null>(null);
  const incoming = useQuery({
    queryKey: ["incoming-call", userId],
    queryFn: () => fetchIncomingCall(userId!),
    enabled: !!userId && !activeCall,
    // Realtime (below) refreshes this instantly and Web Push covers hidden tabs;
    // the poll is only a fallback, so keep it slow enough to scale.
    refetchInterval: activeCall ? false : 10_000,
    refetchIntervalInBackground: false,
  });
  const callerId = incoming.data?.caller_id;
  const profiles = useQuery({
    queryKey: ["incoming-profile", callerId],
    queryFn: () => fetchChatProfiles([callerId!]),
    enabled: !!callerId,
  });
  const peer = callerId
    ? (profiles.data?.[callerId] ?? {
        id: callerId,
        full_name: "Nuru member",
        username: null,
        avatar_url: null,
        verified: false,
      })
    : null;
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const markDelivered = async () => {
      try {
        await markDirectMessagesDelivered(userId);
        if (active) {
          void qc.invalidateQueries({ queryKey: ["direct-threads", userId] });
          void qc.invalidateQueries({ queryKey: ["chat-messages", userId] });
        }
      } catch {
        // Delivery receipts are best-effort and retry on the next online event.
      }
    };
    void markDelivered();
    const deliveryChannel = supabase
      .channel(`message-delivery-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `recipient_id=eq.${userId}`,
        },
        () => void markDelivered(),
      )
      .subscribe();
    const onFocus = () => void markDelivered();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      void supabase.removeChannel(deliveryChannel);
    };
  }, [userId, qc]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`incoming-calls-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_sessions", filter: `callee_id=eq.${userId}` },
        () => void qc.invalidateQueries({ queryKey: ["incoming-call", userId] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, qc]);
  useEffect(() => {
    const unlock = () => {
      if (!window.AudioContext) return;
      if (!audio.current) audio.current = new AudioContext();
      void audio.current.resume().catch(() => {});
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      void audio.current?.close();
      audio.current = null;
    };
  }, []);
  useEffect(() => {
    if (!incoming.data?.id || activeCall || !sound) return;
    const ring = () => {
      const context = audio.current;
      if (!context || context.state !== "running") return;
      for (const frequency of [440, 480]) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, context.currentTime);
        gain.gain.linearRampToValueAtTime(0.045, context.currentTime + 0.04);
        gain.gain.setValueAtTime(0.045, context.currentTime + 0.6);
        gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.7);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.75);
      }
    };
    ring();
    const timer = window.setInterval(ring, 2500);
    return () => window.clearInterval(timer);
  }, [incoming.data?.id, activeCall, sound]);
  async function decline() {
    if (!incoming.data) return;
    try {
      await endCallSession(incoming.data.id, "declined");
      setError("");
      await incoming.refetch();
    } catch {
      setError("Couldn't decline. Please retry.");
    }
  }
  function accept() {
    if (!incoming.data || !peer) return;
    setError("");
    setActiveCall({
      kind: incoming.data.kind as CallKind,
      peer,
      incoming: {
        id: incoming.data.id,
        kind: incoming.data.kind,
        offer: incoming.data.offer,
        caller_id: incoming.data.caller_id,
      },
    });
  }
  return (
    <CallContext.Provider
      value={{
        activeCall,
        startCall: (kind, peer) => {
          if (!activeCall) setActiveCall({ kind, peer });
        },
      }}
    >
      {children}
      {incoming.data && peer && !activeCall && (
        <section
          role="dialog"
          aria-modal="false"
          aria-label="Incoming call"
          className="fixed inset-x-3 top-[max(1rem,env(safe-area-inset-top))] z-[100] mx-auto max-w-md rounded-3xl border border-violet-400/40 bg-[#10182b] p-5 text-white shadow-2xl"
        >
          <div className="flex items-center gap-3">
            <Avatar
              url={peer.avatar_url}
              name={peer.full_name || peer.username || "Nuru member"}
              seed={peer.id}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">
                {peer.full_name || peer.username || "Nuru member"}
              </p>
              <p className="flex items-center gap-2 text-sm text-violet-200">
                {incoming.data.kind === "video" ? (
                  <Video className="h-4 w-4" />
                ) : (
                  <Phone className="h-4 w-4" />
                )}
                Incoming {incoming.data.kind} call
              </p>
            </div>
            <button
              type="button"
              aria-label={sound ? "Mute ringtone" : "Enable ringtone"}
              onClick={() => setSound((v) => !v)}
            >
              {sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm text-rose-300">
              {error}
            </p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => void decline()}
              className="min-h-12 rounded-full bg-rose-500 font-bold"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={accept}
              className="min-h-12 rounded-full bg-emerald-500 font-bold"
            >
              Answer
            </button>
          </div>
        </section>
      )}
      {activeCall && userId && (
        <CallPanel
          userId={userId}
          peer={activeCall.peer}
          kind={activeCall.kind}
          incoming={activeCall.incoming ?? null}
          onClose={() => {
            setActiveCall(null);
            void incoming.refetch();
          }}
        />
      )}
    </CallContext.Provider>
  );
}
