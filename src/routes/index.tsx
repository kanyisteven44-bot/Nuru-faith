import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { NuruLogo } from "@/components/nuru/Logo";
import { BRAND_IDEA } from "@/constants/nuru";
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
  UsersRound,
} from "lucide-react";

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
        className="absolute inset-0 h-full w-full object-cover opacity-20"
      />
      <div className="absolute inset-0 bg-background/80" />

      <div className="relative mx-auto min-h-dvh max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="nuru-card flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
          <NuruLogo />
          <p className="hidden font-display text-sm font-semibold uppercase tracking-[0.16em] text-primary md:block">
            Grow · Connect · Lead · Impact
          </p>
          <Link
            to="/auth"
            search={{ mode: "login" }}
            className="rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground nuru-glow-sm"
          >
            {checking ? "Checking…" : "Log in"}
          </Link>
        </header>

        <main className="mt-4 grid gap-4 lg:grid-cols-[0.82fr_1.2fr_1fr]">
          <section className="flex flex-col justify-between gap-5">
            <div className="nuru-card p-5 sm:p-6">
              <p className="script text-3xl text-cyan">{BRAND_IDEA}</p>
              <h1 className="mt-3 font-display text-4xl font-bold leading-[1.05] sm:text-5xl">
                A brighter generation <span className="nuru-gradient-text">for Christ.</span>
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-secondary-foreground">
                A digital faith community for young people to learn, connect, grow and make an
                impact in their churches, communities and beyond.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className="flex min-h-11 items-center justify-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground nuru-glow-sm"
                >
                  Join Nuru Faith
                </Link>
                <Link
                  to="/auth"
                  search={{ mode: "login" }}
                  className="flex min-h-11 items-center justify-center rounded-lg border border-border-strong bg-surface-2 px-3 text-sm font-semibold text-cyan"
                >
                  Sign in
                </Link>
              </div>
            </div>

            <div className="nuru-card p-4">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-cyan">
                Core features
              </h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {(
                  [
                    [BookOpen, "Grow in Faith", "Bible, devotionals and teachings"],
                    [UsersRound, "Connect & Belong", "Churches, groups and community"],
                    [GraduationCap, "Learn & Be Equipped", "Courses and mentorship"],
                    [Heart, "Serve & Make an Impact", "Volunteer and support others"],
                  ] as const
                ).map(([Icon, title, body]) => (
                  <div
                    key={String(title)}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface-2/55 p-3"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-cyan">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <strong className="block text-sm">{title}</strong>
                      <span className="text-xs text-muted-foreground">{body}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border-[6px] border-slate-950 bg-background p-3 shadow-2xl ring-1 ring-border-strong sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-xl font-semibold">Shalom 👋</p>
                <p className="text-xs text-secondary-foreground">
                  You are loved. You are called. You are sent.
                </p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border-strong bg-surface-2">
                <Sparkles className="h-5 w-5 text-cyan" />
              </span>
            </div>
            <article className="nuru-card-hero relative mt-4 overflow-hidden p-5">
              <BookOpen className="h-5 w-5 text-cyan" />
              <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-cyan">
                Verse of the day
              </p>
              <p className="mt-2 font-display text-xl font-semibold leading-snug">
                “I can do all things through Christ who strengthens me.”
              </p>
              <p className="mt-2 text-xs text-cyan">Philippians 4:13</p>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground"
              >
                Read & reflect <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
            <h2 className="mb-3 mt-5 font-display text-sm font-semibold">Quick access</h2>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  [BookOpen, "Bible"],
                  [Sparkles, "Nuru AI"],
                  [Church, "Church"],
                  [UsersRound, "Groups"],
                  [GraduationCap, "Courses"],
                  [CalendarDays, "Events"],
                  [Music2, "Music"],
                  [ShieldCheck, "Safe"],
                ] as const
              ).map(([Icon, label], index) => (
                <div
                  key={String(label)}
                  className="rounded-lg border border-border bg-surface-2/60 p-2 text-center"
                >
                  <span
                    className={`mx-auto flex h-10 w-10 items-center justify-center rounded-lg ${index % 3 === 0 ? "bg-primary/25 text-cyan" : index % 3 === 1 ? "bg-violet/20 text-violet" : "bg-growth/20 text-growth"}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="mt-1.5 text-[10px] font-semibold">{label}</p>
                </div>
              ))}
            </div>
            <div className="nuru-card mt-4 flex items-center gap-3 p-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-warning/15 text-warning">
                <CalendarDays className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-sm">Nuru Youth Conference</strong>
                <span className="text-xs text-muted-foreground">
                  Grow in faith and meet your community
                </span>
              </span>
              <ArrowRight className="h-4 w-4 text-cyan" />
            </div>
          </section>

          <section className="grid content-start gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {(
              [
                [BookOpen, "Bible & devotionals", "Daily Scripture and Christ-centred reflections"],
                [GraduationCap, "Courses", "Grow through practical lessons"],
                [UsersRound, "Groups", "Find your church and your people"],
                [Heart, "Mentors", "Guidance for faith, life and purpose"],
                [CalendarDays, "Events", "Conferences, worship and fellowship"],
                [Music2, "Music & media", "Worship, sermons and podcasts"],
              ] as const
            ).map(([Icon, title, body], index) => (
              <article key={String(title)} className="nuru-card p-4">
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${index % 2 ? "bg-violet/20 text-violet" : "bg-primary/20 text-cyan"}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <h2 className="mt-3 font-display text-sm font-semibold uppercase tracking-wide text-cyan">
                  {title}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
              </article>
            ))}
          </section>
        </main>

        <footer className="mt-4 flex flex-col items-center justify-between gap-2 border-t border-border py-4 text-xs text-muted-foreground sm:flex-row">
          <span>Safe · Positive · Purposeful</span>
          <span>“Let no one look down on you because you are young.” — 1 Timothy 4:12</span>
        </footer>
      </div>
    </div>
  );
}
