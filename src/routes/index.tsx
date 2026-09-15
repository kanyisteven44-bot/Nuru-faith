import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { NuruMark } from "@/components/nuru/Logo";
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
        <NuruMark className="h-24 w-24" />

        <h1 className="mt-6 font-display text-[40px] leading-none font-bold tracking-tight">
          Nuru <span className="text-cyan">Faith</span>
        </h1>
        <p className="mt-3 text-[13px] tracking-wide text-secondary-foreground">
          Connect • Grow • Live Your Faith
        </p>

        <p className="script mt-10 text-3xl leading-snug text-cyan/95">
          Faith Today
          <br />A Brighter Tomorrow
        </p>

        <p className="absolute inset-x-0 bottom-10 text-xs text-muted-foreground">
          A generation for more.
        </p>
      </div>
    </div>
  );
}
