import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Check,
  ChevronRight,
  Church,
  Clapperboard,
  GraduationCap,
  HandHeart,
  Leaf,
  Music2,
  Pencil,
  Share2,
  Sparkles,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useShareSheet } from "@/hooks/useShareSheet";
import { resolveMedia } from "@/lib/media";
import { fetchVerseOfTheDay, verseOfTheDayRef } from "@/lib/bible";
import { fetchDevotionals, fetchProfile } from "@/services/content";
import { HomeShell } from "@/components/nuru/HomeShell";

/**
 * Today's Light is pinned to one photo rather than rotating.
 *
 * The verse is set over this image, and the shared Home pool rotates through
 * night and candle shots that leave the type unreadable. The warm golden
 * sunrise in the concept board is not in the asset library; this is the
 * closest the library has — mountains at dawn, no figure. Swap this one
 * constant when a photo closer to the board is uploaded.
 */
const TODAYS_LIGHT_PHOTO = "asset:mountain-dawn";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — Nuru Faith" },
      {
        name: "description",
        content: "Your daily verse, devotional, church and community in one place.",
      },
      { property: "og:title", content: "Home — Nuru Faith" },
      { property: "og:description", content: "Your daily verse, devotional and community." },
    ],
  }),
  component: HomeScreen,
});

/** Quick Access, in the board's order. Every tile goes to a route that exists. */
const QUICK_ACCESS: { to: string; label: string; icon: LucideIcon; tint: string }[] = [
  { to: "/reels", label: "Reels", icon: Clapperboard, tint: "from-[#f05fa8] to-[#d6277f]" },
  { to: "/ai", label: "Nuru AI", icon: Sparkles, tint: "from-[#3fd0ee] to-[#1a9fd4]" },
  { to: "/church", label: "My Church", icon: Church, tint: "from-[#9b7bf5] to-[#7647e3]" },
  { to: "/bible", label: "Bible", icon: BookOpen, tint: "from-[#4b8ff5] to-[#2563d8]" },
  { to: "/music", label: "Music", icon: Music2, tint: "from-[#f7b23f] to-[#e08a13]" },
  { to: "/devotionals", label: "Devotions", icon: Leaf, tint: "from-[#3fcf74] to-[#1ba34f]" },
  {
    to: "/faith-courses",
    label: "Courses",
    icon: GraduationCap,
    tint: "from-[#f98a3c] to-[#e2620f]",
  },
  { to: "/mentors", label: "Mentors", icon: HandHeart, tint: "from-[#ef5fb4] to-[#d02a8c]" },
];

