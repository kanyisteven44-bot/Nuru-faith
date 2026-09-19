import { useState, type ComponentType } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bookmark,
  Compass,
  Heart,
  Leaf,
  Moon,
  Mountain,
  Search,
  SlidersHorizontal,
  Sun,
  User,
  Waves,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { resolveMedia } from "@/lib/media";
import { fetchProfile, fetchDevotionals } from "@/services/content";
import { readSavedDevotionalIds, toggleSavedDevotional } from "@/lib/devotionalBookmarks";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState, PillTabs } from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/devotionals")({
  head: () => ({
    meta: [
      { title: "Devotionals — Nuru Faith" },
      {
        name: "description",
        content: "A daily verse and short devotional readings to grow your faith.",
      },
    ],
  }),
  component: DevotionalsScreen,
});

const TOPICS: {
  label: string;
  subtitle: string;
  dbSubtitle: string;
  asset: string;
  /** Ring + icon colour for the circular Categories row. */
  tint: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  {
    label: "Faith",
    tint: "border-primary/60 bg-primary/15 text-cyan",
    subtitle: "Trust deeper",
    dbSubtitle: "Faith",
    asset: "topic-faith",
    icon: Mountain,
  },
  {
    label: "Anxiety",
    tint: "border-cyan/60 bg-cyan/12 text-cyan",
    subtitle: "Find peace",
    dbSubtitle: "Anxiety & Peace",
    asset: "topic-mental-health",
    icon: Waves,
  },
  {
    label: "Prayer",
    tint: "border-violet/60 bg-violet/15 text-violet",
    subtitle: "Talk to God",
    dbSubtitle: "Prayer",
    asset: "topic-prayer",
    icon: Compass,
  },
  {
    label: "Relationships",
    tint: "border-magenta/60 bg-magenta/15 text-magenta",
    subtitle: "Love well",
    dbSubtitle: "Relationships",
    asset: "topic-relationships",
    icon: Heart,
  },
  {
    label: "Purpose",
    tint: "border-growth/60 bg-growth/15 text-growth",
    subtitle: "Live with intention",
    dbSubtitle: "Purpose",
    asset: "topic-faith-purpose",
    icon: Leaf,
  },
  {
    label: "Identity",
    tint: "border-warning/60 bg-warning/15 text-warning",
    subtitle: "Know who you are",
    dbSubtitle: "Identity",
    asset: "topic-personal-growth",
    icon: User,
  },
];

const TABS = ["Today", "Popular", "Topics"] as const;
type Tab = (typeof TABS)[number];

