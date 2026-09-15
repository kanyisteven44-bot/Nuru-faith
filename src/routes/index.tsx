import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { NuruMark } from "@/components/nuru/Logo";
import hero from "@/assets/mountain-dawn.jpg";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Church,
  GraduationCap,
  Heart,
  Music2,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  UsersRound,
} from "lucide-react";

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

function PreviewPhone({ title, className }: { title: "Community" | "Events"; className: string }) {
  const community = title === "Community";
  return (
    <aside
      className={`${className} z-0 rounded-[1.8rem] border-[5px] border-slate-950 bg-background p-3 shadow-2xl ring-1 ring-border-strong`}
      aria-label={`${title} preview`}
    >
      <div className="mx-auto mb-3 h-2 w-16 rounded-full bg-slate-950" />
      <div className="flex items-center justify-between">
        <strong className="font-display text-sm">{title}</strong>
        <span className="text-cyan">⌕</span>
      </div>
      <div className="mt-3 flex gap-3 border-b border-border pb-2 text-[9px] text-muted-foreground">
        <span className="text-cyan">{community ? "Feed" : "All"}</span>
        <span>{community ? "Groups" : "Upcoming"}</span>
        <span>{community ? "Friends" : "Nearby"}</span>
      </div>
      <div className="mt-3 space-y-3">
        {community ? (
          <>
            <div className="nuru-card p-3">
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-full bg-primary/30" />
                <span className="text-[10px] font-semibold">Grace Wanjiru</span>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-secondary-foreground">
                Grateful for God's faithfulness in my life. He never fails.
              </p>
              <img src={hero} alt="" className="mt-2 h-28 w-full rounded-lg object-cover" />
              <div className="mt-2 text-[9px] text-muted-foreground">♥ 128　♡ 24</div>
            </div>
            <div className="nuru-card p-3 text-[10px] leading-relaxed">
              Nothing is impossible with God. Keep pushing! 🚀
            </div>
          </>
        ) : (
          <>
            <div className="nuru-card overflow-hidden">
              <img src={hero} alt="" className="h-24 w-full object-cover" />
              <div className="p-3">
                <p className="text-[11px] font-bold uppercase">Nuru Youth Conference</p>
                <p className="mt-1 text-[9px] text-muted-foreground">20–22 June · Nairobi</p>
                <button className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-[9px] font-semibold">
                  Register
                </button>
              </div>
            </div>
            <div className="nuru-card p-3">
              <p className="text-[11px] font-semibold">Worship & Prayer Night</p>
              <p className="mt-1 text-[9px] text-muted-foreground">Friday · 8:00 PM · Online</p>
              <button className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-[9px] font-semibold">
                Join
              </button>
            </div>
          </>
        )}
      </div>
      <div className="mt-4 grid grid-cols-4 border-t border-border pt-2 text-center text-[8px] text-muted-foreground">
        <span>Home</span>
        <span>Explore</span>
        <span>Create</span>
        <span>Profile</span>
      </div>
    </aside>
  );
}
