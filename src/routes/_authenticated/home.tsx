import { CoverImage } from "@/components/nuru/CoverImage";
import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  BookOpen,
  ChevronRight,
  HandHeart,
  Music2,
  Sparkles,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { resolveMedia } from "@/lib/media";
import { fetchVerseOfTheDay, verseOfTheDayRef } from "@/lib/bible";
import { fetchDevotionals, fetchProfile, fetchUnreadNotificationCount } from "@/services/content";
import { fetchMyProgress, fetchSeries } from "@/services/series";
import { AppShell, Avatar, BoardHeader } from "@/components/nuru/AppShell";
import { ProgressBar } from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — Nuru Faith" },
      {
        name: "description",
        content: "Today's verse, your devotionals and the quickest way back into Scripture.",
      },
      { property: "og:title", content: "Home — Nuru Faith" },
      { property: "og:description", content: "Today's verse and your daily reading." },
    ],
  }),
  component: HomeScreen,
});

/**
 * The hero photo is pinned rather than drawn from the rotating pool, which
 * also holds night and candle shots that leave the headline unreadable.
 */
const HERO_PHOTO = "asset:mountain-dawn";

/** The four tiles the board puts under Quick Access. Every one is a real route. */
const QUICK_ACCESS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/bible", label: "Bible", icon: BookOpen },
  { to: "/prayer", label: "Pray", icon: HandHeart },
  { to: "/music", label: "Music", icon: Music2 },
  // Matches the sidebar's Mentorship glyph, and stays distinct from Pray.
  { to: "/mentors", label: "Mentors", icon: UserRoundCheck },
];

