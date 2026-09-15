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
  GraduationCap,
  HandHeart,
  Heart,
  LayoutGrid,
  Network,
  Music2,
  Share2,
  ShieldCheck,
  Sparkles,
  Sprout,
  Target,
  UsersRound,
  Globe2,
  Award,
  Leaf,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { eventDate } from "@/lib/format";
import { resolveMedia } from "@/lib/media";
import { fetchVerseOfTheDay, verseOfTheDayRef } from "@/lib/bible";
import {
  fetchCourses,
  fetchDevotionals,
  fetchEvents,
  fetchGroups,
  fetchMentors,
  fetchNotifications,
  fetchProfile,
} from "@/services/content";
import { fetchMyProgress, fetchSeries } from "@/services/series";
import { fetchMediaItems } from "@/services/media";
import verseBg from "@/assets/bible-candle.jpg";
import { AppShell } from "@/components/nuru/AppShell";
import { Avatar } from "@/components/nuru/PostCard";
import { CardSkeleton, IconTile, ProgressBar, SectionHeader } from "@/components/nuru/Primitives";
import { NuruLogo } from "@/components/nuru/Logo";
import { FaithJourneyTrack } from "@/components/nuru/FaithJourney";

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
  { to: "/bible", label: "Bible", icon: BookOpen, tone: "violet" as const },
  { to: "/bible", label: "Devotionals", icon: Heart, tone: "growth" as const },
  { to: "/learn", label: "Courses", icon: GraduationCap, tone: "warning" as const },
  { to: "/community", label: "Groups", icon: UsersRound, tone: "violet" as const },
  { to: "/events", label: "Events", icon: CalendarDays, tone: "brand" as const },
  { to: "/mentors", label: "Mentors", icon: UsersRound, tone: "warning" as const },
  { to: "/serve", label: "Serve", icon: HandHeart, tone: "growth" as const },
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

function DashboardCard({
  to,
  icon,
  tone,
  title,
  body,
  meta,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "brand" | "cyan" | "violet" | "growth";
  title: string;
  body: string;
  meta: string | undefined;
}) {
  return (
    <Link
      to={to}
      className="nuru-card flex flex-col gap-3 p-5 transition-colors hover:bg-accent/40 active:opacity-90"
    >
      <div className="flex items-center justify-between">
        <IconTile icon={icon} tone={tone} size="lg" />
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="font-display text-sm font-semibold">{title}</p>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{body}</p>
        {meta && <p className="mt-1.5 text-[11px] font-medium text-cyan">{meta}</p>}
      </div>
    </Link>
  );
}

type VerseData = { text: string; reference: string; translation: string } | undefined;

function TodaysLightSection({
  isLoading,
  verseData,
  verseRef,
}: {
  isLoading: boolean;
  verseData: VerseData;
  verseRef: string;
}) {
  if (isLoading) return <CardSkeleton count={1} height="h-52" />;
  return (
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
          {verseData ? `"${verseData.text}"` : "Scripture is loading…"}
        </p>
        <p className="mt-2 text-xs font-medium text-cyan">
          {verseData ? `${verseData.reference} · ${verseData.translation}` : verseRef}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Link
            to="/bible"
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-primary/60 bg-primary/20 px-3 text-xs font-semibold text-cyan"
          >
            <BookOpen className="h-3.5 w-3.5" /> Read
          </Link>
          <Link
            to="/bible"
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-violet/60 bg-violet/20 px-3 text-xs font-semibold text-violet"
          >
            <Sparkles className="h-3.5 w-3.5" /> Reflect
          </Link>
          <button
            type="button"
            aria-label="Share today's verse"
            onClick={() => {
              const text = verseData
                ? `"${verseData.text}" — ${verseData.reference}`
                : "A verse from Nuru Faith";
              if (navigator.share) void navigator.share({ text }).catch(() => {});
              else void navigator.clipboard.writeText(text);
            }}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-border-strong bg-surface-2/70 px-3 text-xs font-semibold text-cyan"
          >
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
        </div>
      </div>
    </article>
  );
}

