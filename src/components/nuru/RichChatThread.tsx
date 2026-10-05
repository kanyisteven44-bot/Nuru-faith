import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mic, Send, Smile, Sticker, Square } from "lucide-react";
import {
  CHAT_LIMIT,
  createChatMediaSignedUrl,
  fetchChatMessages,
  fetchChatNames,
  markDirectThreadRead,
  removeChatMedia,
  sendChatMessage,
  uploadVoiceNote,
  type ChatMessage,
  type ChatTarget,
} from "@/services/messaging";
import { CardSkeleton, ErrorState } from "@/components/nuru/Primitives";
import { ChatReactionPicker, ChatStickerArt } from "@/components/nuru/ChatReactionPicker";
import { STICKER_BY_ID } from "@/lib/chatReactions";
import { cn } from "@/lib/utils";

export function RichChatThread({
  target,
  userId,
  maxHeight = "58dvh",
}: {
  target: ChatTarget;
  userId: string;
  maxHeight?: string;
}) {
  const qc = useQueryClient();
  const key = ["chat-messages", userId, target];
  const messages = useQuery({
    queryKey: key,
    queryFn: () => fetchChatMessages(target),
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });
  const [older, setOlder] = useState<ChatMessage[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState<{
    blob: Blob;
    duration: number;
    url: string;
  } | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [enhanceVoice, setEnhanceVoice] = useState(true);
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
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "instant", block: "nearest" });
  }, [latest]);

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
      if (enhanceVoice) {
        const context = new AudioContext();
        voiceContext.current = context;
        await context.resume();
        const source = context.createMediaStreamSource(stream);
        const filter = context.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.value = 100;
        const compressor = context.createDynamicsCompressor();
        const destination = context.createMediaStreamDestination();
        source.connect(filter).connect(compressor).connect(destination);
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
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <p className="border-b border-border px-4 py-3 text-xs text-muted-foreground">
        Only conversation participants can read these messages.
      </p>
      <div
        className="min-h-64 space-y-3 overflow-y-auto bg-surface/40 p-4"
        style={{ maxHeight }}
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
        {!messages.isLoading && !messages.isError && !rows.length && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Start the conversation with a hello 👋
          </p>
        )}

        {rows.map((message) => {
          const mine = message.sender_id === userId;
          const status =
            mine && "user" in target
              ? message.read_at
                ? "Read"
                : message.delivered_at
                  ? "Delivered"
                  : "Sent"
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
                <p className="mb-1 text-[11px] font-semibold opacity-75">
                  {mine ? "You" : (names.data?.[message.sender_id] ?? "Nuru member")}
                </p>
                {message.message_type === "sticker" ? (
                  <div className="py-2">
                    <ChatStickerArt
                      code={message.sticker_code || message.body}
                      fallback={message.body}
                    />
                  </div>
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
                  {status && <span className="font-semibold">{status}</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <form
        className="border-t border-border bg-card p-3"
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

        {(showEmoji || (showStickers && richMediaAllowed)) && (
          <ChatReactionPicker
            key={showEmoji ? "emoji" : "sticker"}
            kind={showEmoji ? "emoji" : "sticker"}
            onEmoji={(symbol) => {
              if (draft.length + symbol.length > 2000) {
                setError("Your message is limited to 2,000 characters.");
                return;
              }
              setDraft((value) => value + symbol);
            }}
            onSticker={(code) => void sendSticker(code)}
            onClose={() => {
              setShowEmoji(false);
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

        {richMediaAllowed && !recording && !voiceDraft && (
          <label className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={enhanceVoice}
              onChange={(e) => setEnhanceVoice(e.target.checked)}
              disabled={sending}
            />
            Clear voice • reduce noise and balance volume
          </label>
        )}
        {voiceDraft && (
          <div className="mb-3 space-y-3 rounded-2xl border border-primary/25 bg-primary/5 p-3">
            <p className="text-xs font-semibold">
              Preview your voice note • {Math.ceil(voiceDraft.duration / 1000)}s
            </p>
            <audio controls src={voiceDraft.url} className="h-10 w-full" />
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
        <div className="flex items-end gap-2">
          <button
            type="button"
            aria-label="Add emoji"
            aria-expanded={showEmoji}
            onClick={() => {
              setShowEmoji((value) => !value);
              setShowStickers(false);
            }}
            className="flex h-12 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2"
          >
            <Smile className="h-5 w-5" />
          </button>

          {richMediaAllowed && (
            <button
              type="button"
              aria-label="Send sticker"
              aria-expanded={showStickers}
              onClick={() => {
                setShowStickers((value) => !value);
                setShowEmoji(false);
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
            className="min-h-12 min-w-0 flex-1 resize-none rounded-2xl border border-border-strong bg-surface-2 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
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
      <audio
        controls
        preload="metadata"
        src={audio.data}
        className={cn("h-10 w-full", mine ? "accent-white" : "accent-primary")}
      />
      {durationMs ? (
        <p className="mt-1 text-[10px] opacity-65">{Math.ceil(durationMs / 1000)} sec voice note</p>
      ) : null}
    </div>
  );
}
