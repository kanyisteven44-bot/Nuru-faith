import { useEffect, useRef, useState } from "react";
import { Pause, Play, Square, Volume2 } from "lucide-react";

/** Uses the browser's available narration voices for public reading content. */
export function ReadingTools({
  text,
  fontSize,
  onFontSize,
}: {
  text: string;
  fontSize: number;
  onFontSize: (size: number) => void;
}) {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<"idle" | "reading" | "paused">("idle");
  const [rate, setRate] = useState(1);
  const [error, setError] = useState("");
  const run = useRef({ value: 0 });
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  useEffect(() => {
    setSupported("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
    setState("idle");
    setError("");
    const generation = run.current;
    return () => {
      generation.value++;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      utterance.current = null;
    };
  }, [text]);
  function stop() {
    run.current.value++;
    window.speechSynthesis.cancel();
    utterance.current = null;
    setState("idle");
  }
  function read() {
    stop();
    setError("");
    const token = run.current.value;
    // Short chunks avoid mobile speech engines silently stopping on long lessons.
    const chunks = text.match(/.{1,180}(?:\s|$)|\S{1,180}/gs) ?? [];
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("en"));
    function speak(index: number) {
      if (run.current.value !== token) return;
      if (!chunks[index]) {
        setState("idle");
        utterance.current = null;
        return;
      }
      const speech = new SpeechSynthesisUtterance(chunks[index]);
      speech.lang = "en";
      speech.rate = rate;
      if (voice) speech.voice = voice;
      speech.onend = () => speak(index + 1);
      speech.onerror = () => {
        if (run.current.value !== token) return;
        stop();
        setError("Your device could not read this aloud. Check its voice settings and try again.");
      };
      utterance.current = speech;
      window.speechSynthesis.speak(speech);
    }
    setState("reading");
    speak(0);
  }
  const control =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50";
  return (
    <section
      aria-label="Reading preferences"
      className="mb-6 rounded-2xl border border-border bg-surface-2/60 p-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          className={control}
          type="button"
          disabled={!supported || !text.trim()}
          onClick={read}
        >
          <Volume2 className="h-4 w-4" /> {state === "idle" ? "Listen" : "Restart"}
        </button>
        {state !== "idle" && (
          <>
            <button
              className={control}
              type="button"
              onClick={() => {
                if (state === "reading") window.speechSynthesis.pause();
                else window.speechSynthesis.resume();
                setState(state === "reading" ? "paused" : "reading");
              }}
            >
              {state === "reading" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {state === "reading" ? "Pause" : "Resume"}
            </button>
            <button className={control} type="button" onClick={stop}>
              <Square className="h-4 w-4" /> Stop
            </button>
          </>
        )}
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Speed
          <select
            aria-label="Narration speed"
            disabled={state !== "idle"}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className={control}
          >
            {[0.75, 1, 1.25, 1.5].map((value) => (
              <option key={value} value={value}>
                {value}×
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex items-center gap-1" aria-label="Text size">
          {[16, 18, 20].map((size) => (
            <button
              type="button"
              key={size}
              className={control}
              aria-label={`${size === 16 ? "Small" : size === 18 ? "Medium" : "Large"} reading text`}
              aria-pressed={fontSize === size}
              onClick={() => onFontSize(size)}
            >
              <span style={{ fontSize: size }}>A</span>
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground" role="status">
        {supported
          ? state === "paused"
            ? "Narration paused."
            : state === "reading"
              ? "Reading aloud using your device’s English voice."
              : "Listen with your device’s voice, or choose a comfortable text size."
          : "Device narration is unavailable in this browser. Text reading is available."}
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm">
          {error}
        </p>
      )}
    </section>
  );
}
