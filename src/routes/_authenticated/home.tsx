import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Church,
  Clapperboard,
  LayoutGrid,
  Music2,
  Share2,
  Sparkles,
  Target,
  UsersRound,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { eventDate } from "@/lib/format";
import { resolveMedia } from "@/lib/media";
import { fetchVerseOfTheDay, verseOfTheDayRef } from "@/lib/bible";
import { fetchEvents, fetchNotifications, fetchProfile } from "@/services/content";
import { fetchMyProgress, fetchSeries } from "@/services/series";
import { fetchMediaItems } from "@/services/media";
import verseBg from "@/assets/bible-candle.jpg";
import { AppShell } from "@/components/nuru/AppShell";
import { Avatar } from "@/components/nuru/PostCard";
import { CardSkeleton, IconTile, ProgressBar, SectionHeader } from "@/components/nuru/Primitives";
import { NuruLogo } from "@/components/nuru/Logo";

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

const QUICK = [
  { to: "/reels", label: "Reels", icon: Clapperboard, tone: "violet" as const },
  { to: "/ai", label: "Nuru AI", icon: Sparkles, tone: "cyan" as const },
  { to: "/church", label: "My Church", icon: Church, tone: "brand" as const },
  { to: "/hub", label: "Hub", icon: LayoutGrid, tone: "cyan" as const },
  { to: "/community", label: "Groups", icon: UsersRound, tone: "brand" as const },
  { to: "/mentors", label: "Mentors", icon: Sparkles, tone: "violet" as const },
  { to: "/events", label: "Events", icon: CalendarDays, tone: "brand" as const },
  { to: "/music", label: "Music", icon: Music2, tone: "growth" as const },
] as const;

const CHALLENGES = [
  { ref: "John 15", prompt: "Read John 15 and share one thing you learned." },
  { ref: "Psalm 1", prompt: "Read Psalm 1 and text it to a friend who needs it today." },
  { ref: "Matthew 5", prompt: "Read Matthew 5 and pray one line of it back to God." },
  { ref: "Romans 12", prompt: "Read Romans 12 and pick one verse to live out this week." },
  { ref: "Philippians 2", prompt: "Read Philippians 2 and do one quiet act of service today." },
  { ref: "James 1", prompt: "Read James 1 and write down one thing you'll act on, not just hear." },
  { ref: "1 Corinthians 13", prompt: "Read 1 Corinthians 13 and forgive someone in prayer." },
];

