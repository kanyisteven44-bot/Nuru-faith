import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookHeart,
  BookOpen,
  Clapperboard,
  Music2,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { resolveMedia } from "@/lib/media";
import { fetchVerseOfTheDay, verseOfTheDayRef } from "@/lib/bible";
import { fetchDevotionals, fetchEvents, fetchProfile } from "@/services/content";
import { fetchCuratedSeries } from "@/services/series";
import { AppShell, Avatar } from "@/components/nuru/AppShell";
import { CardSkeleton } from "@/components/nuru/Primitives";
import { useRotatingPhoto } from "@/lib/photoRotation";

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
  { to: "/bible", label: "Bible", icon: BookOpen },
  { to: "/devotionals", label: "Devotionals", icon: BookHeart },
  { to: "/music", label: "Music", icon: Music2 },
  { to: "/community", label: "Community", icon: Clapperboard },
] as const;

const CURATED_SLUGS = [
  "finding-your-purpose",
  "when-youre-anxious",
  "foundations-of-following-jesus",
];

const CHALLENGES = [
  "Spend 10 minutes in prayer today and write one thing you're thankful for.",
  "Send an encouraging message to someone who needs it today.",
  "Read one chapter slowly and note a single verse to carry with you.",
  "Thank God for three specific things before you sleep tonight.",
];

function greetingFor(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function HomeScreen() {
  const verseBg = useRotatingPhoto("home-todays-light");
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [acceptedChallenge, setAcceptedChallenge] = useState(false);

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
  const verse = useQuery({ queryKey: ["verse-of-day"], queryFn: fetchVerseOfTheDay });
  const devotionals = useQuery({ queryKey: ["devotionals"], queryFn: fetchDevotionals });
  const events = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const series = useQuery({
    queryKey: ["series-curated", CURATED_SLUGS],
    queryFn: () => fetchCuratedSeries(CURATED_SLUGS),
  });

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

  /** Mixed rail of the things worth coming back to, newest teaching first. */
  const growing = [
    ...(series.data ?? []).slice(0, 3).map((s) => ({
      key: `series-${s.id}`,
      title: s.title,
      kind: "Series",
      cover: s.cover_image,
      to: "/series/$slug" as const,
      params: { slug: s.slug },
    })),
    ...(devotionals.data ?? []).slice(0, 3).map((d) => ({
      key: `devotional-${d.id}`,
      title: d.title,
      kind: "Devotional",
      cover: d.cover_url,
      to: "/devotionals" as const,
      params: undefined,
    })),
  ];

  return (
    <AppShell>
      {/* Greeting bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-transparent bg-background/88 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-2xl supports-[backdrop-filter]:border-border/25">
        <Link to="/profile" aria-label="Your profile">
          <Avatar
            url={profile.data?.avatar_url ?? null}
            name={profile.data?.full_name ?? ""}
            seed={userId}
            size="md"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] text-secondary-foreground">{greetingFor(today)},</p>
          <p className="truncate font-display text-[21px] leading-tight font-bold tracking-tight">
            {firstName}
          </p>
        </div>
        <Link
          to="/explore"
          search={{ q: "", kind: "all" }}
          aria-label="Search"
          className="shrink-0 p-1 text-secondary-foreground transition-colors hover:text-foreground"
        >
          <Search className="h-5 w-5" />
        </Link>
      </header>

      <div className="nuru-page space-y-7 pt-1">
        {/* Search */}
        <Link
          to="/explore"
          search={{ q: "", kind: "all" }}
          className="flex min-h-11 items-center gap-2.5 rounded-full border border-border bg-surface-2 px-4 text-[13px] text-muted-foreground"
        >
          <Search className="h-4 w-4 shrink-0" />
          Search devotionals, series, music…
        </Link>

        {/* Today's Light */}
        <section className="relative overflow-hidden rounded-2xl border border-border">
          <img
            src={devotional?.cover_url ? resolveMedia(devotional.cover_url) : verseBg}
            alt=""
            className="absolute inset-y-0 right-0 h-full w-3/5 object-cover"
          />
          {/* Copy sits on the left, so the wash has to stay opaque there and
              fade out before it covers the artwork. */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b2a5c] via-[#0b2a5c]/85 to-transparent" />
          <div className="relative min-h-44 p-4">
            <p className="font-display text-[16px] font-bold">Today's Light</p>

            {verse.isLoading ? (
              <div className="mt-2 h-12 w-3/4 animate-pulse rounded-lg bg-white/10" />
            ) : (
              <blockquote className="mt-1.5 max-w-[62%]">
                <p className="font-display text-[15px] leading-snug font-semibold text-white">
                  “{verse.data?.text ?? "Be still, and know that I am God."}”
                </p>
                <cite className="mt-1 block text-[11px] text-white/70 not-italic">
                  {verse.data?.reference ?? verseOfTheDayRef()}
                </cite>
              </blockquote>
            )}

            <Link
              to="/devotionals"
              className="mt-4 inline-flex min-h-9 w-fit items-center gap-2 rounded-full border border-cyan/70 bg-primary/25 px-4 text-[12px] font-semibold text-white nuru-glow-sm"
            >
              Read Now <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        {/* Quick Access */}
        <section aria-label="Quick access" className="grid grid-cols-4 gap-x-2 gap-y-3">
          {QUICK_ACCESS.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="flex flex-col items-center gap-1.5 text-center">
              <span className="flex h-12 w-full items-center justify-center rounded-xl border border-border bg-surface-2/80 transition-colors hover:border-border-strong hover:bg-surface-2">
                <Icon className="h-5.5 w-5.5 text-cyan" strokeWidth={1.7} />
              </span>
              <span className="text-[11px] text-secondary-foreground">{label}</span>
            </Link>
          ))}
        </section>

        {/* Continue Growing */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-[15px] font-semibold">Continue Growing</h2>
            <Link to="/series" className="text-[12px] font-semibold text-cyan">
              See All
            </Link>
          </div>
          {series.isLoading && devotionals.isLoading ? (
            <CardSkeleton count={1} height="h-36" />
          ) : (
            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
              {growing.map((item) => (
                <Link
                  key={item.key}
                  to={item.to}
                  {...(item.params ? { params: item.params } : {})}
                  className="w-32 shrink-0 snap-start"
                >
                  <span className="block overflow-hidden rounded-2xl border border-border">
                    <img
                      src={resolveMedia(item.cover)}
                      alt=""
                      className="h-36 w-full object-cover"
                    />
                  </span>
                  <span className="mt-2 block truncate text-[12px] font-semibold">
                    {item.title}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">{item.kind}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Today's Challenge */}
        <section className="nuru-card p-4">
          <h2 className="flex items-center gap-1.5 font-display text-[15px] font-semibold">
            <Sparkles className="h-4 w-4 text-cyan" /> Today's Challenge
          </h2>
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
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-[15px] font-semibold">Upcoming Event</h2>
            <Link to="/events" className="text-[12px] font-semibold text-cyan">
              See All
            </Link>
          </div>
          {events.isLoading ? (
            <CardSkeleton count={1} height="h-20" />
          ) : nextEvent ? (
            <div className="nuru-card flex items-center gap-3 p-3">
              <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-primary/35 bg-primary/12">
                <span className="text-[10px] font-semibold tracking-wide text-cyan uppercase">
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
    </AppShell>
  );
}
