import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { playOpeningChime } from "@/lib/chime";
import { NuruGlyph } from "./Logo";

const SESSION_KEY = "nuru-splash-shown";
/**
 * Earliest the hold phase can end. The full sequence — dust, tumble, burst,
 * daybreak, lockup — finishes at ~1420ms, so this is the moment it has
 * actually completed, not a padded wait. It is 250ms shorter than the
 * previous opening despite doing considerably more.
 */
const HOLD_MIN_MS = 1450;
/** Hard cap so a slow auth check never turns the splash into a stall. */
const HOLD_MAX_MS = 3600;
/** Matches the splash-flash keyframe duration in styles.css. */
const EXIT_MS = 480;
const REDUCED_MOTION_MS = 220;

/**
 * Where each gathering point starts, relative to the mark. Spread round a ring
 * at mixed radii so the drift reads as scattered light rather than a clock
 * face. Computed once at module load — it is the same every open.
 */
const DUST = Array.from({ length: 24 }, (_, i) => {
  const angle = (i / 24) * Math.PI * 2 + (i % 3) * 0.22;
  const radius = 92 + (i % 5) * 34;
  return {
    dx: `${Math.round(Math.cos(angle) * radius)}px`,
    dy: `${Math.round(Math.sin(angle) * radius)}px`,
    delay: `${(i % 8) * 38}ms`,
  };
});

/**
 * The starburst thrown off at the moment the two pieces lock together. Rays go
 * the whole way round rather than fanning one way, so it reads as light
 * breaking out of the mark instead of a searchlight pointed somewhere.
 */
const RAY_COUNT = 16;
const RAYS = Array.from({ length: RAY_COUNT }, (_, i) => ({
  angle: `${(i * 360) / RAY_COUNT}deg`,
  // Alternate long and short so the burst has texture instead of a flat wheel.
  scale: i % 2 === 0 ? 1 : 0.62,
  opacity: i % 2 === 0 ? 0.72 : 0.4,
  delay: `${(i % 4) * 30}ms`,
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
 * The "Light / Nuru" app-open moment, told as one gesture: out of the dark,
 * points of light gather; they lock into the real Nuru mark and burst into
 * rays; daybreak rises behind it; the lockup settles; then the light itself
 * expands into the real interface underneath. Nuru is Swahili for light.
 *
 * Mounted once at the app root — it's an
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

    const chimeTimer = setTimeout(playOpeningChime, 640);
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
          {/* Daybreak rising behind everything. */}
          <div aria-hidden="true" className="splash-dawn" />

          {/* Points of light gathering to where the mark is about to form. */}
          <div aria-hidden="true" className="absolute inset-0">
            {DUST.map((d, i) => (
              <span
                key={i}
                className="splash-dust absolute top-1/2 left-1/2 block h-[3px] w-[3px] rounded-full bg-[#bdefff]"
                style={
                  {
                    "--dx": d.dx,
                    "--dy": d.dy,
                    animationDelay: d.delay,
                  } as CSSProperties
                }
              />
            ))}
          </div>

          {/* The burst thrown off as the two pieces lock. */}
          <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
            {RAYS.map((r, i) => (
              <span
                key={i}
                className="splash-ray"
                style={
                  {
                    "--a": r.angle,
                    "--len": r.scale,
                    opacity: r.opacity,
                    animationDelay: `calc(640ms + ${r.delay})`,
                  } as CSSProperties
                }
              />
            ))}
          </div>

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
          <div className={cn("splash-flash", stage === "exiting" && "splash-flash-play")} />
        </>
      )}
    </div>
  );
}
