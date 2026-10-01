import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { playOpeningChime } from "@/lib/chime";

const SESSION_KEY = "nuru-splash-shown";
/**
 * The opening's own sequence runs to 4.0s (the scripture fades in at 3.1s
 * over 0.9s). Hold past that so the finished composition is actually seen
 * for a beat rather than being pulled away on the last frame of the fade.
 */
const HOLD_MIN_MS = 5200;
/** Hard cap so a slow auth check never turns the opening into a stall. */
const HOLD_MAX_MS = 7000;
/** Matches .nuru-open-exit in styles.css. */
const EXIT_MS = 520;
const REDUCED_MOTION_MS = 260;

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
 * The drifting embers behind the arch. The design generates 44 of them from a
 * fixed hash rather than Math.random, so the field is identical on every open
 * and identical between server and client — this reproduces that formula.
 */
function useEmbers() {
  return useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => {
        const r = (k: number) => (((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1) + 1) % 1;
        const warm = i % 5 === 0;
        const size = 2 + Math.round(r(1) * 3);
        return {
          key: i,
          left: `${(4 + r(2) * 92).toFixed(1)}%`,
          bottom: `${Math.round(-10 + r(3) * 600)}px`,
          size: `${size}px`,
          background: warm ? "#F3D39A" : "#CFF0FF",
          boxShadow: `0 0 ${size * 3}px ${warm ? "rgba(230,181,102,.9)" : "rgba(72,191,255,.9)"}`,
          animation:
            `nuru-open-float ${(7 + r(4) * 7).toFixed(1)}s linear ${(1.5 + r(5) * 8).toFixed(1)}s infinite,` +
            ` nuru-open-sway ${(3 + r(6) * 3).toFixed(1)}s ease-in-out infinite`,
        };
      }),
    [],
  );
}

/**
 * The Opening — a direct build of the supplied "Opening" board.
 *
 * The arch draws itself in light over 1.9s, a beam falls through it, a spark
 * lands on the apex, then the wordmark, the line and the scripture fade up in
 * sequence. Two ray fields turn slowly behind it and embers drift upward.
 *
 * It is an overlay, not a route gate, so the destination screen keeps loading
 * underneath and is ready by the time it lifts away. Shows once per browser
 * tab session and collapses to a still frame for prefers-reduced-motion.
 */
