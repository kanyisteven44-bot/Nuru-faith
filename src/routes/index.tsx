import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

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
  return <div className="min-h-dvh bg-[#07111f]" aria-label="Opening Nuru Faith" />;
}
