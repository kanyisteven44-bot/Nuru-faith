import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  Check,
  Church,
  Clapperboard,
  GraduationCap,
  HandHeart,
  Music2,
  Share2,
  Sparkles,
  Sunrise,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { resolveMedia } from "@/lib/media";
import { useAuth } from "@/hooks/useAuth";
import { useShareSheet } from "@/hooks/useShareSheet";
import { fetchVerseOfTheDay, verseOfTheDayRef } from "@/lib/bible";
import { fetchDevotionals, fetchEvents, fetchProfile } from "@/services/content";
import { AppShell, BrandBar } from "@/components/nuru/AppShell";
import { CardSkeleton } from "@/components/nuru/Primitives";
import { NURU_PHOTO_POOLS, useRotatingMedia } from "@/lib/rotatingMedia";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Today — Nuru Faith" },
      {
        name: "description",
        content: "Your daily verse, devotional, church events and community in one place.",
      },
      { property: "og:title", content: "Today — Nuru Faith" },
      { property: "og:description", content: "Your daily verse, devotional and community." },
    ],
  }),
  component: HomeScreen,
});

const QUICK_ACCESS = [
  {
    to: "/reels",
    label: "Reels",
    icon: Clapperboard,
    tint: "bg-gradient-to-br from-fuchsia-400 to-pink-600",
  },
  {
    to: "/ai",
    label: "Nuru AI",
    icon: Sparkles,
    tint: "bg-gradient-to-br from-cyan-300 to-blue-600",
  },
  {
    to: "/church",
    label: "My Church",
    icon: Church,
    tint: "bg-gradient-to-br from-indigo-400 to-violet-600",
  },
  {
    to: "/bible",
    label: "Bible",
    icon: BookOpen,
    tint: "bg-gradient-to-br from-blue-500 to-indigo-600",
  },
  {
    to: "/music",
    label: "Music",
    icon: Music2,
    tint: "bg-gradient-to-br from-amber-300 to-yellow-600",
  },
  {
    to: "/grow",
    label: "Devotions + Series",
    icon: Sunrise,
    tint: "bg-gradient-to-br from-emerald-400 to-green-600",
  },
  {
    to: "/faith-courses",
    label: "Faith Courses",
    icon: GraduationCap,
    tint: "bg-gradient-to-br from-orange-400 to-amber-600",
  },
  {
    to: "/mentors",
    label: "Mentors",
    icon: HandHeart,
    tint: "bg-gradient-to-br from-rose-400 to-red-600",
  },
] as const;

const CHALLENGES = [
  "Spend 10 minutes in prayer today and write one thing you're thankful for.",
  "Send an encouraging message to someone who needs it today.",
  "Read one chapter slowly and note a single verse to carry with you.",
  "Thank God for three specific things before you sleep tonight.",
];