function ContinueGrowingSection({
  continueSeries,
}: {
  continueSeries:
    | {
        series: {
          slug: string;
          title: string;
          cover_image: string | null;
          session_count: number;
          estimated_duration: number;
        };
        progress: { progress_percent: number | null } | undefined;
      }
    | undefined;
}) {
  if (!continueSeries?.series) return null;
  return (
    <section>
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
          <ProgressBar className="mt-2" value={continueSeries.progress?.progress_percent ?? 0} />
        </div>
      </Link>
    </section>
  );
}

function ChallengeSection({ challenge }: { challenge: { ref: string; prompt: string } }) {
  return (
    <section>
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
          className="shrink-0 rounded-lg bg-primary px-3.5 py-2 text-[11px] font-semibold text-primary-foreground nuru-glow-sm"
        >
          Accept
        </Link>
      </div>
    </section>
  );
}

function UpcomingSection({
  upcoming,
}: {
  upcoming: {
    id: string;
    title: string;
    starts_at: string;
    location: string | null;
    cover_url: string | null;
  }[];
}) {
  if (upcoming.length === 0)
    return (
      <section>
        <SectionHeader title="Upcoming" action="All events" to="/events" />
        <div className="nuru-card flex items-center gap-3 p-4">
          <IconTile icon={CalendarDays} tone="brand" size="lg" />
          <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-secondary-foreground">
            No events on your calendar yet — check back soon.
          </p>
        </div>
      </section>
    );
  return (
    <section>
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
  );
}

