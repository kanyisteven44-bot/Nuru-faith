import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { resolveMedia } from "@/lib/media";
import { fetchCuratedSeries, fetchMyProgress, type SeriesRow } from "@/services/series";
import { AppShell } from "@/components/nuru/AppShell";
import { FeatureHeaderBar } from "@/components/nuru/FeatureHeader";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/series/")({
  head: () => ({
    meta: [
      { title: "Bible series — Nuru Faith" },
      {
        name: "description",
        content:
          "Study real-life topics through connected Bible passages, reflection, prayer and practical action.",
      },
      { property: "og:title", content: "Bible series — Nuru Faith" },
      {
        property: "og:description",
        content: "Topic-led Bible study: read, understand, reflect, pray, apply.",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SeriesHome,
});

// The library seed adds 1,200 auto-generated filler series to the same
// table for browse/search volume. This screen spotlights only Nuru's
// hand-written series, fetched by slug so bulk content never crowds them out.
const CURATED_SLUGS = [
  "finding-your-purpose",
  "foundations-of-following-jesus",
  "wisdom-for-everyday-life",
  "relationships-and-dating",
  "when-youre-anxious",
];

function SeriesHome() {
  const { userId } = useAuth();

  const series = useQuery({
    queryKey: ["curated-series"],
    queryFn: () => fetchCuratedSeries(CURATED_SLUGS),
  });
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

  return (
    <AppShell>
      <FeatureHeaderBar />

      <div className="px-4 pb-6">
        <h1 className="font-display text-[40px] leading-none">Bible series</h1>
        <p className="mt-1.5 text-[14px] text-ink-2">
          Lessons that walk a topic through Scripture, reflection and prayer.
        </p>

        <div className="mt-5">
          {series.isLoading && <CardSkeleton count={3} height="h-[164px]" />}
          {series.isError && <ErrorState onRetry={() => void series.refetch()} />}
          {!series.isLoading && !series.isError && all.length === 0 && (
            <EmptyState
              title="No series yet"
              description="Bible series will appear here as they're published."
            />
          )}

          {all.length > 0 && (
            <ul className="space-y-3.5">
              {all.map((s) => (
                <li key={s.id}>
                  <SeriesCard series={s} percent={progressMap.get(s.id) ?? 0} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-6 rounded-2xl border border-border bg-surface px-4 py-3 text-xs text-ink-3">
          Bible series are written to help you understand the Bible in context — not to replace your
          church, pastor or your own reading.
        </p>
      </div>
    </AppShell>
  );
}

/**
 * The board's series card: a full-bleed photo with the title and subtitle set
 * over it, a leaf progress bar and the lesson count along the bottom, and the
 * terracotta arrow that carries every "open this" action in the system.
 */
function SeriesCard({ series, percent }: { series: SeriesRow; percent: number }) {
  const done = Math.round((percent / 100) * series.session_count);
  return (
    <Link
      to="/series/$slug"
      params={{ slug: series.slug }}
      className="relative block overflow-hidden rounded-2xl border border-border"
    >
      {series.cover_image ? (
        <img
          src={resolveMedia(series.cover_image)}
          alt=""
          loading="lazy"
          className="h-[164px] w-full object-cover"
        />
      ) : (
        <span className="block h-[164px] w-full bg-[linear-gradient(120deg,#22302a,#19201d)]" />
      )}
      <span className="absolute inset-0 bg-[linear-gradient(to_top,rgba(17,23,21,0.95)_12%,rgba(17,23,21,0.45)_55%,rgba(17,23,21,0.15))]" />

      <span className="absolute inset-x-0 top-0 flex items-start gap-3 p-4">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[24px] leading-tight">
            {series.title}
          </span>
          {series.description && (
            <span className="mt-0.5 block truncate text-[13px] text-ink-2">
              {series.description}
            </span>
          )}
        </span>
        <span className="nuru-disc nuru-disc-terra h-10 w-10 shrink-0">
          <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </span>
      </span>

      <span className="absolute inset-x-0 bottom-0 flex items-center gap-3 px-4 pb-3.5">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[rgba(241,238,230,0.16)]">
          <span
            className="block h-full rounded-full bg-[linear-gradient(90deg,var(--primary),var(--leaf))]"
            style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
          />
        </span>
        <span className="shrink-0 text-[11px] font-semibold text-ink-2">
          {done} of {series.session_count} lessons
        </span>
      </span>
    </Link>
  );
}
