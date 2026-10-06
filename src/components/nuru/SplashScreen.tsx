import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { NuruGlyph } from "@/components/nuru/Logo";
import { cn } from "@/lib/utils";

const SESSION_KEY = "nuru-opening-v4-shown";
const HOLD_MS = 2100;
const MAX_MS = 3400;
const EXIT_MS = 360;

let shownOnLoad: boolean | null = null;

function alreadyShown() {
  if (shownOnLoad !== null) return shownOnLoad;
  try {
    shownOnLoad = sessionStorage.getItem(SESSION_KEY) === "1";
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    shownOnLoad = false;
  }
  return shownOnLoad;
}

/**
 * Nuru's first impression: one real photograph, one brand mark and one message.
 * The opening deliberately avoids a long loading animation; it exists to make
 * the transition into Nuru feel intentional while auth restores in the background.
 */
export function SplashScreen({
  preview = false,
  initialOnly = false,
  onComplete,
}: {
  preview?: boolean;
  initialOnly?: boolean;
  onComplete?: () => void;
}) {
  const { loading } = useAuth();
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  const [stage, setStage] = useState<"pending" | "playing" | "exiting" | "gone">("pending");
  const exited = useRef(false);
  const minElapsed = useRef(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionRef = useRef(onComplete);
  completionRef.current = onComplete;

  const exit = useCallback(() => {
    if (exited.current) return;
    exited.current = true;
    setStage("exiting");
    exitTimer.current = setTimeout(() => {
      setStage("gone");
      completionRef.current?.();
    }, EXIT_MS);
  }, []);

  useEffect(() => {
    if (
      !preview &&
      (window.location.pathname === "/opening" ||
        (initialOnly && window.location.pathname !== "/") ||
        alreadyShown())
    ) {
      setStage("gone");
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setStage("playing");

    if (preview) return;

    const min = setTimeout(
      () => {
        minElapsed.current = true;
        if (!loadingRef.current || reducedMotion) exit();
      },
      reducedMotion ? 220 : HOLD_MS,
    );
    const max = setTimeout(exit, reducedMotion ? 320 : MAX_MS);

    return () => {
      clearTimeout(min);
      clearTimeout(max);
    };
  }, [preview, initialOnly, exit]);

  useEffect(() => {
    if (!preview && stage === "playing" && minElapsed.current && !loading) exit();
  }, [loading, preview, stage, exit]);

  useEffect(
    () => () => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
    },
    [],
  );

  if (stage === "gone") return null;

  return (
    <div
      aria-label="Opening Nuru Faith"
      data-testid="nuru-splash"
      className={cn(
        "nuru-opening fixed inset-0 z-[999] overflow-hidden text-white",
        stage === "pending" && "invisible",
        stage === "exiting" && "nuru-open-exit",
      )}
    >
      <img
        src="/photos/friends-outdoors.jpg"
        alt=""
        aria-hidden="true"
        decoding="async"
        fetchPriority="high"
        className="nuru-opening-photo"
      />
      <div aria-hidden="true" className="nuru-opening-photo-overlay" />
      <div aria-hidden="true" className="nuru-opening-light" />

      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <div className="nuru-opening-brandmark" aria-hidden="true">
          <NuruGlyph className="h-full w-full" />
        </div>

        <div className="nuru-opening-wordmark mt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-cyan-100/75">
            Light for this generation
          </p>
          <h1 className="mt-3 font-sans text-[clamp(2.2rem,10vw,4.2rem)] font-bold leading-none tracking-[0.22em] text-white">
            NURU
          </h1>
          <p className="mt-2 font-sans text-[11px] font-semibold uppercase tracking-[0.5em] text-cyan-100/85 sm:text-sm">
            Faith
          </p>
        </div>

        <p className="nuru-opening-message mt-7 max-w-sm font-display text-[clamp(1.08rem,4vw,1.35rem)] leading-relaxed text-white/90">
          Find your people. Grow in faith. Live with purpose.
        </p>

        <div className="nuru-opening-rule mt-7 h-px w-20" aria-hidden="true" />
      </div>

      <button
        type="button"
        onClick={exit}
        className="nuru-opening-skip absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-20 min-h-11 rounded-full px-4 text-xs font-semibold tracking-wide text-white/70 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-100"
      >
        {preview ? "Close" : "Skip"}
      </button>

      {!preview && (
        <button
          type="button"
          aria-label="Continue into Nuru Faith"
          onClick={exit}
          className="absolute inset-x-0 bottom-0 z-10 h-[28vh] cursor-default focus-visible:outline-none"
        />
      )}
    </div>
  );
}