function MusicMediaSection({
  isLoading,
  items,
}: {
  isLoading: boolean;
  items: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    creator_name: string | null;
  }[];
}) {
  return (
    <section>
      <SectionHeader title="Music & media" action="Open" to="/music" />
      {isLoading ? (
        <CardSkeleton count={1} height="h-32" />
      ) : items.length > 0 ? (
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
          {items.map((item) => (
            <Link
              key={item.id}
              to="/music"
              className="nuru-card w-32 shrink-0 overflow-hidden p-2.5 transition-colors active:opacity-90 lg:w-[calc(50%-0.375rem)]"
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
  );
}

function QuickAccessSection() {
  return (
    <section>
      <SectionHeader title="Quick access" />
      <nav aria-label="Quick access" className="grid grid-cols-4 gap-x-2 gap-y-3">
        {QUICK.map(({ to, label, icon: Icon, tone }) => (
          <Link
            key={to}
            to={to}
            className="group flex min-w-0 flex-col items-center gap-1.5 rounded-lg border border-border bg-surface/65 px-1 py-2.5 text-center shadow-sm transition-all hover:border-border-strong hover:bg-surface-2 active:scale-95"
          >
            <IconTile
              icon={Icon}
              tone={tone}
              size="lg"
              className="transition-transform group-hover:-translate-y-0.5"
            />
            <span className="text-[11px] font-medium text-secondary-foreground">{label}</span>
          </Link>
        ))}
      </nav>
    </section>
  );
}

function CommunitySection({
  isLoading,
  groups,
}: {
  isLoading: boolean;
  groups: { id: string; name: string; category: string | null; member_count: number }[];
}) {
  return (
    <section>
      <SectionHeader title="Community" action="All groups" to="/community" />
      {isLoading ? (
        <CardSkeleton count={2} height="h-16" />
      ) : groups.length === 0 ? (
        <div className="nuru-card flex items-center gap-3 p-4">
          <IconTile icon={UsersRound} tone="brand" size="lg" />
          <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-secondary-foreground">
            Groups for your church are being set up.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => (
            <Link key={g.id} to="/community" className="nuru-card flex items-center gap-3 p-3">
              <IconTile icon={UsersRound} tone="brand" size="lg" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{g.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {g.member_count > 0
                    ? `${g.member_count} ${g.member_count === 1 ? "member" : "members"}`
                    : "Be the first to join"}
                  {g.category ? ` · ${g.category}` : ""}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function DevotionalsSection({
  isLoading,
  devotionals,
}: {
  isLoading: boolean;
  devotionals: { id: string; title: string; scripture_ref: string | null; read_minutes: number }[];
}) {
  return (
    <section>
      <SectionHeader title="Bible & devotionals" action="Open" to="/bible" />
      {isLoading ? (
        <CardSkeleton count={2} height="h-16" />
      ) : devotionals.length === 0 ? (
        <div className="nuru-card flex items-center gap-3 p-4">
          <IconTile icon={BookOpen} tone="cyan" size="lg" />
          <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-secondary-foreground">
            New devotionals are being written for you.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {devotionals.map((d) => (
            <Link key={d.id} to="/bible" className="nuru-card flex items-center gap-3 p-3">
              <IconTile icon={BookOpen} tone="cyan" size="lg" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{d.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {[d.scripture_ref, `${d.read_minutes} min read`].filter(Boolean).join(" · ")}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function CoursesSection({
  isLoading,
  courses,
}: {
  isLoading: boolean;
  courses: { id: string; title: string; cover_url: string | null; lesson_count: number }[];
}) {
  return (
    <section>
      <SectionHeader title="Courses" action="View all" to="/learn" />
      {isLoading ? (
        <CardSkeleton count={2} height="h-16" />
      ) : courses.length === 0 ? (
        <div className="nuru-card flex items-center gap-3 p-4">
          <IconTile icon={GraduationCap} tone="brand" size="lg" />
          <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-secondary-foreground">
            Courses are being prepared for your church.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {courses.map((c) => (
            <Link key={c.id} to="/learn" className="nuru-card flex items-center gap-3 p-3">
              <img
                src={resolveMedia(c.cover_url)}
                alt=""
                width={112}
                height={112}
                loading="lazy"
                className="h-12 w-12 shrink-0 rounded-xl object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{c.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {c.lesson_count} {c.lesson_count === 1 ? "lesson" : "lessons"}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function MentorsSection({
  isLoading,
  mentors,
}: {
  isLoading: boolean;
  mentors: {
    id: string;
    display_name: string;
    photo_url: string | null;
    role_title: string | null;
    verified: boolean;
  }[];
}) {
  return (
    <section>
      <SectionHeader title="Mentors" action="View all" to="/mentors" />
      {isLoading ? (
        <CardSkeleton count={2} height="h-16" />
      ) : mentors.length === 0 ? (
        <div className="nuru-card flex items-center gap-3 p-4">
          <IconTile icon={Sparkles} tone="violet" size="lg" />
          <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-secondary-foreground">
            Mentors are joining Nuru Faith soon.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {mentors.map((m) => (
            <Link key={m.id} to="/mentors" className="nuru-card flex items-center gap-3 p-3">
              <Avatar src={m.photo_url} name={m.display_name} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold">{m.display_name}</span>
                  {m.verified && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-cyan" />}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {m.role_title ?? "Mentor"}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

const CORE_FEATURES = [
  {
    icon: Sprout,
    title: "Grow in Faith",
    body: "Bible studies, devotionals, teachings and church resources.",
    to: "/bible",
  },
  {
    icon: UsersRound,
    title: "Connect & Belong",
    body: "Join church and area-based groups, events and communities.",
    to: "/community",
  },
  {
    icon: GraduationCap,
    title: "Learn & Be Equipped",
    body: "Courses, mentorship, leadership development and practical resources.",
    to: "/learn",
  },
  {
    icon: HandHeart,
    title: "Serve & Make an Impact",
    body: "Volunteer, raise funds and support community initiatives.",
    to: "/serve",
  },
  {
    icon: Clapperboard,
    title: "Create & Share",
    body: "Share testimonies, worship, reels, art, ideas and inspiration.",
    to: "/reels",
  },
  {
    icon: ShieldCheck,
    title: "Safe & Positive Space",
    body: "A moderated, Christ-centred community for the next generation.",
    to: "/hub",
  },
] as const;

/** Reference left column: brand, mission, and the six core features. */
function BrandPanel() {
  return (
    <div className="space-y-5">
      <div>
        <div className="origin-left scale-125">
          <NuruLogo />
        </div>
        <p className="mt-2 text-sm font-medium text-cyan">Connect · Grow · Live Your Faith</p>
      </div>

      <div>
        <p className="script text-3xl leading-tight text-foreground">
          A Brighter
          <br />
          Generation
          <br />
          for Christ
        </p>
        <p className="mt-3 text-sm leading-relaxed text-secondary-foreground">
          A digital faith community for young people to learn, connect, grow and make an impact in
          their churches, communities and beyond.
        </p>
      </div>

      <section className="nuru-card p-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan">
          Core features
        </h2>
        <ul className="mt-3 space-y-3.5">
          {CORE_FEATURES.map(({ icon: Icon, title, body, to }) => (
            <li key={title}>
              <Link to={to} className="flex gap-3 transition-opacity hover:opacity-80">
                <IconTile icon={Icon} tone="cyan" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="block text-xs leading-snug text-muted-foreground">{body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const IMPACT_STATS = [
  { value: "250K+", label: "Young People", icon: UsersRound },
  { value: "630+", label: "Churches", icon: Church },
  { value: "27", label: "Dioceses", icon: Network },
  { value: "1", label: "Kingdom Mission", icon: Globe2 },
] as const;

const GROW_PILLARS = [
  {
    title: "Faith",
    body: "Deepen your relationship with God",
    icon: ShieldCheck,
    tone: "cyan" as const,
  },
  {
    title: "Friendships",
    body: "Find your people and build lasting connections",
    icon: Heart,
    tone: "brand" as const,
  },
  {
    title: "Purpose",
    body: "Develop skills and discover your calling",
    icon: Award,
    tone: "violet" as const,
  },
  {
    title: "Impact",
    body: "Make a difference in your community",
    icon: Leaf,
    tone: "growth" as const,
  },
] as const;

function ImpactStats() {
  return (
    <section className="nuru-card grid grid-cols-4 divide-x divide-border px-2 py-3">
      {IMPACT_STATS.map(({ value, label, icon: Icon }) => (
        <div key={label} className="flex items-center justify-center gap-2 px-2">
          <Icon className="h-7 w-7 shrink-0 text-cyan" strokeWidth={1.65} />
          <span>
            <strong className="block font-display text-lg text-cyan">{value}</strong>
            <span className="block text-[10px] text-secondary-foreground">{label}</span>
          </span>
        </div>
      ))}
    </section>
  );
}

function GrowPillars() {
  return (
    <section className="nuru-card p-3">
      <h2 className="mb-3 text-center font-display text-sm font-semibold uppercase tracking-wide text-primary">
        Grow · Connect · Lead · Impact
      </h2>
      <div className="grid grid-cols-4 gap-2">
        {GROW_PILLARS.map(({ title, body, icon, tone }) => (
          <div key={title} className="rounded-lg border border-border bg-surface-2/55 p-2.5">
            <IconTile icon={icon} tone={tone} size="sm" />
            <p className="mt-2 text-[10px] font-bold uppercase text-secondary-foreground">
              {title}
            </p>
            <p className="mt-1 text-[9px] leading-snug text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HomeScreen() {
  const { userId, user } = useAuth();
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
  const groups = useQuery({ queryKey: ["groups"], queryFn: () => fetchGroups() });
  const mentors = useQuery({ queryKey: ["mentors"], queryFn: () => fetchMentors() });
  const devotionals = useQuery({ queryKey: ["devotionals"], queryFn: fetchDevotionals });
  const courses = useQuery({ queryKey: ["courses"], queryFn: fetchCourses });

  useEffect(() => {
    if (profile.data && profile.data.onboarded === false)
      navigate({ to: "/onboarding", replace: true });
  }, [profile.data, navigate]);

  const unread = (notifications.data ?? []).filter((n) => !n.read).length;
  const name = profile.data?.full_name?.split(" ")[0] ?? "friend";
  const profilePhoto =
    profile.data?.avatar_url ??
    user?.user_metadata?.["avatar_url"] ??
    user?.user_metadata?.["picture"] ??
    null;

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
    <AppShell wide="xl">
      <div className="mx-auto w-full max-w-xl lg:hidden">
        <header className="flex items-center justify-between px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-2 lg:justify-end">
          {/* Desktop carries the brand in the left column, so the mark is mobile-only here. */}
          <span className="lg:hidden">
            <NuruLogo compact />
          </span>
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
              <Avatar src={profilePhoto} name={profile.data?.full_name} />
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
      </div>

      {/* Mobile follows the reference phone order: greeting, daily verse hero, quick
          access, then the feed. Desktop renders the dashboard composition below. */}
      <div className="mx-auto w-full max-w-xl lg:hidden">
        <section className="px-4 pt-5">
          <TodaysLightSection
            isLoading={verse.isLoading}
            verseData={verse.data}
            verseRef={verseOfTheDayRef()}
          />
        </section>

        <div className="px-4 pt-7">
          <QuickAccessSection />
        </div>

        {continueSeries?.series && (
          <div className="px-4 pt-7">
            <ContinueGrowingSection continueSeries={continueSeries} />
          </div>
        )}

        <div className="px-4 pt-7">
          <ChallengeSection challenge={challenge} />
        </div>

        <div className="px-4 pt-7">
          <UpcomingSection upcoming={upcoming} />
        </div>

        <div className="px-4 pt-7">
          <MusicMediaSection isLoading={media.isLoading} items={media.data ?? []} />
        </div>

        <div className="px-4 pt-7">
          <CommunitySection isLoading={groups.isLoading} groups={(groups.data ?? []).slice(0, 3)} />
        </div>

        <p className="script px-4 pt-9 text-center text-2xl text-cyan/80">Let your light shine.</p>
      </div>

      {/* Desktop: the reference's three-column ecosystem — brand and core features on
          the left, the phone experience in the centre, content rails on the right. */}
      <section className="hidden px-5 pt-5 lg:grid lg:grid-cols-[300px_minmax(410px,1fr)_minmax(430px,1.1fr)] lg:gap-4 lg:pb-5">
        <BrandPanel />

        <div className="space-y-4">
          <ImpactStats />
          <div className="mx-auto max-w-[430px] rounded-[2rem] border-[6px] border-slate-900 bg-background p-3 shadow-2xl ring-1 ring-border-strong">
            <header className="flex items-center justify-between pb-3">
              <div>
                <h1 className="font-display text-xl font-semibold">Shalom, {name}! 👋</h1>
                <p className="text-xs text-secondary-foreground">
                  You are loved. You are called. You are sent.
                </p>
              </div>
              <Link to="/profile" aria-label="Your profile">
                <Avatar src={profilePhoto} name={profile.data?.full_name} />
              </Link>
            </header>
            <div className="space-y-4">
              <TodaysLightSection
                isLoading={verse.isLoading}
                verseData={verse.data}
                verseRef={verseOfTheDayRef()}
              />
              <QuickAccessSection />
              <ChallengeSection challenge={challenge} />
              <UpcomingSection upcoming={upcoming} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <GrowPillars />
          <div className="grid grid-cols-2 gap-4">
            <DevotionalsSection
              isLoading={devotionals.isLoading}
              devotionals={(devotionals.data ?? []).slice(0, 3)}
            />
            <CoursesSection
              isLoading={courses.isLoading}
              courses={(courses.data ?? []).slice(0, 3)}
            />
            <CommunitySection
              isLoading={groups.isLoading}
              groups={(groups.data ?? []).slice(0, 3)}
            />
            <MentorsSection
              isLoading={mentors.isLoading}
              mentors={(mentors.data ?? []).slice(0, 3)}
            />
            <DashboardCard
              to="/hub"
              icon={LayoutGrid}
              tone="cyan"
              title="News & announcements"
              body="Church updates, opportunities and stories from the Nuru community"
              meta="Open Nuru Hub"
            />
            <MusicMediaSection isLoading={media.isLoading} items={(media.data ?? []).slice(0, 4)} />
          </div>
        </div>
      </section>

      {/* Reference bottom band: the milestone track across the full dashboard width. */}
      <section className="hidden px-4 pb-10 lg:block">
        <FaithJourneyTrack streak={profile.data?.faith_streak ?? 0} />
      </section>
    </AppShell>
  );
}
