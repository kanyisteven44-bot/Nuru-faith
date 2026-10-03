import { useEffect, useRef, useState } from "react";
import { PrimaryButton, GhostButton } from "./Primitives";

/** Read short utterances in sequence so long chapters work on mobile voices. */
export function BibleReadAloud({ verses }: { verses: { text: string }[] }) {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<"idle" | "reading" | "paused">("idle");
  const [error, setError] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceId, setVoiceId] = useState("");
  const generation = useRef({ value: 0 });
  const current = useRef<SpeechSynthesisUtterance | null>(null);
  useEffect(() => {
    setSupported("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
    const syncVoices = () => {
      if ("speechSynthesis" in window)
        setVoices(
          window.speechSynthesis.getVoices().filter((voice) => voice.lang.startsWith("en")),
        );
    };
    syncVoices();
    if ("speechSynthesis" in window)
      window.speechSynthesis.addEventListener("voiceschanged", syncVoices);
    const token = generation.current;
    return () => {
      if ("speechSynthesis" in window)
        window.speechSynthesis.removeEventListener("voiceschanged", syncVoices);
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
    const available = window.speechSynthesis.getVoices();
    const voice =
      available.find((v) => v.voiceURI === voiceId) ??
      available.find((v) => v.lang.startsWith("en"));
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
    <section aria-label="Read Bible aloud" className="nuru-card mb-3 space-y-2 p-3">
      {voices.length > 0 && (
        <label className="block text-xs text-muted-foreground">
          Reading voice
          <select
            value={voiceId}
            onChange={(event) => {
              stop();
              setVoiceId(event.target.value);
            }}
            className="input-nuru mt-1"
            aria-label="Bible reading voice"
          >
            <option value="">Device default English voice</option>
            {voices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </label>
      )}
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
          ? "Reads this chapter using your device’s English voice. If no sound plays, enable an English text-to-speech voice in your device settings."
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
