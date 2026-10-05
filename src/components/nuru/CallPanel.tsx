import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff, X } from "lucide-react";
import { Avatar } from "@/components/nuru/AppShell";
import {
  answerCallSession,
  createCallSession,
  endCallSession,
  fetchCallSession,
  waitForIceGatheringComplete,
  type CallKind,
} from "@/services/calls";
import type { ChatProfile } from "@/services/messaging";
import { cn } from "@/lib/utils";

type IncomingCall = {
  id: string;
  kind: string;
  offer: unknown;
  caller_id: string;
};

export function CallPanel({
  userId,
  peer,
  kind,
  incoming,
  onClose,
}: {
  userId: string;
  peer: ChatProfile;
  kind: CallKind;
  incoming?: IncomingCall | null;
  onClose: () => void;
}) {
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream>(new MediaStream());
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);
  const appliedAnswer = useRef(false);
  const [callId, setCallId] = useState(incoming?.id ?? "");
  const [status, setStatus] = useState(incoming ? "Connecting…" : "Calling…");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(kind === "audio");

  useEffect(() => {
    let disposed = false;
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peerConnection.current = pc;

    pc.ontrack = (event) => {
      for (const track of event.streams[0]?.getTracks() ?? [event.track]) {
        if (!remoteStream.current.getTracks().some((existing) => existing.id === track.id)) {
          remoteStream.current.addTrack(track);
        }
      }
      if (remoteVideo.current) remoteVideo.current.srcObject = remoteStream.current;
      if (remoteAudio.current) remoteAudio.current.srcObject = remoteStream.current;
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setStatus("Connected");
      if (["failed", "disconnected"].includes(pc.connectionState)) {
        setStatus("Connection interrupted");
      }
    };

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: kind === "video",
        });
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        localStream.current = stream;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        if (localVideo.current) localVideo.current.srcObject = stream;

        if (incoming) {
          await pc.setRemoteDescription(incoming.offer as RTCSessionDescriptionInit);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await waitForIceGatheringComplete(pc);
          if (!pc.localDescription) throw new Error("Call answer was not created.");
          await answerCallSession(incoming.id, pc.localDescription.toJSON());
          setCallId(incoming.id);
          setStatus("Connecting…");
        } else {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await waitForIceGatheringComplete(pc);
          if (!pc.localDescription) throw new Error("Call offer was not created.");
          const session = await createCallSession({
            callerId: userId,
            calleeId: peer.id,
            kind,
            offer: pc.localDescription.toJSON(),
          });
          setCallId(session.id);
          setStatus("Ringing…");
        }
      } catch (callError) {
        setError(
          callError instanceof Error
            ? callError.message
            : "Microphone or camera access is required for this call.",
        );
      }
    }

    void start();

    return () => {
      disposed = true;
      pc.close();
      peerConnection.current = null;
      localStream.current?.getTracks().forEach((track) => track.stop());
      localStream.current = null;
      remoteStream.current.getTracks().forEach((track) => track.stop());
      remoteStream.current = new MediaStream();
    };
  }, [incoming, kind, peer.id, userId]);

  useEffect(() => {
    if (!callId) return;
    const timer = window.setInterval(() => {
      void fetchCallSession(callId).then(async (session) => {
        if (!session) return;
        if (
          !incoming &&
          session.answer &&
          !appliedAnswer.current &&
          peerConnection.current
        ) {
          appliedAnswer.current = true;
          await peerConnection.current.setRemoteDescription(
            session.answer as RTCSessionDescriptionInit,
          );
          setStatus("Connecting…");
        }
        if (session.status === "active") setStatus("Connected");
        if (session.status === "declined") {
          setStatus("Call declined");
          window.setTimeout(onClose, 900);
        }
        if (session.status === "ended" || session.status === "missed") {
          setStatus("Call ended");
          window.setTimeout(onClose, 700);
        }
      });
    }, 1200);
    return () => window.clearInterval(timer);
  }, [callId, incoming, onClose]);

  function toggleMute() {
    const next = !muted;
    localStream.current?.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
  }

  function toggleCamera() {
    if (kind !== "video") return;
    const next = !cameraOff;
    localStream.current?.getVideoTracks().forEach((track) => {
      track.enabled = !next;
    });
    setCameraOff(next);
  }

  async function end() {
    if (callId) {
      try {
        await endCallSession(callId);
      } catch {
        // The local call still closes even if the status update fails.
      }
    }
    onClose();
  }

  const name = peer.full_name || peer.username || "Nuru member";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#07111f]/95 p-4 text-white">
      <div className="relative flex h-full w-full max-w-lg flex-col overflow-hidden rounded-[32px] bg-[#0b1728] shadow-2xl">
        <button
          type="button"
          onClick={() => void end()}
          aria-label="Close call"
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur"
        >
          <X className="h-5 w-5" />
        </button>

        {kind === "video" ? (
          <div className="relative min-h-0 flex-1 bg-black">
            <video
              ref={remoteVideo}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />
            <video
              ref={localVideo}
              autoPlay
              muted
              playsInline
              className="absolute bottom-5 right-5 h-36 w-28 rounded-2xl border border-white/20 bg-[#14243b] object-cover shadow-xl"
            />
            <div className="absolute left-0 right-0 top-0 bg-gradient-to-b from-black/55 to-transparent p-6 pt-8">
              <p className="text-xl font-bold">{name}</p>
              <p className="mt-1 text-sm text-white/70">{status}</p>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 text-center">
            <Avatar
              url={peer.avatar_url}
              name={name}
              seed={peer.id}
              size="lg"
              className="h-32 w-32 border-white/20 text-4xl"
            />
            <h2 className="mt-6 font-display text-3xl font-bold">{name}</h2>
            {peer.username && <p className="mt-1 text-sm text-white/55">@{peer.username}</p>}
            <p className="mt-4 text-sm font-semibold text-white/75">{status}</p>
          </div>
        )}

        <audio ref={remoteAudio} autoPlay className="hidden" />

        {error && (
          <div className="mx-5 mb-3 rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        <div className="flex items-center justify-center gap-5 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Unmute microphone" : "Mute microphone"}
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full",
              muted ? "bg-white text-[#0b1728]" : "bg-white/12",
            )}
          >
            {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </button>

          {kind === "video" && (
            <button
              type="button"
              onClick={toggleCamera}
              aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full",
                cameraOff ? "bg-white text-[#0b1728]" : "bg-white/12",
              )}
            >
              {cameraOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
            </button>
          )}

          <button
            type="button"
            onClick={() => void end()}
            aria-label="End call"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 shadow-lg"
          >
            <PhoneOff className="h-7 w-7" />
          </button>
        </div>
      </div>
    </div>
  );
}
