import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Compass,
  Heart,
  LifeBuoy,
  Play,
  Sparkles,
  Sprout,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { resolveMedia } from "@/lib/media";
import { fetchMyProgress, fetchSeries, type SeriesRow } from "@/services/series";
import { AppShell } from "@/components/nuru/AppShell";
import { FeatureHeaderBar } from "@/components/nuru/FeatureHeader";
import {
  CardSkeleton,
  Chip,
  EmptyState,
  ErrorState,
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

const CATEGORIES: { name: string; icon: LucideIcon; tint: string }[] = [
  { name: "Purpose & Calling", icon: Compass, tint: "from-warning/85 to-warning/50" },
  { name: "Discipleship", icon: BookOpen, tint: "from-violet/85 to-violet/50" },
  { name: "Life Skills", icon: Sprout, tint: "from-growth/85 to-growth/50" },
  { name: "Relationships", icon: Heart, tint: "from-magenta/85 to-magenta/50" },
  { name: "Difficult Seasons", icon: LifeBuoy, tint: "from-cyan/85 to-cyan/50" },
];

function SeriesHome() {
  const { userId } = useAuth();
  const [filter, setFilter] = useState<string | null>(null);

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
  const filtered = useMemo(
    () => (filter ? all.filter((s) => s.category === filter) : all),
    [all, filter],
  );

  return (
    <AppShell>
      <FeatureHeaderBar
        right={
          <p className="script max-w-[110px] text-right text-[15px] leading-[1.15] text-white/70">
            More Than A Sunday Faith <Heart className="inline h-3 w-3 -translate-y-0.5" />
          </p>
        }
      />

      <div className="space-y-6 px-4 pt-4 pb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Series</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Go deeper. Grow further.</p>
        </div>

        {series.isLoading && <CardSkeleton count={1} height="h-52" />}
        {series.isError && <ErrorState onRetry={() => void series.refetch()} />}
        {!series.isLoading && all.length === 0 && (
          <EmptyState
            title="No series yet"
            description="Scripture Series will appear here as they're published."
          />
        )}

        {all.length > 0 && (
          <>
            <section>
              <SectionTitle title="Made for You" />
              <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
                {all.map((s) => (
                  <MadeForYouCard key={s.id} series={s} percent={progressMap.get(s.id)} />
                ))}
              </div>
            </section>

            {inProgress.length > 0 && (
              <section>
                <SectionTitle title="Continue Learning" />
                <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
                  {inProgress.map((s) => (
                    <ContinueCard key={s.id} series={s} percent={progressMap.get(s.id)!} />
                  ))}
                </div>
              </section>
            )}

            <section>
              <SectionTitle title="Trending Topics" />
              <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
                {CATEGORIES.map((c) => {
                  const active = filter === c.name;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setFilter(active ? null : c.name)}
                      className={`flex h-20 w-28 shrink-0 flex-col items-start justify-between rounded-2xl bg-gradient-to-br p-3 text-left transition-transform active:scale-[0.97] ${c.tint} ${active ? "ring-2 ring-white/80" : ""}`}
                    >
                      <c.icon className="h-4.5 w-4.5 text-white" />
                      <span className="text-[12px] leading-tight font-bold text-white">
                        {c.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <SectionTitle title={filter ?? "All Series"} />
              <div className="space-y-2.5">
                {filtered.map((s) => (
                  <SeriesRowCard key={s.id} series={s} percent={progressMap.get(s.id)} />
                ))}
              </div>
            </section>
          </>
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

function SectionTitle({ title }: { title: string }) {
  return <h2 className="mb-3 font-display text-[15px] font-semibold">{title}</h2>;
}

function MadeForYouCard({ series, percent }: { series: SeriesRow; percent?: number | undefined }) {
  const active = percent !== undefined && percent > 0 && percent < 100;
  const completed = percent === 100;
  return (
    <Link
      to="/series/$slug"
      params={{ slug: series.slug }}
      className="nuru-card relative block h-52 w-60 shrink-0 overflow-hidden active:opacity-95"
    >
      <img
        src={resolveMedia(series.cover_image)}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/10" />
      <div className="absolute inset-x-0 bottom-0 space-y-1.5 p-3">
        <h3 className="font-display text-lg leading-tight font-bold text-white">{series.title}</h3>
        <p className="text-[11px] text-white/75">{series.session_count} Episodes</p>
        {active ? (
          <ProgressBar value={percent!} label={`${percent}%`} />
        ) : completed ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-growth/90 px-2 py-0.5 text-[10px] font-bold text-background">
            Completed
          </span>
        ) : (
          <Chip tone="brand">{series.category}</Chip>
        )}
      </div>
    </Link>
  );
}

function ContinueCard({ series, percent }: { series: SeriesRow; percent: number }) {
  const current = Math.max(1, Math.round((percent / 100) * series.session_count));
  return (
    <Link
      to="/series/$slug"
      params={{ slug: series.slug }}
      className="block w-36 shrink-0 active:opacity-90"
    >
      <div className="relative h-24 overflow-hidden rounded-xl">
        <img
          src={resolveMedia(series.cover_image)}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/25" />
        <span className="absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90">
          <Play className="h-3.5 w-3.5 fill-background text-background" />
        </span>
      </div>
      <p className="mt-1.5 truncate text-[13px] font-semibold">{series.title}</p>
      <p className="text-[11px] text-muted-foreground">
        Session {current} of {series.session_count}
      </p>
      <ProgressBar value={percent} className="mt-1" />
    </Link>
  );
}

function SeriesRowCard({ series, percent }: { series: SeriesRow; percent?: number | undefined }) {
  const active = percent !== undefined && percent > 0 && percent < 100;
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
        {active ? (
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
