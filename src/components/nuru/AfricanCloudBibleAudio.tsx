import { useEffect, useMemo, useRef, useState } from "react";
import { Cloud, Pause, Play, Square } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { bibleSpeechChunks, bibleSpeechLocale, isAfricanBibleLanguage } from "@/lib/bibleSpeech";
import { cloudVoicesForBibleLocale } from "@/lib/africanCloudVoices";
import {
  getAfricanCloudAudioStatus,
  synthesizeAfricanBibleAudio,
} from "@/lib/africanBibleAudio.functions";

/** Supplement to device TTS; always opt-in, never autoplay/bill on mount. */
export function AfricanCloudBibleAudio({
  language, verses, startVerse,
}: {
  language: string;
  verses: { verse?: number; text: string }[];
  startVerse?: number | undefined;
}) {
  const locale = bibleSpeechLocale(language);
  const choices = useMemo(() => cloudVoicesForBibleLocale(locale), [locale]);
  const availability = useQuery({
    queryKey: ["african-bible-cloud-audio"],
    queryFn: () => getAfricanCloudAudioStatus(),
    enabled: choices.length > 0,
    staleTime: 5 * 60_000,
    retry: false,
  });
  const [selectedVoice, setSelectedVoice] = useState("");
  const [state, setState] = useState<"idle" | "playing" | "paused" | "loading">("idle");
  const [currentVerse, setCurrentVerse] = useState<number | null>(null);
  const [error, setError] = useState("");
  const audio = useRef<HTMLAudioElement | null>(null);
  const audioBlobUrl = useRef<string | null>(null);
  function releaseAudio() {
    audio.current?.pause();
    if (audio.current) {
      audio.current.onended = null;
      audio.current.onerror = null;
      audio.current.removeAttribute("src");
      audio.current.load();
      audio.current = null;
    }
    if (audioBlobUrl.current) {
      URL.revokeObjectURL(audioBlobUrl.current);
      audioBlobUrl.current = null;
    }
  }
  const token = useRef(0);
  const parts = useMemo(() => verses.flatMap((v, i) =>
    // 255 characters stays under the 280-character server limit while
    // reducing speech requests on long Bible chapters.
    bibleSpeechChunks(v.text, 255).map((text) => ({ text, verse: v.verse ?? i + 1 })),
  ), [verses]);
  const voice = choices.find((v) => v.voice === selectedVoice) ?? choices[0];

  // Do not keep playing another chapter or language when the screen changes.
  useEffect(() => () => {
    token.current++;
    releaseAudio();
  }, [language, verses]);

  if (!isAfricanBibleLanguage(language) || choices.length === 0) return null;

  function stop() {
    token.current++;
    releaseAudio();
    setState("idle");
    setCurrentVerse(null);
  }

  async function begin() {
    if (!availability.data?.enabled || !voice || !parts.length) return;
    stop();
    setError("");
    const run = token.current;
    const start = startVerse ? Math.max(0, parts.findIndex((p) => p.verse === startVerse)) : 0;

    async function playAt(i: number): Promise<void> {
      if (token.current !== run) return;
      const segment = parts[i];
      if (!segment) {
        setState("idle");
        setCurrentVerse(null);
        return;
      }
      setCurrentVerse(segment.verse);
      setState("loading");
      try {
        const result = await synthesizeAfricanBibleAudio({
          data: { text: segment.text, voice: voice!.voice },
        });
        if (token.current !== run) return;
        // The site's Content-Security-Policy permits blob: audio, not
        // data: audio. Use a temporary object URL and revoke it after each
        // fragment to avoid retaining long chapters in memory.
        releaseAudio();
        const raw = atob(result.audioBase64);
        const bytes = Uint8Array.from(raw, (character) => character.charCodeAt(0));
        const blobUrl = URL.createObjectURL(new Blob([bytes], { type: result.mime }));
        audioBlobUrl.current = blobUrl;
        const next = new Audio(blobUrl);
        audio.current = next;
        next.onended = () => {
          if (token.current !== run) return;
          releaseAudio();
          void playAt(i + 1);
        };
        next.onerror = () => {
          if (token.current !== run) return;
          stop();
          setError("Couldn't play the cloud recording. Try the device voice.");
        };
        await next.play();
        if (token.current === run) setState("playing");
      } catch (e) {
        if (token.current !== run) return;
        stop();
        setError(e instanceof Error ? e.message : "Cloud narration is unavailable.");
      }
    }
    await playAt(start);
  }

  function toggle() {
    if (state === "playing") {
      audio.current?.pause();
      setState("paused");
    } else if (state === "paused") {
      void audio.current?.play().then(() => setState("playing")).catch(() => {
        setError("Unable to resume playback.");
      });
    } else {
      void begin();
    }
  }

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3" aria-label="African cloud Bible narration">
      <div className="flex items-center gap-2">
        <Cloud className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">African cloud voice · {language}</p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {availability.isLoading ? "Checking voice availability…" :
              availability.data?.enabled ? "Natural narration over internet · uses provider usage quota" :
              "Optional feature · awaiting secure speech-provider setup"}
          </p>
        </div>
      </div>
      {availability.data?.enabled && (
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="African cloud narration voice"
            value={voice?.voice ?? ""}
            onChange={(event) => setSelectedVoice(event.target.value)}
            disabled={state !== "idle"}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-2 text-xs text-foreground">
            {choices.map((v) => <option key={v.voice} value={v.voice}>{v.label}</option>)}
          </select>
          <button type="button" onClick={toggle} disabled={!parts.length || state === "loading"}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50">
            {state === "playing" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {state === "playing" ? "Pause" : state === "paused" ? "Resume" : state === "loading" ? "Loading…" : "Play cloud voice"}
          </button>
          {state !== "idle" && <button type="button" onClick={stop} aria-label="Stop cloud voice"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border text-foreground">
            <Square className="h-4 w-4" />
          </button>}
        </div>
      )}
      {currentVerse !== null && <p aria-live="polite" className="text-xs text-muted-foreground">
        {state === "loading" ? "Loading" : "Reading"} verse {currentVerse}
      </p>}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
