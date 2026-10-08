import { WELCOME_IMAGE_SRCSET, WELCOME_IMAGE_SIZES } from "@/lib/welcomeImage";
import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { NuruGlyph } from "@/components/nuru/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nuru Faith — Connect. Grow. Live Your Faith." },
      {
        name: "description",
        content:
          "A digital home for young people to know God, grow in faith, find real community, and live out their purpose.",
      },
      { property: "og:title", content: "Nuru Faith — Connect. Grow. Live Your Faith." },
      {
        property: "og:description",
        content: "Know God, grow in faith, find real community, and live out your purpose.",
      },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [
      { rel: "canonical", href: "https://nurufaith.website/about" },
      // Start the small responsive Welcome photograph while the entry restores auth.
      { rel: "preload", as: "image", href: "/photos/alpine-reflections.jpg",
        imageSrcSet: WELCOME_IMAGE_SRCSET, imageSizes: WELCOME_IMAGE_SIZES, fetchPriority: "high" },
    ],
  }),
  component: Splash,
});

const SPLASH_MS = 2200;

function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    let done = false;
    const go = (to: "/home" | "/welcome") => {
      if (done) return;
      done = true;
      void navigate({ to, replace: true });
    };

    const timer = setTimeout(() => go("/welcome"), SPLASH_MS);
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        clearTimeout(timer);
        go(data.session ? "/home" : "/welcome");
      })
      .catch(() => {
        clearTimeout(timer);
        go("/welcome");
      });
    return () => {
      done = true;
      clearTimeout(timer);
    };
  }, [navigate]);
  // Server-render a lightweight, accessible first frame: never leave a
  // featureless dark screen while Supabase restores an existing session.
  return (
    <main
      className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#06152A] px-6 text-center text-white"
      aria-label="Opening Nuru Faith"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_32%,rgba(54,139,207,0.30),transparent_56%),linear-gradient(180deg,#071B34_0%,#040C19_100%)]"
      />
      <div aria-hidden="true" className="absolute top-[28%] h-44 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="relative z-10 flex flex-col items-center">
        <span className="flex h-28 w-28 items-center justify-center rounded-[30px] border border-white/15 bg-white/[0.05] shadow-[0_0_65px_rgba(72,191,255,0.18)]">
          <NuruGlyph className="h-20 w-20" />
        </span>
        <span className="mt-6 text-[30px] font-bold tracking-[0.22em]">NURU</span>
        <span className="mt-1 text-[12px] font-semibold tracking-[0.5em] text-cyan-100/90">FAITH</span>
        <p role="status" className="mt-9 text-[13px] text-cyan-50/75">
          Preparing your home…
        </p>
        <div className="mt-3 h-1 w-32 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
          <span className="block h-full w-1/2 animate-pulse rounded-full bg-[#55C8FF]" />
        </div>
      </div>
      <p className="absolute inset-x-6 bottom-[max(1.75rem,env(safe-area-inset-bottom))] text-[11px] tracking-[0.12em] text-white/45">
        FAITH · COMMUNITY · PURPOSE
      </p>
    </main>
  );
}
