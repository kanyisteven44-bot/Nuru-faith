import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { playOpeningChime } from "@/lib/chime";
import { NuruGlyph } from "./Logo";
import { useRotatingPhoto } from "@/lib/photoRotation";

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
 * The "Light / Nuru" app-open moment: the mark rises out of the mountain dawn
 * with the wordmark and tagline, then the light expands into the real
 * interface underneath. Mounted once at the app root — it's an overlay, not a
 * route gate, so the destination screen (auth or home) keeps loading normally
 * underneath it and is simply ready by the time it's revealed.
 *
 * Shows once per browser tab session, skips instantly on every load after
 * that, and collapses to a quick fade for prefers-reduced-motion.
 */
export function SplashScreen() {
  const hero = useRotatingPhoto("nuru-signature-splash");
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
      className="fixed inset-0 z-[999] overflow-hidden bg-[#000711]"
    >
      {reducedMotion ? (
        <div className="mx-auto flex h-full max-w-[430px] items-center justify-center bg-[#000814]">
          <NuruGlyph className="h-20 w-20" />
        </div>
      ) : (
        <div className="relative mx-auto h-full max-w-[430px] overflow-hidden bg-[#000814] shadow-[0_0_80px_rgba(0,0,0,.65)]">
          {/* The opening still from the app design: the mark rising out of the
              mountain dawn, then the whole frame blooms into the interface. */}
          <img
            src={hero}
            alt=""
            width={1024}
            height={640}
            className="splash-photo absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#000814]/70 via-[#000814]/45 to-[#000814]" />

          <div
            className={cn(
              "relative flex h-full flex-col items-center justify-center px-8 text-center transition-opacity duration-150",
              stage === "exiting" && "opacity-0",
            )}
          >
            <NuruGlyph className="splash-mark h-24 w-24" />

            <span className="splash-rise-1 mt-6 font-display text-[38px] leading-none font-bold tracking-[0.18em] text-white">
              NURU
            </span>
            <span className="splash-rise-1 mt-2 font-display text-[15px] tracking-[0.42em] text-cyan">
              FAITH
            </span>

            <span className="splash-rise-2 absolute inset-x-0 bottom-14 px-8">
              <span className="block font-display text-[15px] font-semibold tracking-[0.2em] text-white">
                A BRIGHTER YOU.
              </span>
              <span className="mt-2 block text-[12px] text-white/70">
                Faith. Community. Purpose. Always with you.
              </span>
            </span>
          </div>
          <div className={cn("splash-flash", stage === "exiting" && "splash-flash-play")} />
        </div>
      )}
    </div>
  );
}
