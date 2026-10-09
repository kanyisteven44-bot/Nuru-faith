import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { NuruGlyph } from "@/components/nuru/Logo";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

const SESSION_KEY = "nuru-opening-v5-shown";
const HOLD_MS = 650;
const MAX_MS = 1800;
const EXIT_MS = 320;

const OPENING_PHOTOS = [
  "/photos/friends-outdoors.jpg",
  "/photos/worship-gathering.jpg",
  "/photos/prayer-community.jpg",
] as const;

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
 * First impression for Nuru Faith:
 * real Gen Z photography, the real brand mark, and a quiet loading indicator.
 * No extra copy competes with the image while the session/app finishes opening.
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
  const [photoIndex, setPhotoIndex] = useState(0);
  const exited = useRef(false);
  const minElapsed = useRef(false);
  const completed = useRef(false);
  const completionRef = useRef(onComplete);
  completionRef.current = onComplete;

  const exit = useCallback(() => {
    if (exited.current) return;
    exited.current = true;
    setStage("exiting");
  }, []);
  const finish = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    exited.current = true;
    setStage("gone");
    completionRef.current?.();
  }, []);

  useEffect(() => {
    // Android and iOS already display the Nuru icon while starting an
    // installed PWA. Playing a second opening after that looks like a hang.
    // Keep the full animated opening available at /opening for previews.
    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (
      !preview &&
      (installed ||
        window.location.pathname === "/opening" ||
        (initialOnly && window.location.pathname !== "/") ||
        alreadyShown())
    ) {
      setStage("gone");
      // Let entry routing continue even when this splash was already shown.
      completionRef.current?.();
      return;
    }

    setStage("playing");
  }, [preview, initialOnly]);

  useEffect(() => {
    if (stage !== "playing") return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setPhotoIndex(0);
      return;
    }
    const photoTimer = window.setInterval(() => {
      setPhotoIndex((current) => (current + 1) % OPENING_PHOTOS.length);
    }, 900);
    return () => window.clearInterval(photoTimer);
  }, [stage]);

  useEffect(() => {
    if (stage !== "playing") return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  }, [preview, stage, exit]);

  useEffect(() => {
    if (!preview && stage === "playing" && minElapsed.current && !loading) exit();
  }, [loading, preview, stage, exit]);

  useEffect(() => {
    if (stage !== "exiting") return;
    const timer = setTimeout(finish, EXIT_MS);
    return () => clearTimeout(timer);
  }, [stage, finish]);

  useEffect(() => {
    if (preview || stage === "gone") return;
    // Mobile browsers suspend timers in the background. Never restore an
    // opening overlay over a screen the person was already using.
    const onVisibility = () => {
      if (document.visibilityState === "hidden") finish();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) finish();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", finish);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", finish);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [preview, stage, finish]);

  // Do not render the three photo <img> nodes during SSR or while deciding
  // whether an opening is needed. They otherwise compete with application JS
  // on cold mobile starts even when the overlay is invisible.
  if (stage === "gone" || stage === "pending") return null;

  return (
    <div
      aria-label="Opening Nuru Faith"
      data-testid="nuru-splash"
      className={cn(
        "nuru-opening fixed inset-0 z-[999] overflow-hidden text-white",
        stage === "exiting" && "nuru-open-exit pointer-events-none",
      )}
    >
      <div className="absolute inset-0" aria-hidden="true">
        {/* Keep photography visible while rotating layers load or transition. */}
        <img
          src={OPENING_PHOTOS[0]}
          alt=""
          decoding="async"
          fetchPriority="high"
          className="nuru-opening-photo nuru-opening-photo-base"
        />
        {OPENING_PHOTOS.map((src, index) => (
          <img
            key={src}
            src={index <= photoIndex ? src : undefined}
            alt=""
            decoding="async"
            fetchPriority={index === 0 ? "high" : "auto"}
            className={cn(
              "nuru-opening-photo",
              index === photoIndex ? "nuru-opening-photo-active" : "nuru-opening-photo-idle",
            )}
          />
        ))}
      </div>
      <div aria-hidden="true" className="nuru-opening-photo-overlay" />

      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <div className="nuru-opening-brandmark" aria-hidden="true">
          <NuruGlyph className="h-full w-full" />
        </div>
        <div className="nuru-opening-wordmark mt-4">
          <h1 className="font-sans text-[clamp(2.15rem,10vw,4rem)] font-bold leading-none tracking-[0.2em] text-white">
            NURU
          </h1>
          <p className="mt-2 font-sans text-[11px] font-semibold uppercase tracking-[0.48em] text-cyan-100/90 sm:text-sm">
            Faith
          </p>
          <p className="mt-4 text-[11px] font-medium tracking-[0.18em] text-white/75">
            FAITH · COMMUNITY · PURPOSE
          </p>
        </div>
        <button
          type="button"
          onClick={finish}
          className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/30 bg-white/15 px-6 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
        >
          Continue <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <div className="nuru-opening-loader absolute inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-20 mx-auto w-[min(78vw,18rem)] text-center">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
          Opening Nuru Faith
        </p>
        <div className="nuru-opening-loader-track" aria-hidden="true">
          <span className="nuru-opening-loader-bar" />
        </div>
      </div>
    </div>
  );
}