function HomeScreen() {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const shareSheet = useShareSheet();
  const [acceptedChallenge, setAcceptedChallenge] = useState(false);
  const todayPhoto = useRotatingMedia(NURU_PHOTO_POOLS.home, "home-todays-light");

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
  const verse = useQuery({ queryKey: ["verse-of-day"], queryFn: fetchVerseOfTheDay });
  const devotionals = useQuery({ queryKey: ["devotionals"], queryFn: fetchDevotionals });
  const events = useQuery({ queryKey: ["events"], queryFn: fetchEvents });

  useEffect(() => {
    if (profile.data && profile.data.onboarded === false)
      void navigate({ to: "/onboarding", replace: true });
  }, [profile.data, navigate]);

  const firstName = profile.data?.full_name?.split(" ")[0] ?? "friend";
  const today = new Date();
  const challenge = CHALLENGES[Math.floor(Date.now() / 86400000) % CHALLENGES.length]!;
  const devotional = devotionals.data?.[0] ?? null;
  const nextEvent =
    (events.data ?? [])
      .filter((e) => new Date(e.starts_at).getTime() >= Date.now() - 3600_000)
      .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))[0] ?? null;

  return (
    <AppShell wide="xl">
      <BrandBar />

      <div className="space-y-6 px-4 pt-2 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6 lg:space-y-0 lg:px-4 xl:gap-7">
        {/* Greeting */}
        <section className="lg:col-span-12 lg:flex lg:items-end lg:justify-between lg:gap-4">
          <div>
            <p className="mb-2 hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan lg:block">
              Your daily space
            </p>
            <h1 className="font-display text-[26px] font-bold tracking-tight lg:text-4xl">
              Shalom, {firstName}! <span className="align-middle">👋</span>
            </h1>
            <p className="mt-2 hidden text-sm text-muted-foreground lg:block">
              Take a moment. What does your heart need today?
            </p>
          </div>
          <p className="hidden shrink-0 pb-1 text-xs text-muted-foreground xl:block">
            {today.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </section>

        {/* Today's Light */}
        <section className="min-w-0 lg:col-span-7 lg:row-span-3 lg:self-stretch">
          <div className="nuru-card relative overflow-hidden lg:flex lg:h-full lg:flex-col">
            <div className="relative h-56 w-full lg:h-auto lg:min-h-[400px] lg:flex-1">
              <img src={todayPhoto} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/25" />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3.5 lg:p-6">
                <span className="font-display text-base font-semibold drop-shadow">
                  Today's Light
                </span>
                <span className="rounded-full bg-background/65 px-2.5 py-1 text-[11px] font-medium backdrop-blur">
                  {today.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 px-3.5 pb-3 lg:px-7 lg:pb-7">
                {verse.isLoading ? (
                  <div className="h-10 animate-pulse rounded-lg bg-white/10" />
                ) : (
                  <blockquote>
                    <p className="line-clamp-3 text-[15px] leading-relaxed font-medium text-white italic drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] lg:line-clamp-none lg:font-display lg:text-2xl lg:leading-relaxed lg:not-italic">
                      “
                      {verse.data?.text ?? "I can do all things through Christ who strengthens me."}
                      ”
                    </p>
                    <cite className="mt-1 block text-[11px] font-semibold text-cyan not-italic drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
                      {verse.data?.reference ?? verseOfTheDayRef()}
                      {verse.data?.translation ? ` (${verse.data.translation})` : ""}
                    </cite>
                  </blockquote>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 p-3 lg:gap-3 lg:border-t lg:border-border lg:p-4">
              <Link
                to="/devotionals"
                className="nuru-tactile flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-primary text-xs font-semibold text-primary-foreground"
              >
                <BookOpen className="h-3.5 w-3.5" /> Read
              </Link>
              <Link
                to="/ai"
                search={{
                  contextType: "devotional",
                  contextLabel: devotional?.title ?? "Today's Light",
                }}
                className="nuru-tactile flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-2 text-xs font-semibold text-secondary-foreground"
              >
                <Sparkles className="h-3.5 w-3.5" /> Reflect
              </Link>
              <button
                type="button"
                onClick={() => {
                  const text = devotional?.title ?? "Today's Light on Nuru Faith";
                  void shareSheet.share({
                    title: text,
                    text,
                    url: `${window.location.origin}/devotionals`,
                  });
                }}
                className="nuru-tactile flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-2 text-xs font-semibold text-secondary-foreground"
              >
                <Share2 className="h-3.5 w-3.5" /> Share
              </button>
            </div>
          </div>
        </section>

        {/* Quick Access */}
        <section className="lg:col-span-5 lg:rounded-2xl lg:border lg:border-border lg:bg-surface/55 lg:p-5">
          <h2 className="mb-3 font-display text-[15px] font-semibold lg:mb-5 lg:text-lg">
            Quick Access
          </h2>
          <div className="grid grid-cols-4 gap-x-2 gap-y-4 lg:gap-x-2 lg:gap-y-5">
            {QUICK_ACCESS.map(({ to, label, icon: Icon, tint }) => (
              <Link
                key={to}
                to={to}
                {...(to === "/ai" ? { search: {} } : {})}
                className="group flex flex-col items-center gap-2 text-center"
              >
                <span
                  className={cn(
                    "nuru-tactile nuru-quick-tile flex h-14 w-14 items-center justify-center rounded-2xl text-white lg:h-12 lg:w-12 xl:h-14 xl:w-14",
                    tint,
                  )}
                >
                  <Icon className="h-6 w-6" strokeWidth={2} />
                </span>
                <span className="text-[11px] font-medium text-secondary-foreground">{label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Today's Challenge — an amber badge beside the prompt, with the
            accept control sitting to the trailing edge, per the reference. */}
        <section className="nuru-card flex gap-3 p-4 lg:col-span-5">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning text-[#3a2206]"
          >
            <Target className="h-5 w-5" strokeWidth={2.2} />
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[14px] font-semibold text-primary">
              Today&apos;s Challenge
            </h2>
            <p className="mt-0.5 text-[13px] leading-snug text-secondary-foreground">{challenge}</p>

            <div className="mt-2.5 flex justify-end">
              <button
                type="button"
                disabled={acceptedChallenge}
                onClick={() => {
                  setAcceptedChallenge(true);
                  toast.success("You're in — one step at a time.");
                }}
                className={cn(
                  "nuru-tactile group inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[13px] font-semibold transition-all",
                  "active:scale-[0.97] disabled:active:scale-100",
                  acceptedChallenge
                    ? // Done reads as its own state, not a greyed-out button.
                      "border border-growth/50 bg-growth/12 text-growth"
                    : "bg-[linear-gradient(100deg,var(--primary),var(--brand-violet))] text-primary-foreground shadow-[0_6px_20px_-6px_var(--brand-violet)] hover:brightness-110",
                )}
              >
                {acceptedChallenge ? (
                  <>
                    <Check className="h-4 w-4" strokeWidth={2.6} />
                    Accepted
                  </>
                ) : (
                  <>
                    Accept Challenge
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      strokeWidth={2.4}
                    />
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Upcoming Event */}
        <section className="min-w-0 lg:col-span-5">
          <h2 className="mb-3 font-display text-[15px] font-semibold lg:text-lg">Upcoming Event</h2>
          {events.isLoading ? (
            <CardSkeleton count={1} height="h-20" />
          ) : nextEvent ? (
            <div className="nuru-card flex items-center gap-3 p-3">
              <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-primary/35 bg-primary/12">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-cyan">
                  {new Date(nextEvent.starts_at).toLocaleDateString(undefined, { month: "short" })}
                </span>
                <span className="font-display text-lg leading-none font-bold">
                  {new Date(nextEvent.starts_at).getDate()}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{nextEvent.title}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {nextEvent.host ?? nextEvent.location ?? "Nuru Faith"}
                </span>
              </span>
              <Link
                to="/events"
                className="nuru-tactile shrink-0 rounded-xl bg-primary px-3.5 py-2 text-[11px] font-semibold text-primary-foreground"
              >
                RSVP
              </Link>
            </div>
          ) : (
            <p className="nuru-card p-4 text-[13px] text-muted-foreground">
              No upcoming events yet — your church can add them here.
            </p>
          )}
        </section>
        <section className="hidden lg:col-span-12 lg:block">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">A little more for your day</h2>
            <Link to="/grow" className="text-xs font-semibold text-cyan hover:underline">
              Explore learning
            </Link>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <Link
              to="/devotionals"
              className="nuru-card group flex min-h-44 min-w-0 items-center gap-5 p-5 transition-colors hover:border-border-strong"
            >
              {devotional?.cover_url ? (
                <img
                  src={resolveMedia(devotional.cover_url)}
                  alt=""
                  loading="lazy"
                  className="h-32 w-28 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-cyan">
                  <BookOpen className="h-8 w-8" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-cyan">
                  Daily devotional
                </p>
                <h3 className="font-display text-xl font-semibold">
                  {devotionals.isLoading
                    ? "Loading today’s reading…"
                    : (devotional?.title ?? "Make time for Scripture")}
                </h3>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {devotional?.subtitle ?? "Explore devotionals and take a moment to reflect."}
                </p>
                <span className="mt-3 flex items-center gap-2 text-xs font-semibold text-cyan">
                  {devotional
                    ? `${devotional.read_minutes} min read · Browse devotionals`
                    : "Browse devotionals"}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
            <Link
              to="/mentors"
              className="nuru-card flex min-h-44 min-w-0 items-center gap-5 p-5 transition-colors hover:border-border-strong"
            >
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-violet/30 bg-violet/10 text-violet">
                <HandHeart className="h-8 w-8" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-violet">
                  Someone to walk with
                </p>
                <h3 className="font-display text-xl font-semibold">
                  You don’t have to grow alone.
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Explore mentors for faith, relationships, leadership and everyday life.
                </p>
                <span className="mt-3 flex items-center gap-2 text-xs font-semibold text-cyan">
                  Explore mentorship
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          </div>
        </section>
      </div>
      {shareSheet.node}
    </AppShell>
  );
}
