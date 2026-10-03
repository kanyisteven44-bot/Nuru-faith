import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const SESSION_KEY = "nuru-opening-3d-shown";
const HOLD_MS = 3400;
const MAX_MS = 5000;
const EXIT_MS = 320;
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
const ARCH = "M40 244V124C40 74 68 38 100 12C132 38 160 74 160 124V244";

/** Lightweight CSS 3D: no video, generated photo, WebGL or external asset. */
export function SplashScreen({
  preview = false,
  onComplete,
}: {
  preview?: boolean;
  onComplete?: () => void;
}) {
  const { loading } = useAuth();
  const loadingRef = useRef(loading);
  loadingRef.current = loading;
  const [stage, setStage] = useState<"pending" | "playing" | "exiting" | "gone">("pending");
  const [reducedMotion, setReducedMotion] = useState(false);
  const minElapsed = useRef(false);
  const exited = useRef(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const skipButton = useRef<HTMLButtonElement>(null);
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
    // The public preview owns its own scene; avoid two overlapping openings.
    if (!preview && (window.location.pathname === "/opening" || alreadyShown())) {
      setStage("gone");
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(reduce);
    setStage("playing");
    if (preview) return;
    const min = setTimeout(
      () => {
        minElapsed.current = true;
        if (!loadingRef.current || reduce) exit();
      },
      reduce ? 260 : HOLD_MS,
    );
    const max = setTimeout(exit, reduce ? 260 : MAX_MS);
    return () => {
      clearTimeout(min);
      clearTimeout(max);
    };
  }, [preview, exit]);

  useEffect(() => {
    if (!preview && stage === "playing" && minElapsed.current && !loading) exit();
  }, [loading, preview, stage, exit]);
  useEffect(
    () => () => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (stage !== "playing") return;
    const previous = document.activeElement;
    skipButton.current?.focus({ preventScroll: true });
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus({ preventScroll: true });
    };
  }, [stage]);

  if (stage === "gone") return null;
  return (
    <div
      ref={overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Nuru Faith opening"
      data-testid="nuru-splash"
      data-reduced-motion={reducedMotion}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          exit();
        }
        if (event.key === "Tab") {
          event.preventDefault();
          skipButton.current?.focus();
        }
      }}
      className={cn(
        "nuru-opening fixed inset-0 z-[999] flex flex-col items-center overflow-hidden text-white",
        stage === "pending" && "invisible",
        stage === "exiting" && "nuru-open-exit",
      )}
    >
      <div aria-hidden="true" className="nuru-opening-halo" />
      <div aria-hidden="true" className="nuru-opening-floor" />
      <button
        ref={skipButton}
        type="button"
        onClick={exit}
        className="absolute right-5 top-[max(1.25rem,env(safe-area-inset-top))] z-20 min-h-11 rounded-full border border-white/25 bg-white/5 px-5 text-sm font-medium text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200"
      >
        {preview ? "Close preview" : "Skip intro"}
      </button>
      <div aria-hidden="true" className="nuru-opening-scene">
        <div className="nuru-opening-mark">
          {Array.from({ length: 9 }, (_, index) => (
            <svg
              key={index}
              viewBox="0 0 200 250"
              fill="none"
              className="nuru-opening-depth"
              style={{ transform: `translateZ(${-index * 2.5}px)`, opacity: 1 - index * 0.065 }}
            >
              <path
                d={ARCH}
                stroke={index === 0 ? "#C9F3FF" : "#167CA9"}
                strokeWidth={index === 0 ? 5 : 7}
                strokeLinecap="round"
              />
            </svg>
          ))}
          <svg viewBox="0 0 200 250" fill="none" className="nuru-opening-face">
            <path
              className="nuru-opening-stroke"
              d={ARCH}
              pathLength={1}
              stroke="#EDFCFF"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
          <div className="nuru-opening-beam" />
        </div>
      </div>
      <div className="nuru-opening-title relative z-10 mt-4 text-center">
        <h1 className="pl-[0.28em] text-[clamp(2.25rem,7vw,4rem)] font-semibold leading-none tracking-[0.28em] text-white">
          NURU
        </h1>
        <p className="mt-3 pl-[0.5em] text-xs font-semibold tracking-[0.5em] text-[#BDEBFF] sm:text-base">
          FAITH
        </p>
      </div>
      <p className="nuru-opening-tagline relative z-10 mt-6 font-display text-[clamp(1.25rem,4vw,1.75rem)] text-[#E0F3FF]">
        A brighter you.
      </p>
      <p className="nuru-opening-tagline relative z-10 mt-3 text-xs tracking-wide text-[#A9C8DE] sm:text-sm">
        Faith. Community. Purpose.
      </p>
      <div className="nuru-opening-verse relative z-10 mt-auto px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 text-center">
        <p className="max-w-md font-display text-sm leading-relaxed text-[#C7DDEA] sm:text-base">
          “Your word is a lamp to my feet, and a light for my path.”
        </p>
        <p className="mt-2 text-[10px] font-semibold tracking-[0.18em] text-[#8DADC4]">
          PSALM 119:105
        </p>
      </div>
    </div>
  );
}
