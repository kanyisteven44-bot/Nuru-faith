import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Church,
  Clapperboard,
  GraduationCap,
  HandHeart,
  Music2,
  Share2,
  Sparkles,
  Sunrise,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useShareSheet } from "@/hooks/useShareSheet";
import { resolveMedia } from "@/lib/media";
import { fetchVerseOfTheDay, verseOfTheDayRef } from "@/lib/bible";
import { fetchDevotionals, fetchEvents, fetchProfile } from "@/services/content";
import { AppShell, BrandBar } from "@/components/nuru/AppShell";
import { CardSkeleton } from "@/components/nuru/Primitives";
import verseBg from "@/assets/bible-candle.jpg";

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
    to: "/devotionals",
    label: "Devotions",
    icon: Sunrise,
    tint: "bg-gradient-to-br from-emerald-400 to-green-600",
  },
  {
    to: "/series",
    label: "Series",
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
    <AppShell>
      <BrandBar />

      <div className="space-y-6 px-4 pt-2">
        {/* Greeting */}
        <section>
          <h1 className="font-display text-[26px] font-bold tracking-tight">
            Shalom, {firstName}! <span className="align-middle">👋</span>
          </h1>
        </section>

        {/* Today's Light */}
        <section>
          <div className="nuru-card relative overflow-hidden">
            <div className="relative h-56 w-full">
              <img
                src={devotional?.cover_url ? resolveMedia(devotional.cover_url) : verseBg}
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/25" />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3.5">
                <span className="font-display text-base font-semibold drop-shadow">
                  Today's Light
                </span>
                <span className="rounded-full bg-background/65 px-2.5 py-1 text-[11px] font-medium backdrop-blur">
                  {today.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 px-3.5 pb-3">
                {verse.isLoading ? (
                  <div className="h-10 animate-pulse rounded-lg bg-white/10" />
                ) : (
                  <blockquote>
                    <p className="line-clamp-3 text-[15px] leading-relaxed font-medium text-white italic drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
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

            <div className="grid grid-cols-3 gap-2 p-3">
              <Link
                to="/devotionals"
                className="flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-primary text-xs font-semibold text-primary-foreground"
              >
                <BookOpen className="h-3.5 w-3.5" /> Read
              </Link>
              <Link
                to="/ai"
                search={{
                  contextType: "devotional",
                  contextLabel: devotional?.title ?? "Today's Light",
                }}
                className="flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-2 text-xs font-semibold text-secondary-foreground"
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
                className="flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-2 text-xs font-semibold text-secondary-foreground"
              >
                <Share2 className="h-3.5 w-3.5" /> Share
              </button>
            </div>
          </div>
        </section>

        {/* Quick Access */}
        <section>
          <h2 className="mb-3 font-display text-[15px] font-semibold">Quick Access</h2>
          <div className="grid grid-cols-4 gap-x-2 gap-y-4">
            {QUICK_ACCESS.map(({ to, label, icon: Icon, tint }) => (
              <Link
                key={to}
                to={to}
                {...(to === "/ai" ? { search: {} } : {})}
                className="flex flex-col items-center gap-2 text-center"
              >
                <span
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg shadow-black/30",
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

        {/* Today's Challenge */}
        <section className="nuru-card p-4">
          <h2 className="font-display text-[15px] font-semibold">Today's Challenge</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-secondary-foreground">
            {challenge}
          </p>
          <button
            type="button"
            disabled={acceptedChallenge}
            onClick={() => {
              setAcceptedChallenge(true);
              toast.success("You're in — one step at a time.");
            }}
            className="mt-3 inline-flex min-h-9 items-center justify-center rounded-lg bg-primary px-5 text-xs font-semibold text-primary-foreground nuru-glow-sm disabled:opacity-60 disabled:shadow-none"
          >
            {acceptedChallenge ? "You're in 🙌" : "I'm In!"}
          </button>
        </section>

        {/* Upcoming Event */}
        <section>
          <h2 className="mb-3 font-display text-[15px] font-semibold">Upcoming Event</h2>
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
                className="shrink-0 rounded-lg bg-primary px-3.5 py-2 text-[11px] font-semibold text-primary-foreground"
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
      </div>
      {shareSheet.node}
    </AppShell>
  );
}
