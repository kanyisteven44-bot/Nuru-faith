import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  HandHeart,
  UsersRound,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { fetchVerseOfTheDay, verseOfTheDayRef } from "@/lib/bible";
import { fetchEvents, fetchProfile } from "@/services/content";
import { AppShell, BrandBar } from "@/components/nuru/AppShell";
import { CardSkeleton } from "@/components/nuru/Primitives";
import { NURU_PHOTO_POOLS, useRotatingMedia } from "@/lib/rotatingMedia";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — Nuru Faith" },
      {
        name: "description",
        content: "Scripture, prayer, church life and mentorship in one calm daily space.",
      },
    ],
  }),
  component: HomeScreen,
});

const QUICK_ACTIONS = [
  { to: "/bible", label: "Bible", icon: BookOpen, tone: "forest" },
  { to: "/community", label: "Prayer", icon: HandHeart, tone: "terracotta" },
  { to: "/events", label: "Events", icon: CalendarDays, tone: "sand" },
  { to: "/mentors", label: "Mentorship", icon: UsersRound, tone: "forest" },
] as const;

function HomeScreen() {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const readingPhoto = useRotatingMedia(NURU_PHOTO_POOLS.home, "home-reading");

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });

  const verse = useQuery({
    queryKey: ["verse-of-day"],
    queryFn: fetchVerseOfTheDay,
  });

  const events = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
  });

  useEffect(() => {
    if (profile.data && profile.data.onboarded === false) {
      void navigate({ to: "/onboarding", replace: true });
    }
  }, [profile.data, navigate]);

  const firstName = profile.data?.full_name?.split(" ")[0] ?? "friend";
  const nextEvent =
    (events.data ?? [])
      .filter((event) => new Date(event.starts_at).getTime() >= Date.now() - 3600_000)
      .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))[0] ?? null;

  return (
    <AppShell>
      <BrandBar />

      <div className="mx-auto w-full max-w-5xl space-y-5 px-4 pb-4 pt-5 lg:px-6">
        <section className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-muted-foreground">
              Good morning,
            </p>
            <h1 className="mt-1 font-display text-[38px] font-semibold leading-none tracking-tight lg:text-[46px]">
              {firstName}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Be still, and know that I am God.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {QUICK_ACTIONS.map(({ to, label, icon: Icon, tone }) => (
            <Link
              key={label}
              to={to}
              className={[
                "group flex min-h-24 items-center gap-3 rounded-[1.35rem] border p-4 transition-transform active:scale-[0.98]",
                tone === "terracotta"
                  ? "border-[#b96445]/35 bg-[#b96445]/16"
                  : tone === "sand"
                    ? "border-[#e6b566]/30 bg-[#e6b566]/12"
                    : "border-[#3d6048]/55 bg-[#3d6048]/24",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border",
                  tone === "terracotta"
                    ? "border-[#b96445]/45 bg-[#b96445]/20 text-[#e7a58e]"
                    : tone === "sand"
                      ? "border-[#e6b566]/40 bg-[#e6b566]/16 text-[#e6b566]"
                      : "border-[#86c29a]/30 bg-[#3d6048]/40 text-[#86c29a]",
                ].join(" ")}
              >
                <Icon className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <span className="font-display text-lg font-medium text-foreground">{label}</span>
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </section>

        <section className="nuru-card overflow-hidden">
          <Link to="/bible" className="block">
            <div className="relative h-[260px] overflow-hidden lg:h-[360px]">
              <img
                src={readingPhoto}
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#111715] via-[#111715]/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 lg:p-7">
                <p className="text-[10px] font-bold uppercase tracking-[0.23em] text-[#e6b566]">
                  Today&apos;s reading
                </p>
                <p className="mt-2 font-display text-3xl font-semibold text-[#f1eee6] lg:text-4xl">
                  {verse.data?.reference ?? verseOfTheDayRef()}
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#f1eee6]/88 lg:text-base">
                  {verse.isLoading
                    ? "Opening today’s Scripture…"
                    : verse.data?.text ?? "The Lord is my light and my salvation."}
                </p>
                <span className="mt-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#e6b566] text-[#111715] shadow-lg shadow-black/20">
                  <ArrowRight className="h-5 w-5" />
                </span>
              </div>
            </div>
          </Link>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold">Upcoming</h2>
            <Link to="/events" className="text-xs font-semibold text-[#86c29a]">
              See all
            </Link>
          </div>

          {events.isLoading ? (
            <CardSkeleton count={1} height="h-24" />
          ) : nextEvent ? (
            <Link
              to="/events"
              className="nuru-card flex items-center gap-4 p-3.5 transition-colors hover:border-[#3d6048]/70"
            >
              <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#b96445]/18 text-[#e7a58e]">
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {new Date(nextEvent.starts_at).toLocaleDateString(undefined, {
                    month: "short",
                  })}
                </span>
                <span className="font-display text-xl font-semibold leading-none">
                  {new Date(nextEvent.starts_at).getDate()}
                </span>
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-foreground">
                  {nextEvent.title}
                </span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  {new Date(nextEvent.starts_at).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {nextEvent.location ? ` · ${nextEvent.location}` : ""}
                </span>
              </span>

              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ) : (
            <div className="nuru-card p-4 text-sm text-muted-foreground">
              No upcoming events yet. Your church can add the next gathering here.
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
