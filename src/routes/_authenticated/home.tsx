import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronRight,
  HandHeart,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { fetchVerseOfTheDay, verseOfTheDayRef } from "@/lib/bible";
import { fetchEvents, fetchPostPage, fetchProfile } from "@/services/content";
import { AppShell, Avatar, BrandBar } from "@/components/nuru/AppShell";
import { NURU_PHOTO_POOLS, useRotatingMedia } from "@/lib/rotatingMedia";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — Nuru Faith" },
      {
        name: "description",
        content: "Your daily reading, church updates and the people around you.",
      },
      { property: "og:title", content: "Home — Nuru Faith" },
      { property: "og:description", content: "Your daily reading and your church community." },
    ],
  }),
  component: HomeScreen,
});

/**
 * The four quick actions from the design. There is no Prayer wall screen in
 * the app yet, so Prayer opens the Community feed, whose own design carries a
 * Prayer filter — rather than inventing a page that does not exist.
 */
const QUICK_ACTIONS = [
  { to: "/bible", label: "Bible", icon: BookOpen, tone: "" },
  { to: "/community", label: "Prayer", icon: HandHeart, tone: "nuru-disc-terra" },
  { to: "/events", label: "Events", icon: CalendarDays, tone: "nuru-disc-sand" },
  { to: "/mentors", label: "Mentorship", icon: Users, tone: "" },
] as const;

function greetingFor(date: Date) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function HomeScreen() {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const readingPhoto = useRotatingMedia(NURU_PHOTO_POOLS.home, "home-todays-reading");

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
  const verse = useQuery({ queryKey: ["verse-of-day"], queryFn: fetchVerseOfTheDay });
  const events = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const feed = useQuery({ queryKey: ["posts", 0], queryFn: () => fetchPostPage(0) });

  useEffect(() => {
    if (profile.data && profile.data.onboarded === false)
      void navigate({ to: "/onboarding", replace: true });
  }, [profile.data, navigate]);

  const firstName = profile.data?.full_name?.split(" ")[0] ?? "friend";
  const reference = verse.data?.reference ?? verseOfTheDayRef();
  const verseText = verse.data?.text ?? "";

  const nextEvent =
    (events.data ?? [])
      .filter((e) => new Date(e.starts_at).getTime() >= Date.now() - 3600_000)
      .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))[0] ?? null;
  const latestPost = feed.data?.[0] ?? null;

  return (
    <AppShell>
      <BrandBar centered />

      <div className="px-5 pt-3">
        {/* Greeting — the one place a serif name carries the screen. */}
        <section>
          <p className="nuru-eyebrow text-ink-3">{greetingFor(new Date())},</p>
          <h1 className="mt-1 font-display text-[46px] leading-[0.95] tracking-[-0.01em]">
            {firstName}
          </h1>
          {verseText && (
            <p className="mt-2 line-clamp-2 font-display text-[16px] leading-snug text-ink-2">
              {verseText}
            </p>
          )}
        </section>

        {/* Four quick actions, two by two, above everything else. */}
        <section className="mt-5 grid grid-cols-2 gap-2.5">
          {QUICK_ACTIONS.map(({ to, label, icon: Icon, tone }) => (
            <Link
              key={label}
              to={to}
              className="flex items-center gap-2 rounded-2xl border border-border bg-[linear-gradient(180deg,#1E2A23,#18211C)] py-2.5 pr-2 pl-2.5 transition-colors hover:border-border-strong"
            >
              <span className={`nuru-disc h-9 w-9 ${tone}`}>
                <Icon className="h-[17px] w-[17px]" strokeWidth={1.9} />
              </span>
              {/* "Mentorship" is the longest label — it must not truncate. */}
              <span className="min-w-0 flex-1 font-display text-[16px] leading-none">{label}</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-3" strokeWidth={2} />
            </Link>
          ))}
        </section>

        {/* Today's reading */}
        <section className="mt-3.5">
          <Link
            to="/bible"
            className="relative block overflow-hidden rounded-2xl border border-border"
          >
            <img src={readingPhoto} alt="" className="h-[206px] w-full object-cover" />
            <span className="absolute inset-0 bg-[linear-gradient(to_top,rgba(17,23,21,0.94)_18%,rgba(17,23,21,0.45)_58%,rgba(17,23,21,0.12))]" />
            <span className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4">
              <span className="min-w-0 flex-1">
                <span className="nuru-eyebrow block">Today's reading</span>
                <span className="mt-1.5 block font-display text-[30px] leading-none">
                  {reference}
                </span>
                {verseText && (
                  <span className="mt-1.5 line-clamp-2 block font-display text-[19px] leading-tight text-[#E8E4D9]">
                    {verseText}
                  </span>
                )}
              </span>
              <span className="nuru-disc nuru-disc-sand h-11 w-11 shrink-0">
                <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.2} />
              </span>
            </span>
          </Link>
        </section>

        {/* Next church gathering — real events only. */}
        <section className="mt-3.5">
          {nextEvent ? (
            <Link
              to="/events"
              className="nuru-card flex items-center gap-3 p-3 transition-colors"
            >
              <span className="nuru-disc nuru-disc-terra h-9 w-9">
                <CalendarDays className="h-4 w-4" strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="nuru-eyebrow block">Upcoming service</span>
                <span className="mt-0.5 block truncate font-display text-[20px] leading-tight">
                  {nextEvent.title}
                </span>
                <span className="mt-0.5 block truncate text-[12px] text-ink-2">
                  {new Date(nextEvent.starts_at).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                  {" · "}
                  {new Date(nextEvent.starts_at).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                {(nextEvent.location || nextEvent.host) && (
                  <span className="mt-0.5 block truncate text-[12px] text-ink-3">
                    {nextEvent.location ?? nextEvent.host}
                  </span>
                )}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={2} />
            </Link>
          ) : (
            <div className="nuru-card flex items-center gap-3 p-3.5">
              <span className="nuru-disc nuru-disc-terra h-9 w-9">
                <CalendarDays className="h-4 w-4" strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="nuru-eyebrow block">Upcoming service</span>
                <span className="mt-1 block text-[13px] leading-snug text-ink-3">
                  Nothing scheduled yet — your church can add services and gatherings here.
                </span>
              </span>
            </div>
          )}
        </section>

        {/* From the community — real posts only. */}
        <section className="mt-3.5">
          {latestPost ? (
            <Link
              to="/community"
              className="nuru-card flex items-start gap-3 p-3 transition-colors"
            >
              <span className="nuru-disc h-9 w-9">
                <Users className="h-4 w-4" strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="nuru-eyebrow block">From our community</span>
                <span className="mt-1 line-clamp-3 block text-[13px] leading-snug text-ink-2">
                  {latestPost.body}
                </span>
                <span className="mt-2 flex items-center gap-2">
                  <Avatar
                    url={latestPost.author_avatar_url}
                    name={latestPost.author_name ?? ""}
                    seed={latestPost.author_id}
                    size="sm"
                    className="h-6 w-6"
                  />
                  <span className="truncate text-[11px] text-ink-3">
                    {latestPost.author_name ?? "A member"}
                  </span>
                </span>
              </span>
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-3" strokeWidth={2} />
            </Link>
          ) : (
            <div className="nuru-card flex items-center gap-3 p-3.5">
              <span className="nuru-disc h-9 w-9">
                <Users className="h-4 w-4" strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="nuru-eyebrow block">From our community</span>
                <span className="mt-1 block text-[13px] leading-snug text-ink-3">
                  No posts yet — be the first to share an update, prayer or encouragement.
                </span>
              </span>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