function HomeScreen() {
  const navigate = useNavigate();
  const { userId } = useAuth();

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
  const verse = useQuery({ queryKey: ["verse-of-day"], queryFn: fetchVerseOfTheDay });
  const devotionals = useQuery({ queryKey: ["devotionals"], queryFn: fetchDevotionals });
  const progress = useQuery({
    queryKey: ["series-progress", userId],
    queryFn: () => fetchMyProgress(userId!),
    enabled: !!userId,
  });
  const series = useQuery({ queryKey: ["series"], queryFn: () => fetchSeries() });
  const { data: unread = 0 } = useQuery({
    queryKey: ["notification-unread-count", userId],
    queryFn: () => fetchUnreadNotificationCount(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (profile.data && profile.data.onboarded === false)
      void navigate({ to: "/onboarding", replace: true });
  }, [profile.data, navigate]);

  const reference = verse.data?.reference ?? verseOfTheDayRef();
  const verseText = verse.data?.text ?? "";

  const devotional = (devotionals.data?.[0] ?? null) as {
    id: string;
    title: string;
    subtitle: string | null;
    cover_url: string | null;
    read_minutes: number | null;
  } | null;

  // "Continue reading" is a real started-but-unfinished series, or nothing.
  const resume = (() => {
    const started = (progress.data ?? [])
      .filter((p) => p.progress_percent > 0 && p.progress_percent < 100)
      .sort((a, b) => b.progress_percent - a.progress_percent)[0];
    if (!started) return null;
    const row = (series.data ?? []).find((s) => s.id === started.series_id);
    return row ? { ...row, percent: started.progress_percent } : null;
  })();

  return (
    <AppShell>
      <BoardHeader
        right={
          <>
            <Link
              to="/notifications"
              aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Bell className="h-5 w-5" strokeWidth={1.8} />
              {unread > 0 && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary ring-2 ring-[var(--background)]" />
              )}
            </Link>
            <Link to="/profile" aria-label="Your profile">
              <Avatar
                url={profile.data?.avatar_url ?? null}
                name={profile.data?.full_name ?? ""}
                seed={userId}
                size="sm"
                className="h-9 w-9"
              />
            </Link>
          </>
        }
      />

      <div className="px-5 pb-8 lg:px-0">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
          <div className="grid gap-5">
            {/* Hero */}
            <section className="relative overflow-hidden rounded-3xl">
              <CoverImage
                src={resolveMedia(HERO_PHOTO)}
                alt=""
                className="h-[320px] w-full object-cover lg:h-[400px]"
              />
              {/* Keeps the headline readable over any part of the photo. */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 lg:p-8">
                <h1 className="font-display text-[38px] leading-[1.05] font-semibold text-white lg:text-[48px]">
                  A Brighter You.
                </h1>
                <p className="mt-2 max-w-sm text-[14.5px] leading-snug text-white/85">
                  A few quiet minutes with Scripture, every day.
                </p>
                <Link
                  to="/devotionals"
                  className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-[14.5px] font-semibold text-[#111827] transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/40 focus-visible:outline-none"
                >
                  Explore Devotionals
                </Link>
              </div>
            </section>

            {/* Today's Verse */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
                  Today&apos;s verse
                </p>
                <span className="shrink-0 text-[12.5px] font-semibold text-ink-3">
                  {verse.data?.translation ?? ""}
                </span>
              </div>
              {verse.isLoading ? (
                <div className="mt-3 space-y-2" aria-busy="true" aria-label="Loading today's verse">
                  <div className="h-5 w-full animate-pulse rounded bg-surface-2" />
                  <div className="h-5 w-4/5 animate-pulse rounded bg-surface-2" />
                </div>
              ) : (
                <>
                  {verseText && (
                    <blockquote className="mt-2.5 font-display text-[20px] leading-relaxed text-foreground lg:text-[22px]">
                      &ldquo;{verseText}&rdquo;
                    </blockquote>
                  )}
                  <p className="mt-2.5 text-[13px] font-semibold tracking-[0.08em] text-ink-3 uppercase">
                    {reference}
                  </p>
                </>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/bible"
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 text-[14px] font-semibold whitespace-nowrap text-primary-foreground transition-colors hover:brightness-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <BookOpen className="h-4 w-4 shrink-0" strokeWidth={2} />
                  Read Bible
                </Link>
                <Link
                  to="/ai"
                  search={{ contextType: "verse", contextLabel: reference }}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 text-[14px] font-semibold whitespace-nowrap text-foreground transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <Sparkles className="h-4 w-4 shrink-0" strokeWidth={2} />
                  Reflect
                </Link>
              </div>
            </section>
          </div>

          <div className="grid gap-5 lg:content-start">
            {/* Quick Access */}
            <section>
              <h2 className="px-1 pb-2.5 text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
                Quick access
              </h2>
              <ul className="grid grid-cols-4 gap-2.5">
                {QUICK_ACCESS.map(({ to, label, icon: Icon }) => (
                  <li key={label}>
                    <Link
                      to={to}
                      className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-1 py-3.5 transition-colors hover:border-border-strong hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-primary">
                        <Icon className="h-5 w-5" strokeWidth={1.9} />
                      </span>
                      <span className="text-[12.5px] font-semibold">{label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {/* Continue Reading */}
            <section>
              <div className="flex items-end justify-between gap-3 px-1 pb-2.5">
                <h2 className="text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
                  Continue reading
                </h2>
                <Link
                  to="/devotionals"
                  className="shrink-0 text-[13px] font-semibold text-primary hover:underline"
                >
                  See all
                </Link>
              </div>

              {resume ? (
                <Link
                  to="/series/$slug"
                  params={{ slug: resume.slug }}
                  className="flex gap-3.5 rounded-2xl border border-border bg-card p-3.5 transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-surface-2">
                    {resume.cover_image && (
                      <CoverImage
                        src={resolveMedia(resume.cover_image)}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[17px] leading-tight font-semibold">
                      {resume.title}
                    </span>
                    <ProgressBar
                      className="mt-2"
                      value={resume.percent}
                      label={`${Math.round(resume.percent)}% complete`}
                    />
                  </span>
                </Link>
              ) : devotional ? (
                <Link
                  to="/devotionals"
                  className="flex gap-3.5 rounded-2xl border border-border bg-card p-3.5 transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-surface-2">
                    {devotional.cover_url && (
                      <CoverImage
                        src={resolveMedia(devotional.cover_url)}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[17px] leading-tight font-semibold">
                      {devotional.title}
                    </span>
                    {devotional.subtitle && (
                      <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-ink-2">
                        {devotional.subtitle}
                      </span>
                    )}
                    <span className="mt-1.5 block text-[12px] text-ink-3">
                      {devotional.read_minutes ?? 3} min read
                    </span>
                  </span>
                  <ChevronRight className="mt-6 h-4.5 w-4.5 shrink-0 text-ink-3" strokeWidth={2} />
                </Link>
              ) : (
                <p className="rounded-2xl border border-border bg-card p-4 text-[13.5px] text-ink-3">
                  Start a devotional or a series and it will wait for you here.
                </p>
              )}
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
