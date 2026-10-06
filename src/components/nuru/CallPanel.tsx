import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
  X,
  Sparkles,
  Volume2,
  VolumeX,
  RotateCcw,
} from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { getCallIceServers } from "@/lib/callIce.functions";
import { cn } from "@/lib/utils";

const effects = {
  Natural: "none",
  Warm: "sepia(.25) saturate(1.15)",
  Glow: "brightness(1.12) contrast(.95)",
  Mono: "grayscale(1)",
  Dreamy: "saturate(.8) contrast(.9) brightness(1.08)",
  "Low light": "brightness(1.35) contrast(1.08)",
  Hearts: "none",
  Sparkles: "none",
};

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
  const [effect, setEffect] = useState("Natural");
  const effectRef = useRef("Natural");
  effectRef.current = effect;
  const [effectsAvailable, setEffectsAvailable] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [showEffects, setShowEffects] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [seconds, setSeconds] = useState(0);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
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
    if (status !== "Connected") return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    let disposed = false;
    let frame = 0;
    let rawStream: MediaStream | null = null;
    let sourceVideo: HTMLVideoElement | null = null;
    setError("");
    setMediaReady(false);
    setRemoteReady(false);
    setEffectsAvailable(false);
    setStatus("Requesting permission…");
    appliedAnswer.current = false;
    remoteStream.current = new MediaStream();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peerConnection.current = pc;

    pc.ontrack = (event) => {
      if (disposed) return;
      setRemoteReady(true);
      for (const track of event.streams[0]?.getTracks() ?? [event.track]) {
        if (!remoteStream.current!.getTracks().some((existing) => existing.id === track.id)) {
          remoteStream.current!.addTrack(track);
        }
      }
      if (remoteVideo.current) remoteVideo.current.srcObject = remoteStream.current;
      if (remoteAudio.current) remoteAudio.current.srcObject = remoteStream.current;
    };

    pc.onconnectionstatechange = () => {
      if (disposed) return;
      if (pc.connectionState === "connected") {
        setStatus("Connected");
        clearTimeout(timeout);
      }
      if (["failed", "disconnected"].includes(pc.connectionState)) {
        setStatus("Connection interrupted");
        setError(
          "The call connection was interrupted. End the call and try again. Some mobile or workplace networks need a relay server.",
        );
      }
    };

    async function start() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError || !session) throw new Error("Sign in again before calling.");

        let iceServers: RTCIceServer[];
        try {
          // The global TanStack auth middleware attaches the current Supabase
          // access token to server functions. Do not override it at the call site.
          iceServers = await getCallIceServers();
        } catch (iceError) {
          const message = iceError instanceof Error ? iceError.message : "";
          if (!message.includes("Unauthorized")) throw iceError;

          // A tab can hold an expired/stale access token after sleeping. Refresh
          // once, then let the global middleware attach the new access token.
          const refreshed = await supabase.auth.refreshSession();
          if (refreshed.error || !refreshed.data.session) {
            throw new Error("Your sign-in session expired. Sign in again, then retry the call.");
          }
          iceServers = await getCallIceServers();
        }
        if (disposed) return;
        pc.setConfiguration({ iceServers });
        if (userId === peer.id)
          throw new Error("Choose another Nuru member to call. You cannot call your own account.");
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error("Open Nuru in Chrome or Safari over HTTPS to use calls.");
        let stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: kind === "video",
        });
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        rawStream = stream;
        if (kind === "video") {
          const canvas = document.createElement("canvas");
          canvas.width = 640;
          canvas.height = 480;
          const context = canvas.getContext("2d");
          if (context && typeof canvas.captureStream === "function" && "filter" in context) {
            sourceVideo = document.createElement("video");
            sourceVideo.muted = true;
            sourceVideo.playsInline = true;
            sourceVideo.srcObject = rawStream;
            await sourceVideo.play();
            if (disposed) {
              rawStream.getTracks().forEach((track) => track.stop());
              return;
            }
            canvas.width = sourceVideo.videoWidth || 640;
            canvas.height = sourceVideo.videoHeight || 480;
            const draw = () => {
              if (disposed || !sourceVideo) return;
              context.filter = effects[effectRef.current as keyof typeof effects] || "none";
              context.drawImage(sourceVideo, 0, 0, canvas.width, canvas.height);
              if (effectRef.current === "Hearts" || effectRef.current === "Sparkles") {
                context.filter = "none";
                context.font = `${Math.round(canvas.width / 20)}px sans-serif`;
                for (let i = 0; i < 9; i++) {
                  const y = (Date.now() / 35 + i * 79) % canvas.height;
                  context.fillText(
                    effectRef.current === "Hearts" ? "💜" : "✨",
                    (i * 97 + 30) % canvas.width,
                    y,
                  );
                }
              }
              frame = requestAnimationFrame(draw);
            };
            draw();
            const filtered = canvas.captureStream(24);
            stream = new MediaStream([...filtered.getVideoTracks(), ...rawStream.getAudioTracks()]);
            setEffectsAvailable(true);
          }
        }
        localStream.current = stream;
        setMediaReady(true);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        if (localVideo.current) localVideo.current.srcObject = stream;

        if (incoming) {
          await pc.setRemoteDescription(incoming.offer as RTCSessionDescriptionInit);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await waitForIceGatheringComplete(pc);
          if (disposed) return;
          if (!pc.localDescription) throw new Error("Call answer was not created.");
          await answerCallSession(incoming.id, pc.localDescription.toJSON());
          setCallId(incoming.id);
          setStatus("Connecting…");
        } else {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await waitForIceGatheringComplete(pc);
          if (disposed) return;
          if (!pc.localDescription) throw new Error("Call offer was not created.");
          const session = await createCallSession({
            callerId: userId,
            calleeId: peer.id,
            kind,
            offer: pc.localDescription.toJSON(),
          });
          if (disposed) {
            await endCallSession(session.id);
            return;
          }
          setCallId(session.id);
          setStatus("Ringing…");
          timeout = setTimeout(() => {
            if (disposed || pc.connectionState === "connected") return;
            setStatus("No answer");
            setError(
              "This call was not connected. Check that the other person has Nuru open, then try again.",
            );
            void endCallSession(session.id, "missed").catch(() => undefined);
          }, 60000);
        }
      } catch (callError) {
        if (disposed) return;
        rawStream?.getTracks().forEach((track) => track.stop());
        cancelAnimationFrame(frame);
        setMediaReady(false);
        setStatus("Call could not start");
        const name = callError instanceof Error ? callError.name : "";
        setError(
          name === "NotAllowedError" || name === "PermissionDeniedError"
            ? "Camera or microphone permission was denied. Open this link in Chrome, allow Camera and Microphone in Site settings, then tap Try again."
            : name === "NotFoundError"
              ? "No camera or microphone was found on this device."
              : name === "NotReadableError"
                ? "Your camera or microphone is busy. Close other apps using it, then try again."
                : callError instanceof Error
                  ? callError.message
                  : "Could not start the call. Please retry.",
        );
      }
    }

    void start();

    return () => {
      disposed = true;
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
      rawStream?.getTracks().forEach((track) => track.stop());
      if (sourceVideo) {
        sourceVideo.pause();
        sourceVideo.srcObject = null;
      }
      pc.close();
      peerConnection.current = null;
      localStream.current?.getTracks().forEach((track) => track.stop());
      localStream.current = null;
      remoteStream.current!.getTracks().forEach((track) => track.stop());
      remoteStream.current = null;
    };
  }, [incoming, kind, peer.id, userId, attempt]);

  useEffect(() => {
    if (!callId) return;
    let active = true;
    let closeTimer: number | undefined;
    const timer = window.setInterval(() => {
      void fetchCallSession(callId)
        .then(async (session) => {
          if (!active || !session) return;
          if (!incoming && session.answer && !appliedAnswer.current && peerConnection.current) {
            appliedAnswer.current = true;
            await peerConnection.current.setRemoteDescription(
              session.answer as unknown as RTCSessionDescriptionInit,
            );
            setStatus("Connecting…");
          }
          if (
            session.status === "active" &&
            peerConnection.current?.connectionState === "connected"
          )
            setStatus("Connected");
          if (session.status === "declined") {
            setStatus("Call declined");
            closeTimer ??= window.setTimeout(() => {
              if (active) closeRef.current();
            }, 900);
          }
          if (session.status === "ended" || session.status === "missed") {
            setStatus("Call ended");
            closeTimer ??= window.setTimeout(() => {
              if (active) closeRef.current();
            }, 700);
          }
        })
        .catch(() => setError("Couldn’t update call status. Check your connection."));
    }, 1200);
    return () => {
      active = false;
      window.clearInterval(timer);
      clearTimeout(closeTimer);
    };
  }, [callId, incoming]);

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
    localStream.current?.getTracks().forEach((track) => track.stop());
    closeRef.current();
    if (callId) {
      try {
        await endCallSession(callId);
      } catch {
        // The local call still closes even if the status update fails.
      }
    }
  }

  const name = peer.full_name || peer.username || "Nuru member";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#07111f]/95 p-4 text-white">
      <div className="relative flex h-full max-h-[860px] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] border border-cyan-200/15 bg-[radial-gradient(ellipse_at_top,#28204a_0%,#0b1728_55%,#17102c_100%)] shadow-2xl">
        <button
          type="button"
          onClick={() => void end()}
          aria-label="Close call"
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur"
        >
          <X className="h-5 w-5" />
        </button>

        {kind === "video" ? (
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {!remoteReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[radial-gradient(ellipse_at_center,#352453,#0b1728_70%)] p-8">
                <div className="rounded-full p-2 ring-2 ring-violet-400/70 shadow-[0_0_60px_#8b5cf655]">
                  <Avatar
                    url={peer.avatar_url}
                    name={name}
                    seed={peer.id}
                    size="lg"
                    className="h-28 w-28 text-4xl"
                  />
                </div>
                <p className="text-lg font-semibold">
                  {error ? "Let’s get you connected" : "Waiting for their camera…"}
                </p>
              </div>
            )}
            <video
              ref={remoteVideo}
              muted={speakerMuted}
              autoPlay
              playsInline
              className="relative h-full w-full object-cover"
            />
            <video
              ref={localVideo}
              autoPlay
              muted
              playsInline
              className={cn(
                !mediaReady && "hidden",
                "absolute bottom-5 right-5 h-36 w-28 rounded-2xl border border-white/20 bg-[#14243b] object-cover shadow-xl",
              )}
            />
            <div className="absolute left-0 right-0 top-0 bg-gradient-to-b from-black/55 to-transparent p-6 pt-8">
              <p className="text-xl font-bold">{name}</p>
              <p className="mt-1 text-sm text-white/70">{status}</p>
            </div>
          </div>
        ) : (
          <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-8 text-center">
            <div
              aria-hidden="true"
              className="absolute inset-x-6 top-1/2 flex -translate-y-1/2 items-center justify-between opacity-40"
            >
              {Array.from({ length: 28 }, (_, i) => (
                <span
                  key={i}
                  className="w-1.5 rounded-full bg-gradient-to-t from-violet-500 to-pink-300"
                  style={{ height: `${18 + ((i * 37) % 75)}px` }}
                />
              ))}
            </div>
            <Avatar
              url={peer.avatar_url}
              name={name}
              seed={peer.id}
              size="lg"
              className="relative h-32 w-32 border-white/20 text-4xl ring-4 ring-violet-400/50 ring-offset-8 ring-offset-[#17152b] shadow-[0_0_70px_#8b5cf666]"
            />
            <h2 className="mt-6 font-display text-3xl font-bold">{name}</h2>
            {peer.username && <p className="mt-1 text-sm text-white/55">@{peer.username}</p>}
            <p className="mt-4 text-sm font-semibold text-white/75">{status}</p>
          </div>
        )}

        {kind === "audio" && (
          <audio ref={remoteAudio} muted={speakerMuted} autoPlay className="hidden" />
        )}
        <div className="px-5 pt-3 text-center text-xs text-white/60" role="status">
          {status === "Connected"
            ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
            : status}
        </div>
        {kind === "video" && effectsAvailable && showEffects && (
          <div
            className="flex flex-wrap justify-center gap-2 px-4 pt-4"
            aria-label="Camera effects"
          >
            {Object.keys(effects).map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={effect === name}
                onClick={() => setEffect(name)}
                className={cn(
                  "min-h-10 rounded-full border px-4 text-xs font-semibold transition-colors",
                  effect === name
                    ? "border-cyan-200 bg-cyan-200 text-slate-950"
                    : "border-white/15 bg-white/5 text-white/75",
                )}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="mx-5 mb-3 rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-100">
            <p role="alert">{error}</p>
            {!mediaReady && (
              <button
                type="button"
                onClick={() => setAttempt((value) => value + 1)}
                className="mt-3 flex min-h-10 items-center gap-2 rounded-full bg-white/15 px-4 font-semibold"
              >
                <RotateCcw className="h-4 w-4" />
                Try again
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-3 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5">
          <button
            type="button"
            onClick={toggleMute}
            disabled={!mediaReady}
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
              disabled={!mediaReady}
              aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full",
                cameraOff ? "bg-white text-[#0b1728]" : "bg-white/12",
              )}
            >
              {cameraOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
            </button>
          )}

          {kind === "video" && (
            <button
              type="button"
              disabled={!effectsAvailable}
              onClick={() => setShowEffects((value) => !value)}
              aria-label="Camera effects"
              aria-expanded={showEffects}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/25 disabled:opacity-35"
            >
              <Sparkles className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setSpeakerMuted((value) => !value)}
            aria-label={speakerMuted ? "Unmute speaker" : "Mute speaker"}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10"
          >
            {speakerMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
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
