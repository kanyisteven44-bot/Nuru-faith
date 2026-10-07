import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCheck, Phone, Mic, Send, Sticker, Square, Plus, ImagePlus, Video, MapPin, X } from "lucide-react";
import {
  CHAT_LIMIT,
  createChatMediaSignedUrl,
  fetchChatMessages,
  fetchChatNames,
  fetchDirectPeerOnline,
  markDirectThreadRead,
  touchDirectPresence,
  removeChatMedia,
  sendChatMessage,
  uploadVoiceNote,
  uploadChatFile,
  type ChatMessage,
  type ChatTarget,
} from "@/services/messaging";
import { CardSkeleton, ErrorState } from "@/components/nuru/Primitives";
import { ChatReactionPicker, ChatStickerArt } from "@/components/nuru/ChatReactionPicker";
import { STICKER_BY_ID } from "@/lib/chatReactions";
import { fetchCallHistory } from "@/services/calls";
import { callHistoryLabel, isMissedCall } from "@/lib/callHistory";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function RichChatThread({
  target,
  userId,
  maxHeight = "58dvh",
  fillHeight = false,
}: {
  target: ChatTarget;
  userId: string;
  maxHeight?: string;
  fillHeight?: boolean;
}) {
  const qc = useQueryClient();
  const key = ["chat-messages", userId, target];
  const messages = useQuery({
    queryKey: key,
    queryFn: () => fetchChatMessages(target),
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });
  const callPeer = "user" in target ? target.user : null;
  const peerPresence = useQuery({
    queryKey: ["direct-presence", userId, callPeer],
    enabled: !!callPeer,
    queryFn: () => fetchDirectPeerOnline(userId, callPeer!),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
  const peerOnline = peerPresence.data ?? false;
  const callHistory = useQuery({
    queryKey: ["call-history", userId, callPeer],
    enabled: !!callPeer,
    queryFn: () => fetchCallHistory(userId, callPeer!),
    refetchInterval: 5000,
  });
  const [older, setOlder] = useState<ChatMessage[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showStickers, setShowStickers] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState<{
    blob: Blob;
    duration: number;
    url: string;
  } | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const voiceEffect = "Normal" as string;
  const [showAttachments, setShowAttachments] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<{ file: File; url: string } | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  useEffect(
    () => () => {
      if (attachment) URL.revokeObjectURL(attachment.url);
    },
    [attachment],
  );
  const enhanceVoice = true;
  const voiceContext = useRef<AudioContext | null>(null);
  const mounted = useRef(true);
  const previewUrl = useRef<string | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recorder.current) recorder.current.onstop = null;
      void voiceContext.current?.close();
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    };
  }, []);
  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      setRecordingSeconds(Math.floor((Date.now() - recordingStartedAt.current) / 1000));
      if (Date.now() - recordingStartedAt.current >= 120000) stopVoiceNote();
    }, 250);
    return () => window.clearInterval(timer);
  }, [recording]);
  function discardVoice() {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
    setVoiceDraft(null);
  }
  async function shareAttachment() {
    if (sending || (!attachment && !location)) return;
    setSending(true);
    setError("");
    let path: string | undefined;
    try {
      const id = crypto.randomUUID();
      if (attachment) {
        path = await uploadChatFile(target, userId, attachment.file);
        await sendChatMessage(
          target,
          userId,
          attachment.file.type.startsWith("image/") ? "Photo" : "Video",
          id,
          {
            messageType: attachment.file.type.startsWith("image/") ? "image" : "video",
            attachmentPath: path,
          },
        );
      } else if (location) {
        await sendChatMessage(target, userId, JSON.stringify(location), id, {
          messageType: "location",
        });
      }
      setAttachment(null);
      setLocation(null);
      await qc.invalidateQueries({ queryKey: key });
    } catch (e) {
      if (path) await removeChatMedia(path);
      setError(e instanceof Error ? e.message : "Couldn't send attachment.");
    } finally {
      setSending(false);
    }
  }
  function chooseLocation() {
    setShowAttachments(false);
    setError("");
    if (!navigator.geolocation) {
      setError("Location is unavailable in this browser.");
      return;
    }
    setSending(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mounted.current) return;
        setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setSending(false);
      },
      () => {
        if (mounted.current) {
          setSending(false);
          setError(
            "Couldn't get your location. Allow location in your browser settings and try again.",
          );
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }
  const pending = useRef<{ body: string; id: string } | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const recordingStream = useRef<MediaStream | null>(null);
  const recordingChunks = useRef<BlobPart[]>([]);
  const recordingStartedAt = useRef(0);

  const rows = [
    ...new Map(
      [...(messages.isError ? [] : older), ...(messages.isError ? [] : (messages.data ?? []))].map(
        (message) => [message.id, message],
      ),
    ).values(),
  ].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));

  const timeline = [
    ...rows.map((message) => ({
      id: message.id,
      created_at: message.created_at,
      message,
      call: null,
    })),
    ...(callHistory.data ?? []).map((call) => ({
      id: `call-${call.id}`,
      created_at: call.created_at,
      message: null,
      call,
    })),
  ].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const realtimeKind = "group" in target ? "group" : "user" in target ? "direct" : "mentor";
  const realtimeId =
    "group" in target ? target.group : "user" in target ? target.user : target.mentor;

  useEffect(() => {
    if (!callPeer) return;

    const heartbeat = () => {
      void touchDirectPresence(userId, callPeer).catch(() => undefined);
    };
    heartbeat();
    const timer = window.setInterval(heartbeat, 15_000);

    const presence = supabase
      .channel(`direct-presence-db-${userId}-${callPeer}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "direct_presence",
          filter: `user_id=eq.${callPeer}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ["direct-presence", userId, callPeer] });
        },
      )
      .subscribe();

    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(presence);
    };
  }, [callPeer, qc, userId]);

  useEffect(() => {
    if (realtimeKind === "mentor") return;
    const table = realtimeKind === "group" ? "group_chat_messages" : "direct_messages";
    const refresh = () => {
      void qc.invalidateQueries({ queryKey: ["chat-messages", userId] });
      void qc.invalidateQueries({ queryKey: ["direct-threads", userId] });
    };
    const channel = supabase.channel(`chat-${userId}-${realtimeKind}-${realtimeId}`);
    if (realtimeKind === "group")
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `group_id=eq.${realtimeId}` },
        refresh,
      );
    else {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `recipient_id=eq.${userId}` },
        refresh,
      );
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `sender_id=eq.${userId}` },
        refresh,
      );
    }
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [realtimeKind, realtimeId, userId, qc]);

  const names = useQuery({
    queryKey: ["chat-names", rows.map((message) => message.sender_id)],
    queryFn: () => fetchChatNames(rows.map((message) => message.sender_id)),
    enabled: rows.length > 0,
  });

  useEffect(() => {
    if (messages.data) {
      setOlder((previous) => [
        ...new Map(
          [...previous, ...messages.data!].map((message) => [message.id, message]),
        ).values(),
      ]);
    }
  }, [messages.data]);

  const latest = messages.data?.at(-1)?.id;
  const latestCallId = callHistory.data?.[0]?.id;
  const latestCallStatus = callHistory.data?.[0]?.status;
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "instant", block: "nearest" });
  }, [latest, latestCallId, latestCallStatus]);

  useEffect(() => {
    if (!("user" in target) || !latest) return;
    void markDirectThreadRead(userId, target.user).then(() => {
      void qc.invalidateQueries({ queryKey: key });
      void qc.invalidateQueries({ queryKey: ["direct-threads", userId] });
    });
  }, [latest, qc, target, userId]);

  useEffect(
    () => () => {
      if (recorder.current?.state === "recording") recorder.current.stop();
      recordingStream.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  async function loadOlder() {
    if (!rows.length) return;
    setLoadingOlder(true);
    setError("");
    try {
      const page = await fetchChatMessages(target, rows[0]!);
      setOlder((previous) => [...page, ...previous]);
      setHasOlder(page.length === CHAT_LIMIT);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Couldn't load earlier messages.");
    } finally {
      setLoadingOlder(false);
    }
  }

  async function sendText() {
    if (sending || !draft.trim()) return;
    setSending(true);
    setError("");
    if (pending.current?.body !== draft.trim()) {
      pending.current = { body: draft.trim(), id: crypto.randomUUID() };
    }
    try {
      await sendChatMessage(target, userId, pending.current.body, pending.current.id);
      pending.current = null;
      setDraft("");
      await refresh();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Couldn't send your message.");
    } finally {
      setSending(false);
    }
  }

  async function sendSticker(stickerCode: string) {
    if (sending || "mentor" in target) return;
    setSending(true);
    setShowStickers(false);
    setError("");
    try {
      await sendChatMessage(
        target,
        userId,
        STICKER_BY_ID.get(stickerCode)?.label || stickerCode,
        crypto.randomUUID(),
        {
          messageType: "sticker",
          stickerCode,
        },
      );
      await refresh();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Couldn't send that sticker.");
    } finally {
      setSending(false);
    }
  }

  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: key }),
      qc.invalidateQueries({ queryKey: ["mentor-threads", userId] }),
      qc.invalidateQueries({ queryKey: ["direct-threads", userId] }),
    ]);
  }

  async function startVoiceNote() {
    if ("mentor" in target || recording || sending || voiceDraft) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice recording is not supported on this browser.");
      return;
    }
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: enhanceVoice,
          autoGainControl: enhanceVoice,
        },
      });
      recordingStream.current = stream;
      let capture = stream;
      if (enhanceVoice || voiceEffect !== "Normal") {
        const context = new AudioContext();
        voiceContext.current = context;
        await context.resume();
        const source = context.createMediaStreamSource(stream);
        const filter = context.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.value = 100;
        const compressor = context.createDynamicsCompressor();
        const destination = context.createMediaStreamDestination();
        const processed = source.connect(filter).connect(compressor);
        if (voiceEffect === "Echo") {
          processed.connect(destination);
          const delay = context.createDelay(1);
          delay.delayTime.value = 0.18;
          const gain = context.createGain();
          gain.gain.value = 0.3;
          processed.connect(delay).connect(gain).connect(destination);
        } else if (voiceEffect === "Robot") {
          const modulator = context.createOscillator();
          modulator.frequency.value = 45;
          modulator.type = "sine";
          const gain = context.createGain();
          gain.gain.value = 0.5;
          const depth = context.createGain();
          depth.gain.value = 0.5;
          modulator.connect(depth).connect(gain.gain);
          processed.connect(gain).connect(destination);
          modulator.start();
        } else if (voiceEffect !== "Normal") {
          const tone = context.createBiquadFilter();
          tone.type =
            voiceEffect === "Warm" || voiceEffect === "Deep tone" ? "lowshelf" : "highshelf";
          tone.frequency.value =
            voiceEffect === "Deep tone" ? 400 : voiceEffect === "Warm" ? 700 : 2200;
          tone.gain.value = voiceEffect === "Deep tone" ? 8 : 5;
          processed.connect(tone).connect(destination);
        } else processed.connect(destination);
        capture = destination.stream;
      }
      const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4"].find(
        (type) => MediaRecorder.isTypeSupported(type),
      );
      const mediaRecorder = new MediaRecorder(
        capture,
        preferred ? { mimeType: preferred } : undefined,
      );
      recorder.current = mediaRecorder;
      recordingStream.current = stream;
      recordingChunks.current = [];
      recordingStartedAt.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size) recordingChunks.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const duration = Math.max(1, Date.now() - recordingStartedAt.current);
        const rawType = mediaRecorder.mimeType || "audio/webm";
        const safeType = rawType.split(";")[0] || "audio/webm";
        const blob = new Blob(recordingChunks.current, { type: safeType });
        recordingStream.current?.getTracks().forEach((track) => track.stop());
        recordingStream.current = null;
        recorder.current = null;
        setRecording(false);
        void voiceContext.current?.close();
        voiceContext.current = null;
        if (!mounted.current || !blob.size) return;
        const url = URL.createObjectURL(blob);
        previewUrl.current = url;
        setVoiceDraft({ blob, duration, url });
      };
      mediaRecorder.start();
      setRecordingSeconds(0);
      setRecording(true);
    } catch {
      recordingStream.current?.getTracks().forEach((track) => track.stop());
      void voiceContext.current?.close();
      setError("Microphone access is needed to record a voice note.");
    }
  }

  function stopVoiceNote() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  async function finishVoiceNote(blob: Blob, durationMs: number) {
    setSending(true);
    let path: string | null = null;
    try {
      path = await uploadVoiceNote(target, userId, blob);
      await sendChatMessage(target, userId, "Voice note", crypto.randomUUID(), {
        messageType: "voice",
        attachmentPath: path,
        attachmentDurationMs: durationMs,
      });
      discardVoice();
      await refresh();
    } catch (voiceError) {
      if (path) await removeChatMedia(path);
      setError(voiceError instanceof Error ? voiceError.message : "Couldn't send the voice note.");
    } finally {
      setSending(false);
    }
  }

  const richMediaAllowed = !("mentor" in target);

  return (
    <section
      className={cn(
        "overflow-hidden bg-card",
        fillHeight ? "flex min-h-0 flex-1 flex-col" : "rounded-2xl border border-border",
      )}
    >
      <p className="shrink-0 border-b border-border px-4 py-2 text-center text-[10px] text-muted-foreground">
        Only conversation participants can read these messages.
      </p>
      <div
        className={cn(
          "space-y-3 overflow-y-auto overscroll-contain bg-surface/40 p-4",
          fillHeight ? "min-h-0 flex-1" : "min-h-64",
        )}
        style={fillHeight ? undefined : { maxHeight }}
        role="log"
        aria-label="Conversation messages"
        aria-live="polite"
      >
        {messages.isLoading && <CardSkeleton count={2} height="h-12" />}
        {messages.isError && <ErrorState onRetry={() => void messages.refetch()} />}
        {rows.length >= CHAT_LIMIT && hasOlder && (
          <button
            className="min-h-10 w-full text-sm font-semibold text-primary"
            disabled={loadingOlder}
            onClick={() => void loadOlder()}
          >
            {loadingOlder ? "Loading…" : "Load earlier messages"}
          </button>
        )}
        {!messages.isLoading && !messages.isError && !rows.length && !callHistory.data?.length && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Start the conversation with a hello 👋
          </p>
        )}

        {callHistory.isError && (
          <p className="text-center text-xs text-muted-foreground">
            Call history unavailable.{" "}
            <button type="button" onClick={() => void callHistory.refetch()} className="underline">
              Retry
            </button>
          </p>
        )}
        {timeline.map((entry) => {
          if (entry.call) {
            const call = entry.call;
            const mine = call.caller_id === userId;
            const missed = isMissedCall(call) && call.callee_id === userId;
            return (
              <div key={entry.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "flex w-fit max-w-[82%] items-center gap-3 rounded-2xl border px-3 py-2.5 shadow-sm",
                    mine ? "rounded-br-md" : "rounded-bl-md",
                    missed
                      ? "border-rose-200 bg-rose-50 text-rose-500 dark:border-rose-500/25 dark:bg-rose-500/10"
                      : "border-border bg-card text-secondary-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      missed ? "bg-rose-500/10" : "bg-primary/10 text-primary",
                    )}
                  >
                    {call.kind === "video" ? (
                      <Video className="h-4 w-4" />
                    ) : (
                      <Phone className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-[12px] leading-tight">
                      {callHistoryLabel(call, userId)}
                    </strong>
                    <time
                      className="mt-1 block text-[10px] text-muted-foreground"
                      dateTime={call.created_at}
                    >
                      {new Date(call.created_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </span>
                </div>
              </div>
            );
          }
          const message = entry.message!;
          const mine = message.sender_id === userId;
          const receipt =
            mine && "user" in target
              ? message.read_at
                ? "seen"
                : peerOnline
                  ? "online"
                  : "delivered"
              : null;
          return (
            <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[86%] rounded-2xl px-3 py-2",
                  mine
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md bg-card text-secondary-foreground shadow-sm",
                )}
              >
                {"group" in target && (
                  <p className="mb-1 text-[11px] font-semibold opacity-75">
                    {mine ? "You" : (names.data?.[message.sender_id] ?? "Nuru member")}
                  </p>
                )}
                {message.message_type === "sticker" ? (
                  <div className="py-2">
                    <ChatStickerArt
                      code={message.sticker_code || message.body}
                      fallback={message.body}
                    />
                  </div>
                ) : (message.message_type === "image" || message.message_type === "video") &&
                  message.attachment_path ? (
                  <ChatFile path={message.attachment_path} kind={message.message_type} />
                ) : message.message_type === "location" ? (
                  <LocationCard body={message.body} />
                ) : message.message_type === "voice" && message.attachment_path ? (
                  <VoiceNote
                    path={message.attachment_path}
                    durationMs={message.attachment_duration_ms}
                    mine={mine}
                  />
                ) : (
                  <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
                )}
                <div className="mt-1 flex items-center justify-end gap-2 text-[10px] opacity-65">
                  <time dateTime={message.created_at}>
                    {new Date(message.created_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                  {receipt === "delivered" && (
                    <span className="inline-flex items-center text-slate-300" aria-label="Delivered · recipient not online">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
                    </span>
                  )}
                  {receipt === "online" && (
                    <span className="inline-flex items-center text-slate-200" aria-label="Recipient online · not read">
                      <CheckCheck className="h-3.5 w-3.5" strokeWidth={2.4} />
                    </span>
                  )}
                  {receipt === "seen" && (
                    <span className="inline-flex items-center text-amber-300" aria-label="Seen and read">
                      <CheckCheck className="h-3.5 w-3.5" strokeWidth={2.6} />
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <form
        className="shrink-0 border-t border-border bg-card px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        onSubmit={(event) => {
          event.preventDefault();
          void sendText();
        }}
      >
        {error && (
          <p role="alert" className="mb-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {showStickers && richMediaAllowed && (
          <ChatReactionPicker
            key="sticker"
            kind="sticker"
            onEmoji={(symbol) => {
              if (draft.length + symbol.length > 2000) {
                setError("Your message is limited to 2,000 characters.");
                return;
              }
              setDraft((value) => value + symbol);
            }}
            onSticker={(code) => void sendSticker(code)}
            onClose={() => {
              setShowStickers(false);
            }}
            disabled={sending || recording}
          />
        )}

        {recording && (
          <div className="mb-2 flex items-center justify-between rounded-2xl bg-destructive/10 px-3 py-2 text-sm">
            <span className="font-semibold text-destructive">
              Recording • {recordingSeconds}s / 120s
            </span>
            <button
              type="button"
              onClick={stopVoiceNote}
              className="inline-flex min-h-9 items-center gap-2 rounded-full bg-destructive px-3 text-xs font-bold text-white"
            >
              <Square className="h-3.5 w-3.5 fill-current" /> Stop
            </button>
          </div>
        )}

        <input
          ref={fileInput}
          type="file"
          className="sr-only"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            if (file.size > 50 * 1024 * 1024) {
              setError("Choose a file smaller than 50 MB.");
              return;
            }
            setLocation(null);
            setAttachment({ file, url: URL.createObjectURL(file) });
            setShowAttachments(false);
          }}
        />
        {showAttachments && (
          <div className="mb-3 grid grid-cols-3 gap-2 rounded-2xl border border-border p-3">
            <button
              type="button"
              onClick={() => {
                if (fileInput.current) {
                  fileInput.current.accept = "image/jpeg,image/png,image/webp,image/gif";
                  fileInput.current.click();
                }
              }}
              className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl bg-violet-500/10 text-sm"
            >
              <ImagePlus className="h-6 w-6 text-violet-400" />
              Photo
            </button>
            <button
              type="button"
              onClick={() => {
                if (fileInput.current) {
                  fileInput.current.accept = "video/mp4,video/webm,video/quicktime";
                  fileInput.current.click();
                }
              }}
              className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl bg-blue-500/10 text-sm"
            >
              <Video className="h-6 w-6 text-blue-400" />
              Video
            </button>
            <button
              type="button"
              onClick={chooseLocation}
              className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl bg-emerald-500/10 text-sm"
            >
              <MapPin className="h-6 w-6 text-emerald-400" />
              Location
            </button>
          </div>
        )}
        {(attachment || location) && (
          <div className="mb-3 space-y-3 rounded-2xl border border-primary/30 p-3">
            {attachment &&
              (attachment.file.type.startsWith("image/") ? (
                <img
                  src={attachment.url}
                  alt="Photo preview"
                  className="max-h-52 rounded-xl object-contain"
                />
              ) : (
                <video src={attachment.url} controls playsInline className="max-h-52 rounded-xl" />
              ))}
            {location && <LocationCard body={JSON.stringify(location)} />}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={sending}
                onClick={() => {
                  setAttachment(null);
                  setLocation(null);
                }}
                className="rounded-full px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={() => void shareAttachment()}
                className="rounded-full bg-primary px-4 py-2 text-primary-foreground"
              >
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        )}
        {voiceDraft && (
          <div className="mb-3 space-y-3 rounded-2xl border border-primary/25 bg-primary/5 p-3">
            <p className="text-xs font-semibold">
              Preview your voice note • {Math.ceil(voiceDraft.duration / 1000)}s
            </p>
            <VoicePlayback src={voiceDraft.url} />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={sending}
                onClick={discardVoice}
                className="min-h-10 rounded-full px-4 text-sm"
              >
                Discard
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={() => void finishVoiceNote(voiceDraft.blob, voiceDraft.duration)}
                className="min-h-10 rounded-full bg-primary px-4 text-sm text-primary-foreground"
              >
                {sending ? "Sending…" : "Send voice note"}
              </button>
            </div>
          </div>
        )}
        <label htmlFor="chat-message" className="sr-only">
          Your message
        </label>
        <div className="flex items-end gap-1">
          {richMediaAllowed && (
            <button
              type="button"
              aria-label="Add attachment"
              aria-expanded={showAttachments}
              disabled={sending || recording || !!voiceDraft}
              onClick={() => setShowAttachments((v) => !v)}
              className="flex h-12 w-9 shrink-0 items-center justify-center rounded-full text-primary"
            >
              {showAttachments ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </button>
          )}
          {richMediaAllowed && (
            <button
              type="button"
              aria-label="Send sticker"
              aria-expanded={showStickers}
              onClick={() => {
                setShowStickers((value) => !value);
              }}
              className="flex h-12 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2"
            >
              <Sticker className="h-5 w-5" />
            </button>
          )}
          <textarea
            id="chat-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={2000}
            disabled={sending || recording}
            rows={1}
            placeholder="Message…"
            className="min-h-12 max-h-28 min-w-0 flex-1 resize-none rounded-2xl border border-border-strong bg-surface-2 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-primary"
          />

          {richMediaAllowed && !draft.trim() ? (
            <button
              type="button"
              onClick={recording ? stopVoiceNote : () => void startVoiceNote()}
              disabled={sending || !!voiceDraft}
              aria-label={recording ? "Stop voice note" : "Record voice note"}
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-50",
                recording ? "bg-destructive" : "bg-primary",
              )}
            >
              {recording ? (
                <Square className="h-5 w-5 fill-current" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>
          ) : (
            <button
              type="submit"
              disabled={sending || !draft.trim() || messages.isError}
              aria-label={sending ? "Sending message" : "Send message"}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

function VoiceNote({
  path,
  durationMs,
  mine,
}: {
  path: string;
  durationMs: number | null;
  mine: boolean;
}) {
  const audio = useQuery({
    queryKey: ["chat-media-url", path],
    queryFn: () => createChatMediaSignedUrl(path),
    staleTime: 50 * 60 * 1000,
  });

  if (audio.isLoading) {
    return <p className="min-w-44 py-2 text-xs opacity-75">Loading voice note…</p>;
  }
  if (!audio.data) {
    return <p className="min-w-44 py-2 text-xs opacity-75">Voice note unavailable</p>;
  }

  return (
    <div className="min-w-52">
      <VoicePlayback src={audio.data} mine={mine} />
      {durationMs ? (
        <p className="mt-1 text-[10px] opacity-65">{Math.ceil(durationMs / 1000)} sec voice note</p>
      ) : null}
    </div>
  );
}

function VoicePlayback({ src, mine = false }: { src: string; mine?: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [speed, setSpeed] = useState(1);
  return (
    <div className="space-y-2">
      <audio
        ref={ref}
        controls
        preload="metadata"
        src={src}
        className={cn("h-10 w-full", mine ? "accent-white" : "accent-primary")}
      />
      <div className="flex justify-end gap-1" aria-label="Playback speed">
        {[1, 1.5, 2].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`Play at ${value} times speed`}
            aria-pressed={speed === value}
            onClick={() => {
              setSpeed(value);
              if (ref.current) ref.current.playbackRate = value;
            }}
            className={cn(
              "min-h-8 rounded-full px-3 text-[11px] font-semibold",
              speed === value ? "bg-violet-500 text-white" : "bg-black/10",
            )}
          >
            {value}×
          </button>
        ))}
      </div>
    </div>
  );
}

function LocationCard({ body }: { body: string }) {
  try {
    const point = JSON.parse(body);
    if (
      !Number.isFinite(point.latitude) ||
      !Number.isFinite(point.longitude) ||
      Math.abs(point.latitude) > 90 ||
      Math.abs(point.longitude) > 180
    )
      throw new Error();
    return (
      <a
        href={`https://www.google.com/maps?q=${point.latitude},${point.longitude}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-xl bg-background/20 p-3"
      >
        <MapPin className="h-8 w-8" />
        <span>
          <strong className="block text-sm">Shared location</strong>
          <span className="text-xs opacity-75">Open in Maps ↗</span>
        </span>
      </a>
    );
  } catch {
    return <p className="text-sm">Location unavailable</p>;
  }
}
function ChatFile({ path, kind }: { path: string; kind: "image" | "video" }) {
  const media = useQuery({
    queryKey: ["chat-media-url", path],
    queryFn: () => createChatMediaSignedUrl(path),
    staleTime: 50 * 60 * 1000,
  });
  if (media.isPending)
    return <p className="text-xs">Loading {kind === "image" ? "photo" : "video"}…</p>;
  if (!media.data)
    return (
      <button type="button" onClick={() => void media.refetch()} className="text-xs underline">
        Retry attachment
      </button>
    );
  return kind === "image" ? (
    <a href={media.data} target="_blank" rel="noopener noreferrer">
      <img
        src={media.data}
        alt="Shared photo"
        loading="lazy"
        className="max-h-80 w-full rounded-xl object-contain"
      />
    </a>
  ) : (
    <video
      src={media.data}
      controls
      playsInline
      preload="metadata"
      className="max-h-80 w-full rounded-xl"
    />
  );
}
