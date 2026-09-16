import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { playOpeningChime } from "@/lib/chime";
import { NuruMark } from "./Logo";

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
        className="fixed inset-0 z-[999] bg-[#000814]"
      />
    ) : null;
  }

  return (
    <div
      aria-hidden="true"
      data-testid="nuru-splash"
      className="fixed inset-0 z-[999] overflow-hidden bg-[#000814]"
    >
      {reducedMotion ? (
        <div className="flex h-full items-center justify-center">
          <NuruMark className="h-14 w-14" />
        </div>
      ) : (
        <>
          <div className="splash-beam" />
          <div
            className={cn(
              "flex h-full flex-col items-center justify-center gap-3 transition-opacity duration-150",
              stage === "exiting" && "opacity-0",
            )}
          >
            <NuruMark className="splash-logo-reveal h-14 w-14" />
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
