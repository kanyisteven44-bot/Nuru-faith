import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BookMarked,
  Bookmark,
  ChevronRight,
  GraduationCap,
  Highlighter,
  History,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { resolveMedia } from "@/lib/media";
import { fetchMySavedPostRows } from "@/services/content";
import {
  fetchAllHighlights,
  fetchMyProgress,
  fetchSavedScriptures,
  fetchSeries,
} from "@/services/series";
import { fetchMediaHistory } from "@/services/media";
import { AppShell, BoardHeader } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState, PillTabs, ProgressBar } from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Library — Nuru Faith" },
      {
        name: "description",
        content: "Everything you have saved: verses, highlights, posts and the series you started.",
      },
    ],
  }),
  component: LibraryScreen,
});

/**
 * The board draws Saved / Downloads / History. Downloads is not here: nothing
 * records what a person has downloaded (media_items.can_download is only a
 * per-item permission flag) and there is no offline store behind it, so the
 * tab would be a mockup. It is listed in the gaps rather than faked.
 */
const TABS = ["saved", "history"] as const;
type Tab = (typeof TABS)[number];

function LibraryScreen() {
  const [tab, setTab] = useState<Tab>("saved");

  return (
    <AppShell>
      <BoardHeader />

      <div className="px-5 pb-8">
        <h1 className="font-display text-[30px] leading-tight font-semibold">Library</h1>
        <p className="mt-1 text-[14px] leading-snug text-ink-2">
          Everything you have saved, in one place.
        </p>

        <div className="mt-4">
          <PillTabs
            tabs={TABS}
            value={tab}
            onChange={setTab}
            labels={{ saved: "Saved", history: "History" }}
          />
        </div>

        {tab === "saved" ? <SavedTab /> : <HistoryTab />}
      </div>
    </AppShell>
  );
}

/* ---------- saved ---------- */

