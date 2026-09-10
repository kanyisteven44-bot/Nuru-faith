import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Sparkles } from "lucide-react";
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
  SectionHeader,
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

const FILTERS = ["All", "Identity", "Emotions", "Relationships", "Faith", "Purpose"] as const;

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
  const inProgress = useMemo(() => {
    const map = new Map((progress.data ?? []).map((p) => [p.series_id, p]));
    return all
      .filter((s) => map.has(s.id) && (map.get(s.id)!.progress_percent ?? 0) < 100)
      .map((s) => ({ series: s, percent: map.get(s.id)!.progress_percent }));
  }, [all, progress.data]);

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

  const byCategory = useMemo(() => {
    const groups = new Map<string, SeriesRow[]>();
    for (const s of visible) groups.set(s.category, [...(groups.get(s.category) ?? []), s]);
    return [...groups.entries()];
  }, [visible]);

  return (
    <AppShell>
      <header className="px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <p className="text-xs font-medium tracking-wide text-cyan uppercase">Bible</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Scripture Series</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Study a real question through connected passages — with context, reflection, prayer and
          one thing to do.
        </p>

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

      <div className="space-y-8 px-4 py-6">
        {series.isLoading && <CardSkeleton count={3} height="h-40" />}
        {series.isError && <ErrorState onRetry={() => void series.refetch()} />}

        {inProgress.length > 0 && (
          <section>
            <SectionHeader title="Continue studying" />
            <div className="space-y-3">
              {inProgress.map(({ series: s, percent }) => (
                <SeriesCard key={s.id} series={s} percent={percent} />
              ))}
            </div>
          </section>
        )}

        {!series.isLoading && visible.length === 0 && (
          <EmptyState
            title="Nothing matches that yet"
            description="Try another word — or ask Nuru AI your question directly."
          />
        )}

        {byCategory.map(([category, rows]) => (
          <section key={category}>
            <SectionHeader title={category} />
            <div className="space-y-3">
              {rows.map((s) => (
                <SeriesCard key={s.id} series={s} />
              ))}
            </div>
          </section>
        ))}

        <p className="flex items-start gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-xs text-muted-foreground">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
          Scripture Series are written to help you understand the Bible in context — not to replace
          your church, pastor or your own reading.
        </p>
      </div>
    </AppShell>
  );
}

function SeriesCard({ series, percent }: { series: SeriesRow; percent?: number }) {
  return (
    <Link
      to="/series/$slug"
      params={{ slug: series.slug }}
      className="nuru-card block overflow-hidden active:opacity-90"
    >
      <img
        src={resolveMedia(series.cover_image)}
        alt=""
        loading="lazy"
        className="h-32 w-full object-cover"
      />
      <div className="space-y-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="brand">{series.category}</Chip>
          <Chip>{series.session_count} sessions</Chip>
          <Chip>{series.estimated_duration} min</Chip>
        </div>
        <h3 className="font-display text-base font-semibold">{series.title}</h3>
        {series.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{series.description}</p>
        )}
        {percent !== undefined && (
          <ProgressBar className="pt-1" value={percent} label={`${percent}% complete`} />
        )}
      </div>
    </Link>
  );
}