export function SplashScreen() {
  const { loading: authLoading } = useAuth();
  const [stage, setStage] = useState<Stage>("pending");
  const [reducedMotion, setReducedMotion] = useState(false);
  const minElapsed = useRef(false);
  const exited = useRef(false);
  const authLoadingRef = useRef(authLoading);
  authLoadingRef.current = authLoading;
  const embers = useEmbers();

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

    // The chime lands with the spark on the apex of the arch.
    const chimeTimer = setTimeout(playOpeningChime, 2000);
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

  if (stage === "pending") {
    return (
      <div
        aria-hidden="true"
        data-testid="nuru-splash"
        className="fixed inset-0 z-[999] bg-[#071a30]"
      />
    );
  }
  if (stage === "gone") return null;

  return (
    <div
      aria-hidden="true"
      data-testid="nuru-splash"
      className={cn(
        "fixed inset-0 z-[999] flex flex-col items-center overflow-hidden",
        // The board's own background: a blue night sky settling into charcoal.
        "bg-[radial-gradient(900px_700px_at_50%_38%,#0B2A45_0%,#0A1C2C_38%,#08203a_75%,#071a30_100%)]",
        stage === "exiting" && "nuru-open-exit",
      )}
    >
      {/* Soft cyan bloom behind the mark */}
      <div className="nuru-open-glow pointer-events-none absolute left-1/2 top-10 h-[900px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(72,191,255,.18),rgba(72,191,255,0))]" />
      {/* Two ray fields, cool and warm, turning in opposite directions */}
      <div className="nuru-open-rays absolute left-1/2 top-[134px] h-[1300px] w-[1300px]" />
      <div className="nuru-open-rays nuru-open-rays-warm absolute left-1/2 top-[134px] h-[1040px] w-[1040px]" />

      {/* Drifting embers */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {embers.map((e) => (
          <span
            key={e.key}
            className="nuru-open-p"
            style={{
              left: e.left,
              bottom: e.bottom,
              width: e.size,
              height: e.size,
              background: e.background,
              boxShadow: e.boxShadow,
              animation: e.animation,
            }}
          />
        ))}
      </div>

      {/* The standing arches either side, rising in late. On a phone they sit
          lower and further out so they stay behind the scripture. */}
      <div className="nuru-open-archline nuru-open-side absolute -bottom-28 left-[-64px] h-[340px] w-[150px] sm:-bottom-10 sm:left-[150px] sm:h-[520px] sm:w-[260px]" />
      <div className="nuru-open-archline nuru-open-side absolute -bottom-28 right-[-64px] h-[340px] w-[150px] sm:-bottom-10 sm:right-[150px] sm:h-[520px] sm:w-[260px]" />

      {/* The mark: a blurred underlay and a crisp stroke, drawn together */}
      <div className="relative mt-[18vh] h-[220px] w-[176px] sm:mt-[120px] sm:h-[300px] sm:w-[240px]">
        <svg viewBox="0 0 200 250" fill="none" className="h-full w-full">
          <defs>
            <filter id="nuru-open-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
            <linearGradient id="nuru-open-beam-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#9FE0FF" stopOpacity=".55" />
              <stop offset=".55" stopColor="#48BFFF" stopOpacity=".12" />
              <stop offset="1" stopColor="#48BFFF" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon
            className="nuru-open-beam"
            points="100,16 50,244 150,244"
            fill="url(#nuru-open-beam-grad)"
          />
          <path
            className="nuru-open-draw"
            pathLength={1}
            d="M40 244V124C40 74 68 38 100 12C132 38 160 74 160 124V244"
            stroke="#48BFFF"
            strokeWidth="12"
            strokeLinecap="round"
            opacity=".55"
            filter="url(#nuru-open-blur)"
          />
          <path
            className="nuru-open-draw"
            pathLength={1}
            d="M40 244V124C40 74 68 38 100 12C132 38 160 74 160 124V244"
            stroke="#BDEBFF"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle
            className="nuru-open-spark"
            cx="100"
            cy="12"
            r="5"
            fill="#FFFFFF"
            filter="url(#nuru-open-blur)"
          />
          <circle className="nuru-open-spark" cx="100" cy="12" r="2.5" fill="#FFFFFF" />
        </svg>
      </div>

      {/* Wordmark */}
      <div className="nuru-open-f1 mt-6 flex flex-col items-center gap-2 sm:mt-[30px]">
        <span className="ml-[0.34em] text-[42px] leading-none font-semibold tracking-[0.34em] sm:text-[64px]">
          NURU
        </span>
        <span className="ml-[0.6em] text-[13px] leading-none font-bold tracking-[0.6em] text-[#C9E9FA] sm:text-[20px]">
          FAITH
        </span>
      </div>

      <span className="nuru-open-f2 mt-5 font-display text-[22px] text-ink-2 sm:mt-[26px] sm:text-[30px]">
        Light for the path
      </span>

      <div className="flex-1" />

      <div className="nuru-open-f3 mb-9 flex flex-col items-center gap-1.5 px-6 text-center sm:flex-row sm:gap-3">
        <span className="font-display text-[15px] text-ink-2 sm:text-[18px]">
          &ldquo;Your word is a lamp to my feet, and a light for my path.&rdquo;
        </span>
        <span className="text-[10px] font-bold tracking-[0.14em] text-ink-3 sm:text-[11px]">
          PSALM 119:105
        </span>
      </div>
    </div>
  );
}
