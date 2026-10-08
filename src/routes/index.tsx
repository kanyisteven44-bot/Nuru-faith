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
    links: [{ rel: "canonical", href: "https://nurufaith.website/about" }],
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
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#07111f] px-6 text-center text-white"
      aria-label="Opening Nuru Faith"
    >
      <NuruGlyph className="h-20 w-20" />
      <p className="text-lg font-semibold tracking-[0.22em]">NURU FAITH</p>
      <p role="status" className="text-sm text-white/70">
        Preparing your home…
      </p>
    </main>
  );
}
