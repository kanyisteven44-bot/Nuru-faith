import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Play, Search, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { resolveMedia } from "@/lib/media";
import { fetchMyProgress, fetchSeries, type SeriesRow } from "@/services/series";
import { AppShell } from "@/components/nuru/AppShell";
import {
  CardSkeleton,
  Chip,
  EmptyState,
  ErrorState,
  PillTabs,
  ProgressBar,
} from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/series/")({
  head: () => ({
    meta: [
      { title: "Scripture Series — Nuru Faith" },
      {
        name: "description",
        content:
          "Study real-life topics through connected Bible passages, reflection, prayer and practical action.",
      },
      { property: "og:title", content: "Scripture Series — Nuru Faith" },
      {
        property: "og:description",
        content: "Topic-led Bible study: read, understand, reflect, pray, apply.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SeriesHome,
});

const FILTERS = [
  "All",
  "Discipleship",
  "Life Skills",
  "Relationships",
  "Difficult Seasons",
  "Purpose & Calling",
] as const;

function SeriesHome() {
  const { userId } = useAuth();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const series = useQuery({ queryKey: ["series"], queryFn: () => fetchSeries() });
  const progress = useQuery({
    queryKey: ["series-progress", userId],
    queryFn: () => fetchMyProgress(userId!),
    enabled: !!userId,
  });

  const all = useMemo(() => series.data ?? [], [series.data]);
  const progressMap = useMemo(
    () => new Map((progress.data ?? []).map((p) => [p.series_id, p.progress_percent])),
    [progress.data],
  );
  const inProgress = useMemo(
    () => all.filter((s) => (progressMap.get(s.id) ?? 0) > 0 && (progressMap.get(s.id) ?? 0) < 100),
    [all, progressMap],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((s) => {
      const matchesFilter =
        filter === "All" || s.category.toLowerCase().includes(filter.toLowerCase());
      const matchesQuery =
        !q || s.title.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [all, filter, query]);

  const hero = inProgress[0] ?? visible[0] ?? all[0];
  const heroPercent = hero ? progressMap.get(hero.id) : undefined;
  const rest = useMemo(() => visible.filter((s) => s.id !== hero?.id), [visible, hero]);

  return (
    <AppShell>
      <header className="px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <p className="text-xs font-medium tracking-wide text-cyan uppercase">Bible</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Scripture Series</h1>

        <div className="relative mt-4">
          <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a topic, question or feeling"
            aria-label="Search Scripture Series"
            className="input-nuru pl-11"
          />
        </div>
        <PillTabs tabs={FILTERS} value={filter} onChange={setFilter} className="mt-3" />
      </header>

      <div className="space-y-6 px-4 py-6">
        {series.isLoading && <CardSkeleton count={1} height="h-64" />}
        {series.isError && <ErrorState onRetry={() => void series.refetch()} />}

        {!series.isLoading && !hero && (
          <EmptyState
            title="Nothing matches that yet"
            description="Try another word — or ask Nuru AI your question directly."
          />
        )}

        {hero && <SeriesHero series={hero} percent={heroPercent} />}

        {rest.length > 0 && (
          <div className="space-y-2.5">
            {rest.map((s) => (
              <SeriesRow key={s.id} series={s} percent={progressMap.get(s.id)} />
            ))}
          </div>
        )}

        <p className="flex items-start gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-xs text-muted-foreground">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
          Scripture Series are written to help you understand the Bible in context — not to replace
          your church, pastor or your own reading.
        </p>
      </div>
    </AppShell>
  );
}

function SeriesHero({ series, percent }: { series: SeriesRow; percent?: number | undefined }) {
  const inProgress = percent !== undefined && percent > 0 && percent < 100;
  return (
    <Link
      to="/series/$slug"
      params={{ slug: series.slug }}
      className="nuru-card relative block h-[260px] overflow-hidden active:opacity-95"
    >
      <img
        src={resolveMedia(series.cover_image)}
        alt=""
        loading="eager"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-background/5" />
      <div className="absolute inset-x-0 bottom-0 space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="brand">{series.category}</Chip>
          <span className="text-xs font-medium text-secondary-foreground">
            {series.session_count} sessions &middot; {series.estimated_duration} min
          </span>
        </div>
        <h2 className="font-display text-xl leading-tight font-bold">{series.title}</h2>
        {inProgress ? (
          <ProgressBar value={percent!} label={`${percent}% complete`} className="max-w-[180px]" />
        ) : (
          series.description && (
            <p className="line-clamp-2 max-w-[300px] text-[13px] text-secondary-foreground">
              {series.description}
            </p>
          )
        )}
        <span className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-cyan/30 bg-primary px-4 text-[13px] font-semibold text-primary-foreground nuru-glow-sm">
          <Play className="h-3.5 w-3.5 fill-current" />
          {inProgress ? `Continue · ${percent}%` : "Start series"}
        </span>
      </div>
    </Link>
  );
}

function SeriesRow({ series, percent }: { series: SeriesRow; percent?: number | undefined }) {
  const inProgress = percent !== undefined && percent > 0 && percent < 100;
  return (
    <Link
      to="/series/$slug"
      params={{ slug: series.slug }}
      className="nuru-card flex items-center gap-3 p-2.5 active:opacity-90"
    >
      <img
        src={resolveMedia(series.cover_image)}
        alt=""
        loading="lazy"
        className="h-14 w-14 shrink-0 rounded-xl object-cover"
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-[10px] font-bold tracking-wide text-cyan uppercase">{series.category}</p>
        <h3 className="truncate font-display text-sm font-semibold">{series.title}</h3>
        {inProgress ? (
          <ProgressBar value={percent!} className="mt-1 max-w-[120px]" />
        ) : (
          <p className="text-[11px] text-muted-foreground">
            {series.session_count} sessions &middot; {series.estimated_duration} min
          </p>
        )}
      </div>
    </Link>
  );
}
