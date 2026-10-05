import { useEffect, useRef, useState } from "react";
import { PrimaryButton, GhostButton } from "./Primitives";

/** Read short utterances in sequence so long chapters work on mobile voices. */
export function BibleReadAloud({
  verses,
  label = "chapter",
}: {
  verses: { text: string }[];
  label?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<"idle" | "reading" | "paused">("idle");
  const [rate, setRate] = useState(1);
  const [error, setError] = useState("");
  const generation = useRef({ value: 0 });
  const current = useRef<SpeechSynthesisUtterance | null>(null);
  useEffect(() => {
    setSupported("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
    const token = generation.current;
    return () => {
      token.value++;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      current.current = null;
    };
  }, []);

  function stop() {
    generation.current.value++;
    window.speechSynthesis.cancel();
    current.current = null;
    setState("idle");
  }

  function read() {
    stop();
    setError("");
    setState("reading");
    const run = generation.current.value;
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("en"));
    function speak(index: number) {
      if (run !== generation.current.value) return;
      const verse = verses[index];
      if (!verse) {
        current.current = null;
        setState("idle");
        return;
      }
      const utterance = new SpeechSynthesisUtterance(verse.text);
      utterance.lang = "en";
      utterance.rate = rate;
      if (voice) utterance.voice = voice;
      utterance.onend = () => speak(index + 1);
      utterance.onerror = () => {
        if (run !== generation.current.value) return;
        stop();
        setError(
          "Your device could not read aloud. Try again or check your device’s voice settings.",
        );
      };
      current.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
    speak(0);
  }

  return (
    <section aria-label={`Read ${label} aloud`} className="nuru-card mb-3 space-y-2 p-3">
      <label className="flex items-center gap-2 text-xs">
        Reading speed
        <select
          aria-label="Reading speed"
          value={rate}
          disabled={state !== "idle"}
          onChange={(e) => setRate(Number(e.target.value))}
          className="rounded-lg border border-border bg-surface-2 px-2 py-1"
        >
          <option value={0.75}>0.75×</option>
          <option value={1}>1×</option>
          <option value={1.25}>1.25×</option>
          <option value={1.5}>1.5×</option>
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <PrimaryButton disabled={!supported || !verses.length} onClick={read}>
          {state === "idle" ? "Read aloud" : "Restart reading"}
        </PrimaryButton>
        {state !== "idle" && (
          <>
            <GhostButton
              onClick={() => {
                if (state === "reading") window.speechSynthesis.pause();
                else window.speechSynthesis.resume();
                setState(state === "reading" ? "paused" : "reading");
              }}
            >
              {state === "paused" ? "Resume" : "Pause"}
            </GhostButton>
            <GhostButton onClick={stop}>Stop</GhostButton>
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground" role="status">
        {supported
          ? `Reads this ${label} using your device’s English voice.`
          : "Read aloud is unavailable in this browser."}
      </p>
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
    </section>
  );
}