function HomeScreen() {
  const { userId } = useAuth();
  const navigate = useNavigate();

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
  const verse = useQuery({
    queryKey: ["verse-of-the-day", verseOfTheDayRef()],
    queryFn: fetchVerseOfTheDay,
    staleTime: 1000 * 60 * 60,
  });
  const events = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const series = useQuery({ queryKey: ["series"], queryFn: () => fetchSeries() });
  const seriesProgress = useQuery({
    queryKey: ["series-progress", userId],
    queryFn: () => fetchMyProgress(userId!),
    enabled: !!userId,
  });
  const notifications = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => fetchNotifications(userId!),
    enabled: !!userId,
  });
  const media = useQuery({
    queryKey: ["home-media"],
    queryFn: () => fetchMediaItems({ limit: 6 }),
  });

  useEffect(() => {
    if (profile.data && profile.data.onboarded === false)
      navigate({ to: "/onboarding", replace: true });
  }, [profile.data, navigate]);

  const unread = (notifications.data ?? []).filter((n) => !n.read).length;
  const name = profile.data?.full_name?.split(" ")[0] ?? "friend";

  const dayIndex = Math.floor(Date.now() / 86400000);
  const challenge = CHALLENGES[dayIndex % CHALLENGES.length]!;

  const progressMap = new Map((seriesProgress.data ?? []).map((p) => [p.series_id, p]));
  const continueSeries =
    (series.data ?? [])
      .map((s) => ({ series: s, progress: progressMap.get(s.id) }))
      .filter((x) => x.progress && (x.progress.progress_percent ?? 0) < 100)
      .sort(
        (a, b) => (b.progress!.progress_percent ?? 0) - (a.progress!.progress_percent ?? 0),
      )[0] ?? (series.data ?? []).map((s) => ({ series: s, progress: undefined }))[0];

  const upcoming = (events.data ?? []).slice(0, 2);

  return (
    <AppShell>
      <header className="flex items-center justify-between px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-2">
        <NuruLogo compact />
        <div className="flex items-center gap-2">
          <Link
            to="/notifications"
            aria-label="Notifications"
            className="relative rounded-full border border-border bg-surface-2/60 p-2.5 text-secondary-foreground transition-colors hover:text-foreground"
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground ring-2 ring-background">
                {unread}
              </span>
            )}
          </Link>
          <Link to="/profile" aria-label="Your profile">
            <Avatar src={profile.data?.avatar_url} name={profile.data?.full_name} />
          </Link>
        </div>
      </header>

      {/* Greeting */}
      <section className="px-4 pt-1">
        <h1 className="font-display text-[26px] font-semibold leading-tight">
          Shalom, {name}! <span className="align-middle">👋</span>
        </h1>
        <p className="mt-1 text-sm text-secondary-foreground">
          You are loved. You are called. You are sent.
        </p>
      </section>

      {/* Today's Light */}
      <section className="px-4 pt-4">
        {verse.isLoading ? (
          <CardSkeleton count={1} height="h-52" />
        ) : (
          <article className="nuru-card-hero relative overflow-hidden p-5">
            <img
              src={verseBg}
              alt=""
              loading="eager"
              className="absolute inset-0 h-full w-full object-cover opacity-35"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background/90" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan">
                  <Sparkles className="h-3.5 w-3.5" /> Today's Light
                </p>
                <span className="text-[11px] text-muted-foreground">
                  {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </div>
              <p className="mt-3 font-display text-[17px] font-semibold leading-snug">
                {verse.data ? `"${verse.data.text}"` : "Scripture is loading…"}
              </p>
              <p className="mt-2 text-xs font-medium text-cyan">
                {verse.data
                  ? `${verse.data.reference} · ${verse.data.translation}`
                  : verseOfTheDayRef()}
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Link
                  to="/bible"
                  className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground nuru-glow-sm"
                >
                  Read &amp; Reflect <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  to="/bible"
                  aria-label="Open the Bible"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border-strong bg-surface-2/70 text-cyan"
                >
                  <BookOpen className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  aria-label="Share today's verse"
                  onClick={() => {
                    const text = verse.data
                      ? `"${verse.data.text}" — ${verse.data.reference}`
                      : "A verse from Nuru Faith";
                    if (navigator.share) void navigator.share({ text }).catch(() => {});
                    else void navigator.clipboard.writeText(text);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border-strong bg-surface-2/70 text-cyan"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </article>
        )}
      </section>

      {/* Quick Access */}
      <section className="px-4 pt-6">
        <SectionHeader title="Quick access" />
        <nav aria-label="Quick access" className="grid grid-cols-4 gap-x-2 gap-y-4">
          {QUICK.map(({ to, label, icon: Icon, tone }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-1.5 text-center transition-transform active:scale-95"
            >
              <IconTile icon={Icon} tone={tone} size="lg" />
              <span className="text-[11px] font-medium text-secondary-foreground">{label}</span>
            </Link>
          ))}
        </nav>
      </section>

      {/* Continue Growing */}
      {continueSeries?.series && (
        <section className="px-4 pt-7">
          <SectionHeader title="Continue growing" action="All series" to="/series" />
          <Link
            to="/series/$slug"
            params={{ slug: continueSeries.series.slug }}
            className="nuru-card flex gap-3 overflow-hidden p-3 transition-colors active:opacity-90"
          >
            <img
              src={resolveMedia(continueSeries.series.cover_image)}
              alt=""
              loading="lazy"
              className="h-[72px] w-[72px] shrink-0 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan/80">
                {continueSeries.progress ? "In progress" : "Scripture series"}
              </p>
              <p className="truncate text-sm font-semibold">{continueSeries.series.title}</p>
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {continueSeries.series.session_count} sessions ·{" "}
                {continueSeries.series.estimated_duration} min
              </p>
              <ProgressBar
                className="mt-2"
                value={continueSeries.progress?.progress_percent ?? 0}
              />
            </div>
          </Link>
        </section>
      )}

      {/* Today's Challenge */}
      <section className="px-4 pt-7">
        <SectionHeader title="Today's challenge" />
        <div className="nuru-card flex items-center gap-3 p-4">
          <IconTile icon={Target} tone="growth" size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug text-secondary-foreground">
              {challenge.prompt}
            </p>
          </div>
          <Link
            to="/bible"
            className="shrink-0 rounded-full bg-primary px-3.5 py-2 text-[11px] font-semibold text-primary-foreground nuru-glow-sm"
          >
            Accept
          </Link>
        </div>
      </section>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section className="px-4 pt-7">
          <SectionHeader title="Upcoming" action="All events" to="/events" />
          <div className="space-y-2">
            {upcoming.map((e) => (
              <Link key={e.id} to="/events" className="nuru-card flex items-center gap-3 p-3">
                <img
                  src={resolveMedia(e.cover_url)}
                  alt=""
                  width={128}
                  height={128}
                  loading="lazy"
                  className="h-14 w-14 rounded-xl object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{e.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {eventDate(e.starts_at)}
                  </span>
                  <span className="block truncate text-[11px] font-medium text-cyan">
                    {e.location ?? "Online"}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Music & Media */}
      <section className="px-4 pt-7">
        <SectionHeader title="Music & media" action="Open" to="/music" />
        {media.isLoading ? (
          <CardSkeleton count={1} height="h-32" />
        ) : (media.data ?? []).length > 0 ? (
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
            {(media.data ?? []).map((item) => (
              <Link
                key={item.id}
                to="/music"
                className="nuru-card w-32 shrink-0 overflow-hidden p-2.5 transition-colors active:opacity-90"
              >
                <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-surface-2">
                  {item.thumbnail_url ? (
                    <img
                      src={resolveMedia(item.thumbnail_url)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Music2 className="h-6 w-6 text-cyan/60" />
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-xs font-semibold leading-snug">{item.title}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {item.creator_name ?? "Nuru Faith"}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="nuru-card flex items-center gap-3 p-4">
            <IconTile icon={Music2} tone="growth" size="lg" />
            <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-secondary-foreground">
              Worship, sermons and Christian video are on their way to your feed.
            </p>
            <Link
              to="/music"
              className="shrink-0 rounded-full border border-border-strong bg-surface-2/70 px-3.5 py-2 text-[11px] font-semibold text-cyan"
            >
              Browse
            </Link>
          </div>
        )}
      </section>

      <p className="script px-4 pt-9 text-center text-2xl text-cyan/80">Let your light shine.</p>
    </AppShell>
  );
}
