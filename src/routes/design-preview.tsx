import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  Compass,
  Headphones,
  HeartHandshake,
  Home,
  Play,
  Share2,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { NuruMark } from "@/components/nuru/Logo";
import { pexelsImage } from "@/lib/media";

export const Route = createFileRoute("/design-preview")({
  head: () => ({
    meta: [
      { title: "Nuru Faith V2 — Design Preview" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DesignPreview,
});

const destinations = [
  { label: "Bible", icon: BookOpen, detail: "Read & reflect" },
  { label: "Reels", icon: Video, detail: "Stories of faith" },
  { label: "Music", icon: Headphones, detail: "Listen & worship" },
  { label: "Mentors", icon: HeartHandshake, detail: "Find guidance" },
  { label: "Events", icon: CalendarDays, detail: "Gather together" },
  { label: "Explore", icon: Compass, detail: "Discover more" },
] as const;

const navigation = [
  { label: "Today", icon: Home },
  { label: "Community", icon: Users },
  { label: "Reels", icon: Play },
  { label: "Bible", icon: BookOpen },
  { label: "Events", icon: CalendarDays },
] as const;

function DesignPreview() {
  const [selected, setSelected] = useState("Today");
  const [challengeDone, setChallengeDone] = useState(false);
  return (
    <div className="min-h-dvh bg-background text-foreground lg:flex">
      <aside className="hidden border-r border-border bg-surface/75 px-5 py-8 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-56 lg:shrink-0 lg:flex-col">
        <div className="mb-12 flex items-center gap-3 px-2">
          <NuruMark className="h-11 w-11" />
          <span className="font-display text-lg font-semibold">
            Nuru <span className="text-primary">Faith</span>
          </span>
        </div>
        <span className="mb-3 px-3 text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
          Your space
        </span>
        <nav aria-label="Design preview navigation" className="space-y-2">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => setSelected(label)}
              className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold transition-colors ${selected === label ? "bg-primary/15 text-primary" : "text-secondary-foreground hover:bg-surface-2 hover:text-foreground"}`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl border border-primary/25 bg-primary/10 p-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <p className="mt-3 font-display text-lg">Faith grows together.</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            A welcoming home for questions, connection, and purpose.
          </p>
        </div>
      </aside>

      <div className="min-w-0 flex-1 pb-24 lg:pb-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/90 px-5 py-4 backdrop-blur-xl lg:px-10">
          <div className="flex items-center gap-2 lg:hidden">
            <NuruMark className="h-9 w-9" />
            <span className="font-display text-lg font-semibold">
              Nuru <span className="text-primary">Faith</span>
            </span>
          </div>
          <span className="hidden text-xs font-bold tracking-[0.2em] text-primary uppercase lg:block">
            A brighter tomorrow
          </span>
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-muted-foreground sm:block">
              Design preview · V2
            </span>
            <Bell className="h-5 w-5 text-foreground" />
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/40 bg-primary/15 text-sm font-bold text-primary">
              S
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-[1580px] px-4 py-7 sm:px-7 lg:px-10 lg:py-10 2xl:px-16">
          <div className="mb-7 lg:mb-9">
            <p className="mb-2 text-[11px] font-bold tracking-[0.22em] text-primary uppercase">
              Your daily space · September 29
            </p>
            <h1 className="max-w-4xl font-display text-[34px] leading-tight font-semibold tracking-tight sm:text-5xl lg:text-[56px]">
              A little light for your day, <span className="text-primary">Stephen.</span>
            </h1>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Pause, find your footing, and grow in faith today.
            </p>
          </div>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
            <section className="overflow-hidden rounded-[1.4rem] border border-border bg-card shadow-xl shadow-black/15">
              <div className="relative min-h-[425px] sm:min-h-[510px] lg:min-h-[550px]">
                <img
                  src={pexelsImage(9407893, 1600)}
                  alt="Sunlight over mountain peaks"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121917] via-[#121917]/45 to-black/15" />
                <div className="relative flex min-h-[425px] flex-col justify-between p-5 sm:min-h-[510px] sm:p-8 lg:min-h-[550px] lg:p-10">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full border border-white/35 bg-black/35 px-4 py-2 text-[10px] font-bold tracking-[0.17em] text-white uppercase backdrop-blur">
                      Today’s light · Scripture
                    </span>
                    <span className="rounded-full bg-black/35 px-3 py-2 text-xs text-white backdrop-blur">
                      29 Sep
                    </span>
                  </div>
                  <div className="max-w-2xl">
                    <p className="mb-4 text-[11px] font-bold tracking-[0.2em] text-primary uppercase">
                      A moment to breathe
                    </p>
                    <blockquote className="font-display text-[30px] leading-[1.18] text-white drop-shadow-lg sm:text-[41px] lg:text-[48px]">
                      “Be still, and know that I am God.”
                    </blockquote>
                    <p className="mt-5 text-sm font-bold tracking-[0.1em] text-primary uppercase">
                      Psalm 46:10
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 p-3 sm:p-4">
                <button
                  type="button"
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
                >
                  <BookOpen className="h-4 w-4" />
                  Read chapter
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-4 text-sm font-semibold text-foreground"
                >
                  <Sparkles className="h-4 w-4" />
                  Reflect
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-4 text-sm font-semibold text-foreground"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only">Share</span>
                </button>
              </div>
            </section>

            <div className="space-y-6">
              <section className="rounded-[1.4rem] border border-border bg-card p-5 sm:p-7">
                <p className="text-[11px] font-bold tracking-[0.19em] text-primary uppercase">
                  Explore Nuru
                </p>
                <h2 className="mt-1 font-display text-[27px] font-semibold">Where will you go?</h2>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {destinations.map(({ label, detail, icon: Icon }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setSelected(label)}
                      className={`group flex min-h-28 flex-col items-start justify-between rounded-2xl border p-4 text-left transition-colors ${selected === label ? "border-primary bg-primary/15" : "border-border bg-surface hover:border-primary/60"}`}
                    >
                      <Icon className="h-6 w-6 text-primary" />
                      <span>
                        <span className="block text-sm font-bold">{label}</span>
                        <span className="block text-[11px] text-muted-foreground">{detail}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <section className="rounded-[1.4rem] border border-border bg-card p-6">
              <p className="text-[11px] font-bold tracking-[0.19em] text-primary uppercase">
                Today’s challenge
              </p>
              <h2 className="mt-3 font-display text-xl font-semibold">Encourage someone today.</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                A message, a prayer, or a kind word can make a difference.
              </p>
              <button
                type="button"
                onClick={() => setChallengeDone((v) => !v)}
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
              >
                {challengeDone ? (
                  <>
                    <Check className="h-4 w-4" />
                    Accepted
                  </>
                ) : (
                  <>
                    Accept challenge <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </section>
            <section className="overflow-hidden rounded-[1.4rem] border border-border bg-card md:col-span-1">
              <div
                className="flex h-32 items-end bg-cover bg-center p-4"
                style={{
                  backgroundImage: `linear-gradient(0deg,rgba(0,0,0,.65),transparent),url(${pexelsImage(12825610, 800)})`,
                }}
              >
                <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground">
                  COMMUNITY
                </span>
              </div>
              <div className="p-5">
                <h2 className="font-display text-xl font-semibold">Faith is better together.</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Meet people who understand your journey.
                </p>
              </div>
            </section>
            <section className="overflow-hidden rounded-[1.4rem] border border-border bg-card md:col-span-2 xl:col-span-1">
              <div
                className="flex h-32 items-end bg-cover bg-center p-4"
                style={{
                  backgroundImage: `linear-gradient(0deg,rgba(0,0,0,.65),transparent),url(${pexelsImage(33494797, 800)})`,
                }}
              >
                <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground">
                  EVENTS
                </span>
              </div>
              <div className="p-5">
                <h2 className="font-display text-xl font-semibold">Find your next gathering.</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Worship, learn, and connect in person.
                </p>
              </div>
            </section>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Concept screen with real photography via{" "}
            <a
              className="underline hover:text-primary"
              href="https://www.pexels.com/"
              target="_blank"
              rel="noreferrer"
            >
              Pexels
            </a>
            . Content and buttons shown here are for design review.
          </p>
        </main>
      </div>
      <nav
        aria-label="Mobile preview navigation"
        className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 gap-1 rounded-2xl border border-border bg-surface/95 p-2 shadow-2xl backdrop-blur lg:hidden"
      >
        {navigation.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            onClick={() => setSelected(label)}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] ${selected === label ? "bg-primary/15 font-bold text-primary" : "text-muted-foreground"}`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
