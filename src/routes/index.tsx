import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { NuruLogo } from "@/components/nuru/Logo";
import { BRAND_IDEA } from "@/constants/nuru";
import hero from "@/assets/mountain-dawn.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nuru Faith — Light for This Generation" },
      {
        name: "description",
        content:
          "A digital home for young people to know God, grow in faith, find real community, and live out their purpose.",
      },
      { property: "og:title", content: "Nuru Faith — Light for This Generation" },
      {
        property: "og:description",
        content: "Know God, grow in faith, find real community, and live out your purpose.",
      },
    ],
  }),
  component: Splash,
});

function Splash() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home", replace: true });
      else setChecking(false);
    });
  }, [navigate]);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <img
        src={hero}
        alt=""
        width={1024}
        height={640}
        className="absolute inset-0 h-full w-full object-cover opacity-45"
      />
      <div className="absolute inset-0 nuru-veil" />

      <div className="relative mx-auto flex min-h-dvh max-w-xl flex-col justify-between px-6 py-12">
        <NuruLogo />

        <div>
          <p className="script text-3xl text-cyan">{BRAND_IDEA}</p>
          <h1 className="mt-3 font-display text-4xl leading-tight font-bold">
            Know God. Grow in faith.
            <br />
            <span className="nuru-gradient-text">Live your purpose.</span>
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-secondary-foreground">
            A digital home for young people — Scripture, devotionals, real community, mentorship,
            worship music and events from churches near you.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="flex min-h-12 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground nuru-glow"
          >
            Create your account
          </Link>
          <Link
            to="/auth"
            search={{ mode: "login" }}
            className="flex min-h-12 w-full items-center justify-center rounded-full border border-border bg-surface/70 text-sm font-medium text-secondary-foreground backdrop-blur"
          >
            {checking ? "Checking your session…" : "I already have an account"}
          </Link>
          <p className="pt-2 text-center text-[11px] text-muted-foreground">
            Inspired by Christ. Built for this generation.
          </p>
        </div>
      </div>
    </div>
  );
}
