import { useEffect, useMemo, useRef, useState } from "react";
import { Headphones, Pause, Play, Square, SkipForward } from "lucide-react";
import {
  bibleDeviceVoiceStatus,
  bibleMatchingVoices,
  bibleSpeechChunks,
  bibleSpeechLocale,
  isAfricanBibleLanguage,
} from "@/lib/bibleSpeech";

type ReaderState = "idle" | "reading" | "paused";

/**
 * Reads the ACTUAL selected Bible passage, whatever its translation.
 * Voices come from Android/Chrome/iOS. Do not silently force an English
 * voice for non-English Scripture: show a device-voice warning instead.
 */
export function BibleReadAloud({
  verses, label = "chapter", compact = false, language = "English", startVerse,
}: {
  verses: { text: string; verse?: number }[];
  label?: string;
  compact?: boolean;
  language?: string;
  startVerse?: number | undefined;
}) {
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceListReady, setVoiceListReady] = useState(false);
  const [state, setState] = useState<ReaderState>("idle");
  const [rate, setRate] = useState(1);
  const [voiceId, setVoiceId] = useState("auto");
  const [error, setError] = useState("");
  const [position, setPosition] = useState<number | null>(null);
  const generation = useRef(0);
  const current = useRef<SpeechSynthesisUtterance | null>(null);
  const runIndex = useRef(0);

  const chunks = useMemo(
    () => verses.flatMap((verse, index) =>
      bibleSpeechChunks(verse.text).map((text) => ({ text, verse: verse.verse ?? index + 1 })),
    ),
    [verses],
  );
  const matching = useMemo(() => bibleMatchingVoices(voices, language), [voices, language]);
  const locale = bibleSpeechLocale(language);
  const voiceKey = (voice: SpeechSynthesisVoice) =>
    [voice.voiceURI, voice.lang, voice.name].join("|");
  const chosen = voiceId === "auto" ? matching[0] : voices.find((v) => voiceKey(v) === voiceId);
  const voiceStatus = bibleDeviceVoiceStatus(
    voices, language, voiceListReady,
    voiceId === "auto" ? "auto" : chosen?.voiceURI ?? "not-selected",
  );
  const africanLanguage = isAfricanBibleLanguage(language);
  const canPlay = supported && chunks.length > 0 && voiceStatus === "ready";

  useEffect(() => {
    const api = typeof window !== "undefined" ? window.speechSynthesis : null;
    setSupported(!!api && "SpeechSynthesisUtterance" in window);
    if (!api) return;
    const syncVoices = () => {
      const available = api.getVoices();
      setVoices(available);
      if (available.length > 0) setVoiceListReady(true);
    };
    syncVoices();
    api.addEventListener?.("voiceschanged", syncVoices);
    // Android Chrome sometimes populates voices asynchronously. Wait briefly,
    // then show a useful "no voice" message instead of reading in English.
    const timeout = window.setTimeout(() => {
      syncVoices();
      setVoiceListReady(true);
    }, 1800);
    return () => {
      generation.current++;
      api.cancel();
      current.current = null;
      window.clearTimeout(timeout);
      api.removeEventListener?.("voiceschanged", syncVoices);
    };
  }, []);

  function stop() {
    generation.current++;
    window.speechSynthesis.cancel();
    current.current = null;
    runIndex.current = 0;
    setState("idle");
    setPosition(null);
  }

  function startAt(index: number) {
    if (!canPlay || !chosen) {
      setError("A matching narration voice is not available. Select an installed voice below or install a voice for " + language + " in your phone settings.");
      return;
    }
    stop();
    setError("");
    setState("reading");
    const token = generation.current;
    const speech = window.speechSynthesis;

    function next(i: number) {
      if (token !== generation.current) return;
      const chunk = chunks[i];
      if (!chunk) {
        current.current = null;
        setPosition(null);
        setState("idle");
        return;
      }
      runIndex.current = i;
      setPosition(chunk.verse);
      const utterance = new SpeechSynthesisUtterance(chunk.text);
      // Never ask the OS to guess a language: that previously read African
      // passages in its default English voice on some Android devices.
      utterance.voice = chosen!;
      if (chosen?.lang || locale) utterance.lang = chosen?.lang || locale || "";
      utterance.rate = rate;
      utterance.onend = () => next(i + 1);
      utterance.onerror = (event) => {
        if (token !== generation.current) return;
        stop();
        setError(
          event.error === "language-unavailable" || event.error === "voice-unavailable"
            ? "No text-to-speech voice is available for " + language + ". Install a matching voice in your phone settings or choose another voice."
            : "Could not play this Bible audio. Check your device's text-to-speech settings and try again.",
        );
      };
      current.current = utterance;
      try {
        speech.speak(utterance);
      } catch {
        if (token !== generation.current) return;
        stop();
        setError("Your browser could not start reading aloud. Check text-to-speech settings.");
      }
    }
    next(index);
  }

  function read() {
    const start = startVerse && verses.some((v) => v.verse === startVerse)
      ? Math.max(0, chunks.findIndex((chunk) => chunk.verse === startVerse))
      : 0;
    startAt(start);
  }

  function togglePause() {
    if (state === "reading") window.speechSynthesis.pause();
    if (state === "paused") window.speechSynthesis.resume();
    setState(state === "reading" ? "paused" : "reading");
  }

  function nextVerse() {
    if (state === "idle") return;
    const next = chunks.findIndex((chunk, index) =>
      index > runIndex.current && chunk.verse !== chunks[runIndex.current]?.verse);
    if (next >= 0) startAt(next);
    else stop();
  }

  const control = "min-h-10 rounded-xl border border-border bg-surface-2 px-2.5 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50";
  return (
    <section aria-label={"Read " + label + " with sound"}
      className={compact
        ? "mb-4 rounded-xl border border-primary/15 bg-primary/5 p-3"
        : "nuru-card mb-4 space-y-2 p-3"}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!canPlay}
          onClick={state === "idle" ? read : togglePause}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground disabled:opacity-50"
        >
          {state === "reading"
            ? <Pause className="h-4 w-4" />
            : state === "paused"
              ? <Play className="h-4 w-4" />
              : <Headphones className="h-4 w-4" />}
          {state === "idle" ? "Read with sound" : state === "paused" ? "Resume" : "Pause"}
        </button>
        {state !== "idle" && (
          <>
            <button type="button" onClick={nextVerse} aria-label="Skip to next verse"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border text-foreground">
              <SkipForward className="h-4 w-4" />
            </button>
            <button type="button" onClick={stop} aria-label="Stop reading"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border text-foreground">
              <Square className="h-4 w-4" />
            </button>
          </>
        )}
        <span className="min-w-0 text-[11px] text-muted-foreground" aria-live="polite">
          {position ? "Verse " + position : language + " · " +
            (voiceStatus === "ready" ? "Voice ready" : voiceStatus === "checking" ? "Checking voices" : "Voice needed")}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-1.5 text-[11px] text-muted-foreground">
          Voice
          <select aria-label="Bible narration voice" disabled={state !== "idle" || !supported}
            value={voiceId} onChange={(event) => setVoiceId(event.target.value)}
            className={control + " min-w-0 flex-1"}>
            <option value="auto">Auto ({language})</option>
            {matching.map((voice) => (
              <option key={voiceKey(voice)} value={voiceKey(voice)}>
                {voice.name} ({voice.lang})
              </option>
            ))}
            {voices.length > 0 && <optgroup label="Other voices (may mispronounce)">
              {voices.filter((v) => !matching.includes(v)).map((voice) => (
                <option key={voiceKey(voice)} value={voiceKey(voice)}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </optgroup>}
          </select>
        </label>
        <label className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
          Speed
          <select aria-label="Bible reading speed" value={rate} disabled={state !== "idle"}
            onChange={(event) => setRate(Number(event.target.value))} className={control}>
            <option value={0.75}>0.75×</option>
            <option value={1}>1×</option>
            <option value={1.25}>1.25×</option>
            <option value={1.5}>1.5×</option>
          </select>
        </label>
      </div>
      {!supported && (
        <p role="status" className="text-xs text-muted-foreground">
          Device speech is unavailable in this browser. Try Chrome on Android or your phone's text-to-speech settings.
        </p>
      )}
      {supported && voiceStatus === "checking" && (
        <p role="status" className="text-xs text-muted-foreground">
          Checking the voices installed on your device…
        </p>
      )}
      {supported && voiceStatus === "unavailable" && (
        <div role="status" className="space-y-1 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed text-amber-500">
          <p className="font-semibold">No {language} voice is installed on this device.</p>
          <p>
            {africanLanguage ? "African-language Bible text is available, but a matching narration voice is needed. " : ""}
            Open Android Settings → Text-to-speech output → Install voice data, if your phone supports this language.
            Return to Nuru and reopen the chapter to check again.
          </p>
          {voices.length > 0 && (
            <p>Other installed voices appear in the Voice menu. You can select one manually, but it may mispronounce Scripture.</p>
          )}
          <p>Availability varies by Android device and language. Nuru will not automatically substitute English narration.</p>
        </div>
      )}
      {supported && voiceStatus === "ready" && africanLanguage && (
        <p className="text-[11px] text-muted-foreground">
          {chosen?.name || language} · African-language narration uses the voice installed on this device.
        </p>
      )}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </section>
  );
}
