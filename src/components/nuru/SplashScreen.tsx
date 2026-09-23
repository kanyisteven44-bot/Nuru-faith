import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { playOpeningChime } from "@/lib/chime";
import { NuruGlyph } from "./Logo";

const SESSION_KEY = "nuru-splash-shown";
/**
 * Earliest the hold can end. The ident — approach, lock, specular hit, lockup
 * — finishes at ~1480ms, so this is the moment it has actually completed
 * rather than a padded wait, and still 220ms shorter than the old opening.
 */
const HOLD_MIN_MS = 1500;
/** Hard cap so a slow auth check never turns the splash into a stall. */
const HOLD_MAX_MS = 3600;
/** Matches the splash-flash keyframe duration in styles.css. */
const EXIT_MS = 480;
const REDUCED_MOTION_MS = 220;

/**
 * Depth layers that give the mark volume. Each sits further back in Z and a
 * shade darker, so turning the rig shows a machined edge rather than a flat
 * cut-out. This is what separates a broadcast ident from a logo fade.
 */
const EXTRUDE_DEPTH = 13;
/**
 * Emitted deepest-first so the lit front face is painted last. Each layer is
 * shaded by hand rather than with a filter, because a filter would flatten it
 * out of the rig's 3D space.
 */
const EXTRUDE = Array.from({ length: EXTRUDE_DEPTH }, (_, n) => {
  const i = EXTRUDE_DEPTH - 1 - n; // 12 (deepest) ... 0 (front face)
  const t = i / (EXTRUDE_DEPTH - 1);
  return {
    i,
    front: i === 0,
    arch: `rgb(${Math.round(12 + 10 * (1 - t))} ${Math.round(48 + 40 * (1 - t))} ${Math.round(92 + 70 * (1 - t))})`,
    cross: `rgb(${Math.round(40 + 40 * (1 - t))} ${Math.round(88 + 50 * (1 - t))} ${Math.round(124 + 60 * (1 - t))})`,
  };
});

/** Streaks tearing past camera while the mark is still travelling. */
const STREAKS = Array.from({ length: 14 }, (_, i) => ({
  angle: `${(i * 360) / 14 + (i % 2 ? 9 : 0)}deg`,
  delay: `${(i % 5) * 34}ms`,
}));

/** Shafts opening behind the mark once it locks. */
const SHAFT_COUNT = 12;
const SHAFTS = Array.from({ length: SHAFT_COUNT }, (_, i) => ({
  angle: `${(i * 360) / SHAFT_COUNT}deg`,
  delay: `${(i % 4) * 34}ms`,
}));

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
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <NuruGlyph className="h-20 w-20" />
          <div className="flex flex-col items-center gap-2">
            <span className="font-display text-xs font-bold tracking-[0.28em] text-white">
              NURU FAITH
            </span>
            <span className="font-display text-[8px] tracking-[0.22em] text-white/65">
              FAITH · GROWTH · PURPOSE
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* Streaks tearing past while the mark is still travelling. */}
          <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
            {STREAKS.map((r, i) => (
              <span
                key={i}
                className="splash-tv-streak"
                style={{ "--a": r.angle, animationDelay: r.delay } as CSSProperties}
              />
            ))}
          </div>

          {/* Shafts opening behind the locked mark. */}
          <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
            {SHAFTS.map((r, i) => (
              <span
                key={i}
                className="splash-tv-shaft"
                style={
                  { "--a": r.angle, animationDelay: `calc(820ms + ${r.delay})` } as CSSProperties
                }
              />
            ))}
          </div>

          <div
            className={cn(
              "flex h-full flex-col items-center justify-center gap-4 transition-opacity duration-150",
              stage === "exiting" && "opacity-0",
            )}
          >
            {/* The mark is extruded — a stack of layers in Z rather than a flat
                shape — and the rig it sits on dollies in from deep space and
                settles, so turning it shows a real edge. */}
            <div className="relative h-24 w-24 [perspective:560px]">
              <div
                aria-hidden="true"
                className="splash-halo absolute -inset-3 rounded-full bg-[radial-gradient(circle,rgba(22,140,255,0.42),transparent_70%)]"
              />

              <div className="splash-tv-rig absolute inset-0">
                {EXTRUDE.map((layer) => (
                  <svg
                    key={layer.i}
                    viewBox="0 0 64 64"
                    aria-hidden="true"
                    className="splash-tv-layer"
                    style={{ "--i": layer.i } as CSSProperties}
                  >
                    <path
                      d="M17 52V29a15 15 0 0 1 30 0v23"
                      fill="none"
                      stroke={layer.front ? "url(#nuru-tv-arch)" : layer.arch}
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <g
                      stroke={layer.front ? "url(#nuru-tv-cross)" : layer.cross}
                      strokeWidth="4.5"
                      strokeLinecap="round"
                    >
                      <line x1="32" y1="20" x2="32" y2="45" />
                      <line x1="23" y1="31" x2="41" y2="31" />
                    </g>
                  </svg>
                ))}

                {/* Gradients for the front face only. */}
                <svg width="0" height="0" aria-hidden="true" className="absolute">
                  <defs>
                    <linearGradient
                      id="nuru-tv-arch"
                      x1="32"
                      y1="6"
                      x2="32"
                      y2="58"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0" stopColor="#7fe7ff" />
                      <stop offset="1" stopColor="#168cff" />
                    </linearGradient>
                    <linearGradient
                      id="nuru-tv-cross"
                      x1="32"
                      y1="16"
                      x2="32"
                      y2="48"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0" stopColor="#ffffff" />
                      <stop offset="1" stopColor="#8ad9ff" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* The specular hit raking across the face as it locks. */}
              <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
                <div className="splash-tv-spec" />
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <span className="splash-word-reveal font-display text-xs font-bold tracking-[0.28em] text-white">
                NURU FAITH
              </span>
              <span
                aria-hidden="true"
                className="splash-rule block h-px w-24 bg-[linear-gradient(90deg,transparent,var(--brand-cyan),transparent)]"
              />
              <span className="splash-tagline font-display text-[8px] tracking-[0.22em] text-white/65">
                FAITH · GROWTH · PURPOSE
              </span>
            </div>
          </div>

          {/* Anamorphic flare across the whole frame at the moment of lock. */}
          <div aria-hidden="true" className="splash-tv-flare" />

          <div className={cn("splash-flash", stage === "exiting" && "splash-flash-play")} />
        </>
      )}
    </div>
  );
}