/**
 * The rotating daily challenge. These four lines are the app's own, carried
 * over unchanged — the board's wording is a mockup placeholder.
 */
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
  const lightPhoto = resolveMedia(TODAYS_LIGHT_PHOTO);

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
  const verse = useQuery({ queryKey: ["verse-of-day"], queryFn: fetchVerseOfTheDay });
  const devotionals = useQuery({ queryKey: ["devotionals"], queryFn: fetchDevotionals });

  useEffect(() => {
    if (profile.data && profile.data.onboarded === false)
      void navigate({ to: "/onboarding", replace: true });
  }, [profile.data, navigate]);

  const firstName = profile.data?.full_name?.split(" ")[0] ?? "friend";
  const reference = verse.data?.reference ?? verseOfTheDayRef();
  const verseText = verse.data?.text ?? "";
  const challenge = CHALLENGES[Math.floor(Date.now() / 86400000) % CHALLENGES.length]!;
  const devotional = (devotionals.data?.[0] ?? null) as {
    id: string;
    title: string;
    subtitle: string | null;
    cover_url: string | null;
    read_minutes: number | null;
  } | null;

  return (
    <HomeShell>
      <div className="px-4 lg:px-0">
        {/* Greeting */}
        <section>
          <h1 className="font-sans text-[25px] leading-tight font-extrabold tracking-tight lg:text-[40px]">
            Shalom, {firstName}!
          </h1>
          <p className="mt-0.5 text-[13px] leading-snug text-ink-2 lg:mt-1 lg:text-[16px]">
            Take a moment. What does your heart need today?
          </p>
        </section>

        {/* Today's Light beside Quick Access + the challenge */}
        <div className="mt-3 grid gap-3 lg:mt-4 lg:gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          {/* Today's Light */}
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="relative">
              <img src={lightPhoto} alt="" className="h-[184px] w-full object-cover lg:h-[404px]" />
              <span className="absolute inset-0 bg-[linear-gradient(to_top,rgba(5,20,38,0.92)_6%,rgba(5,20,38,0.26)_46%,rgba(5,20,38,0.12))]" />

              <span className="absolute top-3 left-3.5 text-[14px] font-bold lg:top-4 lg:left-4 lg:text-[17px]">
                Today&apos;s Light
              </span>

              <div className="absolute inset-x-0 bottom-0 p-3.5 lg:p-6">
                {verseText && (
                  <p className="font-serif text-[19px] leading-snug text-white lg:text-[30px]">
                    {verseText}
                  </p>
                )}
                <p className="mt-1.5 text-[11px] font-semibold tracking-[0.18em] text-white/75 uppercase lg:text-[12px]">
                  {reference}
                </p>
              </div>
            </div>

            {/* Three actions on the card base, as the board has them. */}
            <div className="grid grid-cols-3 gap-2 p-2.5 lg:gap-3 lg:p-4">
              <Link
                to="/bible"
                className="nuru-raise flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary text-[13px] font-bold text-primary-foreground lg:text-[14px]"
              >
                <BookOpen className="h-4 w-4 shrink-0" strokeWidth={2} />
                Read Bible
              </Link>
              <Link
                to="/ai"
                search={{ contextType: "verse", contextLabel: reference }}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 text-[13px] font-bold text-foreground lg:text-[14px]"
              >
                <Pencil className="h-4 w-4 shrink-0" strokeWidth={2} />
                Reflect
              </Link>
              <button
                type="button"
                onClick={() => {
                  void shareSheet.share({
                    title: reference,
                    text: verseText ? `“${verseText}” — ${reference}` : reference,
                    url: `${window.location.origin}/bible`,
                  });
                }}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 text-[13px] font-bold text-foreground lg:text-[14px]"
              >
                <Share2 className="h-4 w-4 shrink-0" strokeWidth={2} />
                Share
              </button>
            </div>
          </section>

          <div className="grid gap-3 lg:gap-4 lg:content-start">
            {/* Quick Access */}
            <section className="rounded-2xl border border-border bg-card p-3.5 lg:p-4">
              <h2 className="font-sans text-[17px] font-bold">Quick Access</h2>
              <div className="mt-2.5 grid grid-cols-4 gap-x-2 gap-y-3 lg:mt-3 lg:gap-y-3.5">
                {QUICK_ACCESS.map(({ to, label, icon: Icon, tint }) => (
                  <Link
                    key={label}
                    to={to}
                    {...(to === "/ai" ? { search: {} } : {})}
                    className="flex flex-col items-center gap-1.5 text-center"
                  >
                    <span
                      className={cn(
                        "home-tile h-[48px] w-[48px] bg-gradient-to-br lg:h-[52px] lg:w-[52px]",
                        tint,
                      )}
                    >
                      <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
                    </span>
                    <span className="text-[11px] leading-tight font-semibold text-ink-2">
                      {label}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            {/* Today's Challenge */}
            <section className="rounded-2xl border border-border bg-[#0a1f38] p-3.5 lg:p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(245,183,49,0.16)] text-sand">
                  <Sun className="h-5 w-5" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-sans text-[16px] font-bold text-sand">
                    Today&apos;s Challenge
                  </h2>
                  <p className="mt-1 text-[13px] leading-snug text-ink-2">{challenge}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={acceptedChallenge}
                onClick={() => {
                  setAcceptedChallenge(true);
                  toast.success("You're in — one step at a time.");
                }}
                className={cn(
                  "mt-3 flex min-h-11 w-full items-center gap-2 rounded-xl px-4 text-[14px] font-bold transition-all lg:mt-3.5",
                  acceptedChallenge
                    ? "border border-sand/45 bg-[rgba(245,183,49,0.14)] text-sand"
                    : "nuru-raise bg-[linear-gradient(180deg,#f8c75a,#e9a814)] text-[#2a1c05] hover:brightness-105",
                )}
              >
                {acceptedChallenge ? (
                  <>
                    <Check className="h-4 w-4" strokeWidth={2.6} />
                    Challenge accepted
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-center">Accept challenge</span>
                    <ChevronRight className="h-4 w-4 shrink-0" strokeWidth={2.4} />
                  </>
                )}
              </button>
            </section>
          </div>
        </div>

        {/* Daily devotional and finding a church */}
        <div className="mt-3 grid gap-3 lg:mt-4 lg:gap-4 lg:grid-cols-2">
          <section className="flex overflow-hidden rounded-2xl border border-border bg-card">
            <span className="w-[38%] shrink-0">
              {devotional?.cover_url ? (
                <img
                  src={resolveMedia(devotional.cover_url)}
                  alt=""
                  loading="lazy"
                  className="h-full min-h-[132px] w-full object-cover"
                />
              ) : (
                <span className="block h-full min-h-[132px] w-full bg-surface-2" />
              )}
            </span>
            <div className="min-w-0 flex-1 p-3.5">
              <p className="text-[10.5px] font-bold tracking-[0.16em] text-ink-3 uppercase">
                Daily devotional
              </p>
              {devotional ? (
                <>
                  <h3 className="mt-1 line-clamp-2 font-sans text-[17px] leading-tight font-bold">
                    {devotional.title}
                  </h3>
                  {devotional.subtitle && (
                    <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-ink-2">
                      {devotional.subtitle}
                    </p>
                  )}
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
                      <BookOpen className="h-3.5 w-3.5" strokeWidth={1.9} />
                      {devotional.read_minutes ?? 3} min read
                    </span>
                    <Link
                      to="/devotionals"
                      className="nuru-raise inline-flex min-h-9 items-center rounded-lg bg-primary px-3.5 text-[12.5px] font-bold text-primary-foreground"
                    >
                      Read devotional
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="mt-1 font-sans text-[17px] leading-tight font-bold">
                    Nothing published yet
                  </h3>
                  <p className="mt-1 text-[12.5px] leading-snug text-ink-2">
                    Daily readings will appear here as they are published.
                  </p>
                </>
              )}
            </div>
          </section>

          <section className="flex overflow-hidden rounded-2xl border border-border bg-card">
            <span className="w-[38%] shrink-0">
              <img
                src={resolveMedia("asset:church-interior")}
                alt=""
                loading="lazy"
                className="h-full min-h-[132px] w-full object-cover"
              />
            </span>
            <div className="min-w-0 flex-1 p-3.5">
              <p className="text-[10.5px] font-bold tracking-[0.16em] text-ink-3 uppercase">
                Your church community
              </p>
              <h3 className="mt-1 font-sans text-[17px] leading-tight font-bold">
                Find your church and see what&apos;s happening.
              </h3>
              <Link
                to="/explore"
                search={{ q: "", kind: "churches" }}
                className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border-strong bg-surface-2 px-4 text-[13px] font-bold"
              >
                Find my church
                <ChevronRight className="h-4 w-4" strokeWidth={2.2} />
              </Link>
            </div>
          </section>
        </div>
      </div>
      {shareSheet.node}
    </HomeShell>
  );
}
