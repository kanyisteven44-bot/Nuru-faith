import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { playOpeningChime } from "@/lib/chime";
import { NuruGlyph } from "./Logo";

const SESSION_KEY = "nuru-splash-shown";
/** Earliest the hold phase can end — long enough for the beam + logo reveal to read as intentional. */
const HOLD_MIN_MS = 1700;
/** Hard cap so a slow auth check never turns the splash into a stall. */
const HOLD_MAX_MS = 3600;
/** Matches the splash-flash keyframe duration in styles.css. */
const EXIT_MS = 480;
const REDUCED_MOTION_MS = 220;

type Stage = "pending" | "playing" | "exiting" | "gone";

// Module-scoped (not component-scoped) so that React's dev-mode double-invoke
// of mount effects can't read back the flag its own first invocation just
// wrote and wrongly conclude "shown in an earlier session" — both
// invocations within the same page load share this one cached answer.
let alreadyShownThisPageLoad: boolean | null = null;
function wasSplashAlreadyShown(): boolean {
  if (alreadyShownThisPageLoad !== null) return alreadyShownThisPageLoad;
  try {
    alreadyShownThisPageLoad = sessionStorage.getItem(SESSION_KEY) === "1";
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    alreadyShownThisPageLoad = false;
  }
  return alreadyShownThisPageLoad;
}

/**
 * The "Light / Nuru" app-open moment: near-black, a beam of light sweeps
 * across revealing the real Nuru mark, then the light itself expands into
 * the real interface underneath. Mounted once at the app root — it's an
 * overlay, not a route gate, so the destination screen (auth or home) keeps
 * loading normally underneath it and is simply ready by the time it's revealed.
 *
 * Shows once per browser tab session, skips instantly on every load after
 * that, and collapses to a quick fade for prefers-reduced-motion.
 */
export function SplashScreen() {
  const { loading: authLoading } = useAuth();
  const [stage, setStage] = useState<Stage>("pending");
  const [reducedMotion, setReducedMotion] = useState(false);
  const minElapsed = useRef(false);
  const exited = useRef(false);
  const authLoadingRef = useRef(authLoading);
  authLoadingRef.current = authLoading;

  const exit = useCallback((delay: number) => {
    if (exited.current) return;
    exited.current = true;
    setStage("exiting");
    setTimeout(() => setStage("gone"), delay);
  }, []);

  const maybeExit = useCallback(() => {
    if (minElapsed.current && !authLoadingRef.current) exit(EXIT_MS);
  }, [exit]);

  useEffect(() => {
    if (wasSplashAlreadyShown()) {
      exited.current = true;
      setStage("gone");
      return;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(reduce);
    setStage("playing");

    if (reduce) {
      const t = setTimeout(() => exit(REDUCED_MOTION_MS), REDUCED_MOTION_MS);
      return () => clearTimeout(t);
    }

    const chimeTimer = setTimeout(playOpeningChime, 520);
    const minTimer = setTimeout(() => {
      minElapsed.current = true;
      maybeExit();
    }, HOLD_MIN_MS);
    const maxTimer = setTimeout(() => exit(EXIT_MS), HOLD_MAX_MS);
    return () => {
      clearTimeout(chimeTimer);
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
    };
    // Intentionally run once on mount — auth completion is watched below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Whenever auth resolves (in either order relative to the minimum hold),
  // re-check whether both conditions are now satisfied.
  useEffect(() => {
    if (stage === "playing" && !reducedMotion) maybeExit();
  }, [authLoading, stage, reducedMotion, maybeExit]);

  if (stage === "gone" || stage === "pending") {
    return stage === "pending" ? (
      <div
        aria-hidden="true"
        data-testid="nuru-splash"
        className="fixed inset-0 z-[999] bg-[#070d18]"
      />
    ) : null;
  }

  return (
    <div
      aria-hidden="true"
      data-testid="nuru-splash"
      className="fixed inset-0 z-[999] overflow-hidden bg-[#070d18]"
    >
      {reducedMotion ? (
        <div className="flex h-full items-center justify-center">
          <NuruGlyph className="h-20 w-20" />
        </div>
      ) : (
        <>
          <div className="splash-beam" />
          <div
            className={cn(
              "flex h-full flex-col items-center justify-center gap-4 transition-opacity duration-150",
              stage === "exiting" && "opacity-0",
            )}
          >
            {/* The mark assembles from two pieces tumbling in from different
                3D angles (arch on the Y axis, cross on the X axis) rather
                than fading in as one flat unit, then flashes and catches a
                light sheen the instant they lock together. */}
            <div className="relative h-20 w-20 [perspective:700px]">
              <div
                aria-hidden="true"
                className="splash-halo absolute -inset-3 rounded-full bg-[radial-gradient(circle,rgba(22,140,255,0.42),transparent_70%)]"
              />
              <div className="absolute inset-0 [transform-style:preserve-3d]">
                <svg
                  viewBox="0 0 64 64"
                  className="splash-arch-tumble absolute inset-0 h-full w-full"
                >
                  <defs>
                    <linearGradient
                      id="nuru-arch-splash"
                      x1="32"
                      y1="6"
                      x2="32"
                      y2="58"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0" stopColor="#7fe7ff" />
                      <stop offset="1" stopColor="#168cff" />
                    </linearGradient>
                    <filter
                      id="nuru-bloom-arch-splash"
                      x="-60%"
                      y="-60%"
                      width="220%"
                      height="220%"
                    >
                      <feGaussianBlur stdDeviation="2.2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <path
                    d="M17 52V29a15 15 0 0 1 30 0v23"
                    fill="none"
                    stroke="url(#nuru-arch-splash)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    filter="url(#nuru-bloom-arch-splash)"
                  />
                </svg>
                <svg
                  viewBox="0 0 64 64"
                  className="splash-cross-tumble absolute inset-0 h-full w-full"
                >
                  <defs>
                    <linearGradient
                      id="nuru-cross-splash"
                      x1="32"
                      y1="16"
                      x2="32"
                      y2="48"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0" stopColor="#ffffff" />
                      <stop offset="1" stopColor="#8ad9ff" />
                    </linearGradient>
                    <filter
                      id="nuru-bloom-cross-splash"
                      x="-60%"
                      y="-60%"
                      width="220%"
                      height="220%"
                    >
                      <feGaussianBlur stdDeviation="2.2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <g
                    stroke="url(#nuru-cross-splash)"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    filter="url(#nuru-bloom-cross-splash)"
                  >
                    <line x1="32" y1="20" x2="32" y2="45" />
                    <line x1="23" y1="31" x2="41" y2="31" />
                  </g>
                </svg>
              </div>
              <div
                aria-hidden="true"
                className="splash-converge-flash absolute -inset-1.5 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.95),transparent_60%)]"
              />
              <div aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-full">
                <div className="splash-sheen absolute -inset-y-6 left-1/2 w-1/2 -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.85),transparent)]" />
              </div>
            </div>
            <span className="splash-word-reveal font-display text-xs font-bold tracking-[0.28em] text-white">
              NURU FAITH
            </span>
          </div>
          <div className={cn("splash-flash", stage === "exiting" && "splash-flash-play")} />
        </>
      )}
    </div>
  );
}
