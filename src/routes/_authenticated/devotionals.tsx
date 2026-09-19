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
import { RotatingPhoto } from "@/lib/photoRotation";
import { fetchProfile, fetchDevotionals } from "@/services/content";
import { readSavedDevotionalIds, toggleSavedDevotional } from "@/lib/devotionalBookmarks";
import { AppShell } from "@/components/nuru/AppShell";
import { FeatureHeaderBar } from "@/components/nuru/FeatureHeader";
import { CardSkeleton, EmptyState } from "@/components/nuru/Primitives";

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
  icon: ComponentType<{ className?: string }>;
}[] = [
  {
    label: "Faith",
    subtitle: "Trust deeper",
    dbSubtitle: "Faith",
    asset: "topic-faith",
    icon: Mountain,
  },
  {
    label: "Anxiety",
    subtitle: "Find peace",
    dbSubtitle: "Anxiety & Peace",
    asset: "topic-mental-health",
    icon: Waves,
  },
  {
    label: "Prayer",
    subtitle: "Talk to God",
    dbSubtitle: "Prayer",
    asset: "topic-prayer",
    icon: Compass,
  },
  {
    label: "Relationships",
    subtitle: "Love well",
    dbSubtitle: "Relationships",
    asset: "topic-relationships",
    icon: Heart,
  },
  {
    label: "Purpose",
    subtitle: "Live with intention",
    dbSubtitle: "Purpose",
    asset: "topic-faith-purpose",
    icon: Leaf,
  },
  {
    label: "Identity",
    subtitle: "Know who you are",
    dbSubtitle: "Identity",
    asset: "topic-personal-growth",
    icon: User,
  },
];

function DevotionalsScreen() {
  const { userId } = useAuth();
  const navigate = useNavigate();
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
  const rows = devotionals.data ?? [];
  const firstName = profile.data?.full_name?.split(" ")[0];

  function search(q: string) {
    void navigate({ to: "/explore", search: { q, kind: "all" } });
  }

  function toggleSave(id: string) {
    setSavedIds(toggleSavedDevotional(userId ?? null, id));
  }

  return (
    <AppShell>
      <FeatureHeaderBar />

      <div className="space-y-6 px-4 pt-4 pb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">
            Hey there{firstName ? `, ${firstName}` : ""} <span className="align-middle">👋</span>
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">New day. Same faithful God.</p>
        </div>

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

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-[15px] font-semibold">Explore by Topic</h2>
            <Link
              to="/explore"
              search={{ q: "", kind: "all" }}
              className="text-xs font-semibold text-cyan"
            >
              See all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {TOPICS.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => search(t.dbSubtitle)}
                className="nuru-card relative block h-28 overflow-hidden text-left active:opacity-90"
              >
                <RotatingPhoto
                  slot={`devotional-topic-${t.asset}`}
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

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-[15px] font-semibold">Recommended for You</h2>
            <Link
              to="/explore"
              search={{ q: "", kind: "all" }}
              className="text-xs font-semibold text-cyan"
            >
              See all
            </Link>
          </div>
          {devotionals.isLoading && <CardSkeleton count={1} height="h-44" />}
          {!devotionals.isLoading && rows.length === 0 && (
            <EmptyState
              title="No devotionals yet"
              description="Daily readings will appear here as they're published."
            />
          )}
          {rows.length > 0 && (
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {rows.slice(0, 8).map((d) => {
                const saved = savedIds.has(d.id);
                return (
                  <Link
                    key={d.id}
                    to="/bible"
                    className="nuru-card relative block w-36 shrink-0 overflow-hidden active:opacity-90"
                  >
                    <img
                      src={resolveMedia(d.cover_url)}
                      alt=""
                      loading="lazy"
                      className="h-24 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSave(d.id);
                      }}
                      aria-label={saved ? "Remove bookmark" : "Save devotional"}
                      aria-pressed={saved}
                      className="absolute top-2 right-2 rounded-full bg-black/45 p-1.5 text-white backdrop-blur-sm"
                    >
                      <Bookmark className="h-3.5 w-3.5" fill={saved ? "currentColor" : "none"} />
                    </button>
                    <div className="space-y-0.5 p-2.5">
                      <p className="line-clamp-2 font-display text-[13px] leading-tight font-semibold">
                        {d.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {d.read_minutes ?? 3} min read
                      </p>
                      <p className="text-[10px] font-semibold text-cyan">{d.subtitle}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

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
