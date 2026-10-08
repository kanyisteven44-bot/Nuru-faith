import { useEffect, useRef, useState } from "react";
import { Pause, Play, Mic, Loader2 } from "lucide-react";
import { voiceSeconds, voiceTime } from "@/lib/voicePlayback";

export function VoiceMessagePlayer({
  src,
  durationMs,
  mine,
  onRetry,
}: {
  src: string;
  durationMs?: number | null;
  mine: boolean;
  onRetry?: () => void;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState("");
  const total = duration || voiceSeconds((durationMs ?? 0) / 1000);
  useEffect(() => {
    const stopOthers = (event: Event) => {
      if ((event as CustomEvent).detail !== audio.current) audio.current?.pause();
    };
    window.addEventListener("nuru:voice-playing", stopOthers);
    setElapsed(0);
    setDuration(0);
    setPlaying(false);
    setError("");
    return () => window.removeEventListener("nuru:voice-playing", stopOthers);
  }, [src]);
  async function toggle() {
    if (!audio.current) return;
    if (!audio.current.paused) {
      audio.current.pause();
      return;
    }
    setError("");
    setLoading(true);
    try {
      audio.current.playbackRate = speed;
      await audio.current.play();
      window.dispatchEvent(new CustomEvent("nuru:voice-playing", { detail: audio.current }));
    } catch {
      setError("Couldn't play this voice note. Try again.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className={`w-[min(64vw,280px)] rounded-2xl p-2 ${mine ? "bg-white/10" : "bg-primary/5"}`}>
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onLoadedMetadata={() => setDuration(voiceSeconds(audio.current?.duration))}
        onDurationChange={() => setDuration(voiceSeconds(audio.current?.duration))}
        onTimeUpdate={() => setElapsed(voiceSeconds(audio.current?.currentTime))}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          setLoading(false);
        }}
        onWaiting={() => setLoading(true)}
        onPlaying={() => setLoading(false)}
        onEnded={() => {
          setPlaying(false);
          setElapsed(total);
        }}
        onError={() => {
          setLoading(false);
          setPlaying(false);
          setError("Voice note unavailable. Please retry.");
        }}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={loading && !playing}
          aria-label={playing ? "Pause voice note" : "Play voice note"}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-sm ${mine ? "bg-white text-[#397cd5]" : "bg-primary text-primary-foreground"}`}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : playing ? (
            <Pause className="h-5 w-5 fill-current" />
          ) : (
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold">
            <Mic className="h-3 w-3" /> Voice message
          </div>
          <input
            type="range"
            min="0"
            max={total || 1}
            step="0.1"
            value={Math.min(elapsed, total || 1)}
            disabled={!total}
            aria-label="Seek voice note"
            aria-valuetext={`${voiceTime(elapsed)} of ${voiceTime(total)}`}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (audio.current) {
                audio.current.currentTime = value;
                setElapsed(value);
              }
            }}
            className={`h-11 w-full cursor-pointer ${mine ? "accent-white" : "accent-primary"}`}
          />
          <div className="flex justify-between text-[10px] tabular-nums opacity-80">
            <span>{voiceTime(elapsed)}</span>
            <span>{voiceTime(total)}</span>
          </div>
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
            setSpeed(next);
            if (audio.current) audio.current.playbackRate = next;
          }}
          aria-label={`Playback speed ${speed} times. Tap to change.`}
          className="min-h-11 rounded-full bg-black/10 px-3 text-xs font-semibold"
        >
          {speed}×
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs">
          {error}{" "}
          <button
            type="button"
            className="min-h-10 underline"
            onClick={() => {
              setError("");
              audio.current?.load();
              onRetry?.();
            }}
          >
            Retry
          </button>
        </p>
      )}
    </div>
  );
}
