import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff, Volume2, VolumeX, X } from "lucide-react";
import { Avatar } from "@/components/nuru/AppShell";
import { getCallIceServers } from "@/lib/callIce.functions";
import { waitForIceGatheringComplete } from "@/services/calls";
import {
  clearGroupCallSignal,
  fetchGroupCallParticipants,
  fetchPendingGroupCallSignals,
  heartbeatGroupCall,
  leaveGroupCall,
  sendGroupCallSignal,
  type GroupCallRoom,
  type GroupCallSignal,
} from "@/services/groupCalls";
import { fetchChatProfiles, type ChatProfile } from "@/services/messaging";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type RemoteMedia = { peerId: string; stream: MediaStream };

export function GroupCallPanel({
  room,
  groupName,
  userId,
  onClose,
}: {
  room: GroupCallRoom;
  groupName: string;
  userId: string;
  onClose: () => void;
}) {
  const [status, setStatus] = useState("Joining group call…");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(room.kind === "audio");
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [localMedia, setLocalMedia] = useState<MediaStream | null>(null);
  const [participantIds, setParticipantIds] = useState<string[]>([userId]);
  const [profiles, setProfiles] = useState<Record<string, ChatProfile>>({});
  const [remoteMedia, setRemoteMedia] = useState<Record<string, RemoteMedia>>({});
  const localStream = useRef<MediaStream | null>(null);
  const peers = useRef(new Map<string, RTCPeerConnection>());
  const offered = useRef(new Set<string>());
  const handledSignals = useRef(new Set<string>());
  const iceServers = useRef<RTCIceServer[]>([]);
  const mounted = useRef(true);

  const refreshParticipants = useCallback(async () => {
    const rows = await fetchGroupCallParticipants(room.id);
    if (!mounted.current) return [] as string[];
    const ids = [...new Set(rows.map((row) => row.user_id))];
    setParticipantIds(ids);
    const nextProfiles = await fetchChatProfiles(ids);
    if (mounted.current) setProfiles(nextProfiles);
    for (const peerId of [...peers.current.keys()]) {
      if (!ids.includes(peerId)) {
        peers.current.get(peerId)?.close();
        peers.current.delete(peerId);
        offered.current.delete(peerId);
        setRemoteMedia((current) => {
          const next = { ...current };
          delete next[peerId];
          return next;
        });
      }
    }
    return ids;
  }, [room.id]);

  const ensurePeer = useCallback((peerId: string) => {
    const existing = peers.current.get(peerId);
    if (existing) return existing;
    const pc = new RTCPeerConnection({
      iceServers: iceServers.current,
      iceCandidatePoolSize: 4,
    });
    const stream = localStream.current;
    stream?.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      const incoming = event.streams[0] ?? new MediaStream([event.track]);
      setRemoteMedia((current) => ({
        ...current,
        [peerId]: { peerId, stream: incoming },
      }));
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setStatus("Connected");
      if (pc.connectionState === "failed") {
        setError("One connection failed. That participant can leave and rejoin the call.");
      }
    };
    peers.current.set(peerId, pc);
    return pc;
  }, []);

  const offerPeer = useCallback(
    async (peerId: string) => {
      if (peerId === userId || offered.current.has(peerId)) return;
      if (userId.localeCompare(peerId) >= 0) return;
      offered.current.add(peerId);
      const pc = ensurePeer(peerId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await waitForIceGatheringComplete(pc);
        if (!pc.localDescription) return;
        await sendGroupCallSignal({
          roomId: room.id,
          senderId: userId,
          recipientId: peerId,
          signalType: "offer",
          payload: pc.localDescription.toJSON(),
        });
      } catch (offerError) {
        offered.current.delete(peerId);
        setError(offerError instanceof Error ? offerError.message : "Couldn't connect a participant.");
      }
    },
    [ensurePeer, room.id, userId],
  );

  const handleSignal = useCallback(
    async (signal: GroupCallSignal) => {
      if (
        handledSignals.current.has(signal.id) ||
        signal.recipient_id !== userId ||
        signal.sender_id === userId
      ) return;

      handledSignals.current.add(signal.id);
      const pc = ensurePeer(signal.sender_id);
      try {
        if (signal.signal_type === "offer") {
          await pc.setRemoteDescription(signal.payload);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await waitForIceGatheringComplete(pc);
          if (!pc.localDescription) return;
          await sendGroupCallSignal({
            roomId: room.id,
            senderId: userId,
            recipientId: signal.sender_id,
            signalType: "answer",
            payload: pc.localDescription.toJSON(),
          });
        } else if (signal.signal_type === "answer" && pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(signal.payload);
        }
        await clearGroupCallSignal(signal.id);
      } catch (signalError) {
        setError(signalError instanceof Error ? signalError.message : "Group call connection failed.");
      }
    },
    [ensurePeer, room.id, userId],
  );

  useEffect(() => {
    mounted.current = true;
    let channel = supabase.channel("group-call-db-" + room.id);
    let heartbeat: number | undefined;
    let raw: MediaStream | null = null;

    async function start() {
      try {
        setError("");
        try {
          iceServers.current = await getCallIceServers();
        } catch (iceError) {
          const message = iceError instanceof Error ? iceError.message : "";
          if (!message.includes("Unauthorized")) throw iceError;
          const refreshed = await supabase.auth.refreshSession();
          if (refreshed.error || !refreshed.data.session) {
            throw new Error("Your sign-in session expired. Sign in again, then retry the group call.");
          }
          iceServers.current = await getCallIceServers();
        }
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Open Nuru in Chrome or Safari over HTTPS to use group calls.");
        }

        raw = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: room.kind === "video",
        });
        if (!mounted.current) {
          raw.getTracks().forEach((track) => track.stop());
          return;
        }
        localStream.current = raw;
        setLocalMedia(raw);

        channel = channel
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "group_call_participants",
              filter: "room_id=eq." + room.id,
            },
            async () => {
              const ids = await refreshParticipants();
              for (const peerId of ids) void offerPeer(peerId);
            },
          )
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "group_call_signals",
              filter: "room_id=eq." + room.id,
            },
            (payload) => {
              void handleSignal(payload.new as GroupCallSignal);
            },
          );

        channel.subscribe(async (subscription) => {
          if (subscription !== "SUBSCRIBED") return;
          setStatus("Connecting…");
          const ids = await refreshParticipants();
          for (const peerId of ids) void offerPeer(peerId);
          const pending = await fetchPendingGroupCallSignals(room.id, userId);
          for (const signal of pending) await handleSignal(signal);
          await heartbeatGroupCall(room.id, userId);
          heartbeat = window.setInterval(() => {
            void heartbeatGroupCall(room.id, userId);
          }, 20_000);
        });
      } catch (startError) {
        setStatus("Could not join");
        setError(startError instanceof Error ? startError.message : "Couldn't join the group call.");
      }
    }

    void start();
    return () => {
      mounted.current = false;
      if (heartbeat) window.clearInterval(heartbeat);
      raw?.getTracks().forEach((track) => track.stop());
      localStream.current?.getTracks().forEach((track) => track.stop());
      localStream.current = null;
      setLocalMedia(null);
      peers.current.forEach((pc) => pc.close());
      peers.current.clear();
      void supabase.removeChannel(channel);
      void leaveGroupCall(room.id, userId);
    };
  }, [handleSignal, offerPeer, refreshParticipants, room.id, room.kind, userId]);

  function toggleMute() {
    const next = !muted;
    localStream.current?.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
  }

  function toggleCamera() {
    if (room.kind !== "video") return;
    const next = !cameraOff;
    localStream.current?.getVideoTracks().forEach((track) => {
      track.enabled = !next;
    });
    setCameraOff(next);
  }

  async function leave() {
    await leaveGroupCall(room.id, userId);
    onClose();
  }

  const others = participantIds.filter((id) => id !== userId);
  const remoteList = Object.values(remoteMedia);

  return (
    <div className="fixed inset-0 z-[110] bg-[#06101d] text-white">
      <div className="mx-auto flex h-dvh w-full max-w-5xl flex-col">
        <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{groupName}</p>
            <p className="text-xs text-white/55">
              {room.kind === "video" ? "Group video call" : "Group audio call"} · {participantIds.length} joined
            </p>
          </div>
          <button
            type="button"
            onClick={() => void leave()}
            aria-label="Leave group call"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-4">
          {room.kind === "video" ? (
            <div className="grid min-h-full grid-cols-1 content-center gap-3 sm:grid-cols-2">
              <VideoTile
                stream={localMedia}
                muted
                label="You"
                profile={profiles[userId]}
                seed={userId}
              />
              {remoteList.map(({ peerId, stream }) => (
                <VideoTile
                  key={peerId}
                  stream={stream}
                  muted={speakerMuted}
                  label={profiles[peerId]?.full_name || profiles[peerId]?.username || "Nuru member"}
                  profile={profiles[peerId]}
                  seed={peerId}
                />
              ))}
              {others.filter((id) => !remoteMedia[id]).map((id) => (
                <WaitingTile key={id} peerId={id} profile={profiles[id]} />
              ))}
            </div>
          ) : (
            <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center">
              <div className="grid w-full grid-cols-2 gap-5 sm:grid-cols-3">
                {participantIds.map((id) => {
                  const profile = profiles[id];
                  const name = id === userId ? "You" : profile?.full_name || profile?.username || "Nuru member";
                  return (
                    <div key={id} className="flex flex-col items-center gap-2 text-center">
                      <div className="rounded-full p-1 ring-2 ring-cyan-300/35">
                        <Avatar
                          url={profile?.avatar_url ?? null}
                          name={name}
                          seed={id}
                          size="lg"
                          className="h-20 w-20 text-xl"
                        />
                      </div>
                      <p className="max-w-28 truncate text-xs font-semibold">{name}</p>
                    </div>
                  );
                })}
              </div>
              {remoteList.map(({ peerId, stream }) => (
                <RemoteAudio key={peerId} stream={stream} muted={speakerMuted} />
              ))}
            </div>
          )}
        </main>

        <div className="px-5 text-center">
          <p className="text-xs text-white/55" role="status">{status}</p>
          {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
        </div>

        <footer className="flex items-center justify-center gap-3 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
          <button
            type="button"
            onClick={toggleMute}
            className={cn("flex h-14 w-14 items-center justify-center rounded-full", muted ? "bg-white text-[#06101d]" : "bg-white/10")}
            aria-label={muted ? "Unmute microphone" : "Mute microphone"}
          >
            {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </button>
          {room.kind === "video" && (
            <button
              type="button"
              onClick={toggleCamera}
              className={cn("flex h-14 w-14 items-center justify-center rounded-full", cameraOff ? "bg-white text-[#06101d]" : "bg-white/10")}
              aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
            >
              {cameraOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
            </button>
          )}
          <button
            type="button"
            onClick={() => setSpeakerMuted((value) => !value)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10"
            aria-label={speakerMuted ? "Unmute speaker" : "Mute speaker"}
          >
            {speakerMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
          </button>
          <button
            type="button"
            onClick={() => void leave()}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500"
            aria-label="Leave call"
          >
            <PhoneOff className="h-7 w-7" />
          </button>
        </footer>
      </div>
    </div>
  );
}

function VideoTile({
  stream,
  muted,
  label,
  profile,
  seed,
}: {
  stream: MediaStream | null;
  muted: boolean;
  label: string;
  profile: ChatProfile | undefined;
  seed: string;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <div className="relative aspect-video min-h-44 overflow-hidden rounded-3xl bg-[#102139]">
      {stream ? (
        <video ref={ref} autoPlay playsInline muted={muted} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center">
          <Avatar
            url={profile?.avatar_url ?? null}
            name={label}
            seed={seed}
            size="lg"
            className="h-20 w-20 text-xl"
          />
        </div>
      )}
      <span className="absolute bottom-3 left-3 rounded-full bg-black/45 px-3 py-1 text-xs font-semibold backdrop-blur">
        {label}
      </span>
    </div>
  );
}

function WaitingTile({ peerId, profile }: { peerId: string; profile: ChatProfile | undefined }) {
  const name = profile?.full_name || profile?.username || "Nuru member";
  return (
    <div className="relative flex aspect-video min-h-44 items-center justify-center rounded-3xl bg-[#102139]">
      <div className="text-center">
        <Avatar
          url={profile?.avatar_url ?? null}
          name={name}
          seed={peerId}
          size="lg"
          className="mx-auto h-20 w-20 text-xl"
        />
        <p className="mt-3 text-xs text-white/55">Connecting…</p>
      </div>
      <span className="absolute bottom-3 left-3 rounded-full bg-black/45 px-3 py-1 text-xs font-semibold">
        {name}
      </span>
    </div>
  );
}

function RemoteAudio({ stream, muted }: { stream: MediaStream; muted: boolean }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <audio ref={ref} autoPlay muted={muted} className="hidden" />;
}