function DevotionalsScreen() {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Today");
  const [query, setQuery] = useState("");
  const [savedIds, setSavedIds] = useState<Set<string>>(() =>
    readSavedDevotionalIds(userId ?? null),
  );

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
  const devotionals = useQuery({ queryKey: ["devotionals"], queryFn: fetchDevotionals });
  const all = devotionals.data ?? [];
  // "Popular" has no engagement metric yet, so it reads longest-first as a
  // stand-in rather than pretending to rank by something we do not measure.
  const rows =
    tab === "Popular"
      ? [...all].sort((a, b) => (b.read_minutes ?? 0) - (a.read_minutes ?? 0))
      : all;
  const featured = rows[0] ?? null;
  const rest = rows.slice(1, 9);

  function search(q: string) {
    void navigate({ to: "/explore", search: { q, kind: "all" } });
  }

  function toggleSave(id: string) {
    setSavedIds(toggleSavedDevotional(userId ?? null, id));
  }

  return (
    <AppShell>
      <ScreenHeader
        title="Devotionals"
        right={
          <Link
            to="/explore"
            search={{ q: "", kind: "all" }}
            aria-label="Search devotionals"
            className="p-1 text-secondary-foreground"
          >
            <Search className="h-5 w-5" />
          </Link>
        }
      />

      <div className="px-4 pb-1">
        <PillTabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      <div className="space-y-6 px-4 pt-3 pb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            search(query);
          }}
          className="relative"
        >
          <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search devotionals, topics, or Scripture..."
            aria-label="Search devotionals"
            className="input-nuru pr-11 pl-11"
          />
          <button
            type="button"
            onClick={() => search(query)}
            aria-label="Filter"
            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </form>

        {devotionals.isLoading && <CardSkeleton count={1} height="h-64" />}
        {!devotionals.isLoading && rows.length === 0 && (
          <EmptyState
            title="No devotionals yet"
            description="Daily readings will appear here as they're published."
          />
        )}

        {tab !== "Topics" && featured && (
          <section className="nuru-card overflow-hidden">
            <div className="relative h-56">
              <img
                src={resolveMedia(featured.cover_url)}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10" />
              <button
                type="button"
                onClick={() => toggleSave(featured.id)}
                aria-label={savedIds.has(featured.id) ? "Remove bookmark" : "Save devotional"}
                aria-pressed={savedIds.has(featured.id)}
                className="absolute top-3 right-3 rounded-full bg-black/45 p-2 text-white backdrop-blur-sm"
              >
                <Bookmark
                  className="h-4 w-4"
                  fill={savedIds.has(featured.id) ? "currentColor" : "none"}
                />
              </button>
              <div className="absolute inset-x-0 bottom-0 p-4">
                <h2 className="font-display text-[22px] leading-tight font-bold text-white drop-shadow">
                  {featured.title}
                </h2>
                <p className="mt-1 text-[12px] text-white/80 drop-shadow">
                  {featured.read_minutes ?? 3} min read
                </p>
              </div>
            </div>
            <div className="p-3">
              <Link
                to="/bible"
                className="flex min-h-11 w-full items-center justify-center rounded-xl bg-white text-[14px] font-semibold text-slate-900"
              >
                Read Now
              </Link>
            </div>
          </section>
        )}

        {tab !== "Topics" && (
          <section>
            <h2 className="mb-3 font-display text-[15px] font-semibold">Categories</h2>
            <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-1">
              {TOPICS.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => search(t.dbSubtitle)}
                  className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center"
                >
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-full border ${t.tint}`}
                  >
                    <t.icon className="h-5.5 w-5.5" />
                  </span>
                  <span className="text-[11px] text-secondary-foreground">{t.label}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {tab !== "Topics" && rest.length > 0 && (
          <section>
            <h2 className="mb-3 font-display text-[15px] font-semibold">
              {tab === "Popular" ? "Most read" : "More for today"}
            </h2>
            <div className="space-y-2">
              {rest.map((d) => (
                <Link key={d.id} to="/bible" className="nuru-card flex items-center gap-3 p-2.5">
                  <img
                    src={resolveMedia(d.cover_url)}
                    alt=""
                    loading="lazy"
                    className="h-14 w-14 shrink-0 rounded-xl object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{d.title}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {d.read_minutes ?? 3} min read
                    </span>
                    {d.subtitle && (
                      <span className="block truncate text-[10px] font-semibold text-cyan">
                        {d.subtitle}
                      </span>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {tab === "Topics" && (
          <section>
            <div className="grid grid-cols-2 gap-2.5">
              {TOPICS.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => search(t.dbSubtitle)}
                  className="nuru-card relative block h-28 overflow-hidden text-left active:opacity-90"
                >
                  <img
                    src={resolveMedia(`asset:${t.asset}`)}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
                  <div className="absolute inset-x-0 bottom-0 p-2.5">
                    <t.icon className="mb-1 h-4 w-4 text-white drop-shadow" />
                    <p className="font-display text-[15px] leading-tight font-bold text-white">
                      {t.label}
                    </p>
                    <p className="text-[11px] text-white/75">{t.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-[15px] font-semibold">Quick Devotions</h2>
            <Link
              to="/explore"
              search={{ q: "", kind: "all" }}
              className="text-xs font-semibold text-cyan"
            >
              See all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/bible" className="nuru-card flex items-center gap-2.5 p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/18 text-warning">
                <Sun className="h-4.5 w-4.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">Morning Grace</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  Start your day right
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => search("Peace")}
              className="nuru-card flex items-center gap-2.5 p-3 text-left"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet/18 text-violet">
                <Moon className="h-4.5 w-4.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">Night Peace</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  End with Him
                </span>
              </span>
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
