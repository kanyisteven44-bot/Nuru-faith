import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { NuruGlyph } from "@/components/nuru/Logo";
import hero from "@/assets/mountain-dawn.jpg";

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
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        clearTimeout(timer);
        go("/home");
      }
    });
    return () => {
      done = true;
      clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <img
        src={hero}
        alt=""
        width={1024}
        height={640}
        className="absolute inset-0 h-full w-full object-cover opacity-55"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/45 to-background" />

      <div className="relative mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-8 text-center">
        <NuruGlyph className="h-24 w-24" />

        <h1 className="mt-6 font-display text-[38px] leading-none font-bold tracking-[0.18em]">
          NURU
        </h1>
        <p className="mt-2 font-display text-[15px] tracking-[0.42em] text-cyan">FAITH</p>

        <div className="absolute inset-x-0 bottom-14 px-8">
          <p className="font-display text-[15px] font-semibold tracking-[0.2em]">A BRIGHTER YOU.</p>
          <p className="mt-2 text-[12px] text-muted-foreground">
            Faith. Community. Purpose. Always with you.
          </p>
        </div>
      </div>
    </div>
  );
}
