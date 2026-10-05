import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Minimal typing for the (non-standard, not in TS's DOM lib) Web Speech API.
 * Supported in Chrome/Edge/Safari desktop and most Android browsers; absent
 * on Firefox and most iOS browsers, so callers must check `supported` and
 * hide the affordance rather than show a broken mic button.
 */
type SpeechRecognitionResultLike = { isFinal: boolean; 0: { transcript: string } };
type SpeechRecognitionResultListLike = {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
};
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
};
type SpeechRecognitionErrorEventLike = { error: string };
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

/**
 * Drives one voice-input session. `onTranscript` fires continuously with the
 * live interim text and once more with `isFinal: true` when speech stops —
 * callers typically use it to fill (not auto-submit) a text input.
 */
export function useVoiceInput(onTranscript: (text: string, isFinal: boolean) => void) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(speechRecognitionSupported);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback((onError?: (message: string) => void) => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      if (finalText) onTranscriptRef.current(finalText.trim(), true);
      else if (interimText) onTranscriptRef.current(interimText, false);
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === "no-speech") return;
      const message =
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "Microphone access was denied"
          : "Couldn't hear that — try again";
      onError?.(message);
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      onError?.("Couldn't start the microphone");
    }
  }, []);

  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  return { listening, supported, start, stop };
}