function SavedTab() {
  const { userId } = useAuth();

  const verses = useQuery({
    queryKey: ["saved-scriptures", userId],
    queryFn: () => fetchSavedScriptures(userId!),
    enabled: !!userId,
  });
  const highlights = useQuery({
    queryKey: ["all-highlights", userId],
    queryFn: () => fetchAllHighlights(userId!),
    enabled: !!userId,
  });
  const savedPosts = useQuery({
    queryKey: ["saved-post-rows", userId],
    queryFn: () => fetchMySavedPostRows(userId!),
    enabled: !!userId,
  });
  const progress = useQuery({
    queryKey: ["series-progress", userId],
    queryFn: () => fetchMyProgress(userId!),
    enabled: !!userId,
  });
  const series = useQuery({ queryKey: ["series"], queryFn: () => fetchSeries() });

  const loading =
    verses.isLoading || highlights.isLoading || savedPosts.isLoading || progress.isLoading;

  const started = (progress.data ?? []).filter((p) => p.progress_percent > 0);
  const inProgress = started.filter((p) => p.progress_percent < 100);

  // Reading progress across everything started — the board's percentage bar.
  const overallPercent =
    started.length === 0
      ? 0
      : started.reduce((sum, p) => sum + p.progress_percent, 0) / started.length;

  const resumable = inProgress
    .map((p) => {
      const row = (series.data ?? []).find((s) => s.id === p.series_id);
      return row ? { ...row, percent: p.progress_percent } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.percent - a.percent);

  const counts: {
    icon: LucideIcon;
    label: string;
    hint: string;
    count: number | undefined;
    to: "/bible" | "/community" | "/series";
  }[] = [
    {
      icon: BookMarked,
      label: "Saved verses",
      hint: "Scripture you kept",
      count: verses.data?.length,
      to: "/bible",
    },
    {
      icon: Highlighter,
      label: "Highlights",
      hint: "Passages you marked",
      count: highlights.data?.length,
      to: "/bible",
    },
    {
      icon: Bookmark,
      label: "Saved posts",
      hint: "From the community",
      count: savedPosts.data?.length,
      to: "/community",
    },
    {
      icon: GraduationCap,
      label: "Series in progress",
      hint: "Pick up where you left off",
      count: inProgress.length,
      to: "/series",
    },
  ];

  const nothingSaved =
    !loading &&
    (verses.data?.length ?? 0) === 0 &&
    (highlights.data?.length ?? 0) === 0 &&
    (savedPosts.data?.length ?? 0) === 0 &&
    started.length === 0;

  if (loading) {
    return (
      <div className="mt-5">
        <CardSkeleton count={4} height="h-[76px]" />
      </div>
    );
  }

  if (nothingSaved) {
    return (
      <div className="mt-6">
        <EmptyState
          title="Nothing saved yet"
          description="Save a verse, highlight a passage or bookmark a post and it will collect here."
          action={
            <Link
              to="/bible"
              className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Open the Bible
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <>
      {/* Reading progress */}
      {started.length > 0 && (
        <section className="mt-5 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
              Reading progress
            </h2>
            <span className="font-display text-[20px] leading-none font-semibold tabular-nums">
              {Math.round(overallPercent)}%
            </span>
          </div>
          <ProgressBar
            className="mt-2.5"
            value={overallPercent}
            label={`Across ${started.length} ${started.length === 1 ? "series" : "series"} you have started`}
          />

          {resumable.length > 0 && (
            <ul className="mt-4 space-y-2.5 border-t border-border pt-4">
              {resumable.slice(0, 3).map((s) => (
                <li key={s.id}>
                  <Link
                    to="/series/$slug"
                    params={{ slug: s.slug }}
                    className="flex items-center gap-3.5 rounded-xl p-1 transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                      {s.cover_image && (
                        <img
                          src={resolveMedia(s.cover_image)}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-semibold">{s.title}</span>
                      <ProgressBar className="mt-1.5" value={s.percent} />
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink-2">
                      {Math.round(s.percent)}%
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Saved items */}
      <section className="mt-5">
        <h2 className="px-1 pb-2.5 text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
          Saved items
        </h2>
        <ul className="space-y-2.5">
          {counts.map((c) => (
            <li key={c.label}>
              <LibraryRow {...c} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

/* ---------- history ---------- */

function HistoryTab() {
  const { userId } = useAuth();
  const history = useQuery({
    queryKey: ["media-history", userId],
    queryFn: () => fetchMediaHistory(userId!),
    enabled: !!userId,
  });

  if (history.isLoading) {
    return (
      <div className="mt-5">
        <CardSkeleton count={4} height="h-[68px]" />
      </div>
    );
  }

  if (!history.data || history.data.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState
          title="Nothing watched yet"
          description="Videos, sermons and music you play will show up here so you can find them again."
        />
      </div>
    );
  }

  return (
    <ul className="mt-5 space-y-2.5">
      {history.data.map((row) => (
        <li
          key={row.id}
          className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-3"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-2 text-ink-3">
            {row.thumbnail_url ? (
              <img
                src={resolveMedia(row.thumbnail_url)}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <History className="h-5 w-5" strokeWidth={1.9} />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14.5px] font-semibold">{row.title}</span>
            <span className="block truncate text-[12.5px] text-ink-3">
              {[row.media_type, relativeDate(row.created_at)].filter(Boolean).join(" · ")}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function LibraryRow({
  icon: Icon,
  label,
  hint,
  count,
  to,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  count: number | undefined;
  to: "/bible" | "/community" | "/series";
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-3.5 transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
        <Icon className="h-5 w-5" strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{label}</span>
        <span className="block truncate text-[12.5px] text-ink-3">{hint}</span>
      </span>
      <span className="shrink-0 text-[15px] font-semibold tabular-nums text-ink-2">
        {count ?? "—"}
      </span>
      <ChevronRight className="h-4.5 w-4.5 shrink-0 text-ink-3" strokeWidth={2} />
    </Link>
  );
}

function relativeDate(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
