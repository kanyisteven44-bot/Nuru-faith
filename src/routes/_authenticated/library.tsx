import { BooksCatalogue } from "@/components/nuru/BooksCatalogue";
import { CoverImage } from "@/components/nuru/CoverImage";
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BookMarked,
  BookOpen,
  Bookmark,
  ChevronRight,
  GraduationCap,
  Highlighter,
  History,
  Sparkles,
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
        content: "Read Scripture, explore Christian books and courses, and return to everything you have saved.",
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
const TABS = ["books", "saved", "history"] as const;
type Tab = (typeof TABS)[number];

const LIBRARY_SHORTCUTS: {
  to: "/bible" | "/faith-courses" | "/devotionals" | "/series";
  label: string;
  detail: string;
  icon: LucideIcon;
}[] = [
  {
    to: "/bible",
    label: "Bible",
    detail: "Read Scripture and return to saved passages",
    icon: BookOpen,
  },
  {
    to: "/faith-courses",
    label: "Courses",
    detail: "Go deeper with guided faith learning",
    icon: GraduationCap,
  },
  {
    to: "/devotionals",
    label: "Devotions",
    detail: "Short reflections for everyday faith",
    icon: Sparkles,
  },
  {
    to: "/series",
    label: "Series",
    detail: "Follow multi-part Scripture journeys",
    icon: BookMarked,
  },
];

function LibraryScreen() {
  const [tab, setTab] = useState<Tab>("books");

  return (
    <AppShell>
      <BoardHeader />

      <div className="px-5 pb-8 lg:px-0">
        <section
          className="relative isolate overflow-hidden rounded-[28px] border border-border bg-card"
          aria-label="Library introduction"
        >
          <CoverImage
            src={resolveMedia("asset:reading-scripture")}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/65 to-black/20" />
          <div className="relative flex min-h-[280px] flex-col justify-end p-5 sm:p-7 lg:min-h-[330px] lg:p-8">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-white/80 uppercase">
              Your faith library
            </p>
            <h1 className="mt-2 max-w-xl font-display text-[34px] leading-[1.05] font-semibold text-white sm:text-[40px]">
              Read. Learn. Return.
            </h1>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-white/78">
              Scripture, guided learning, devotionals and the things you save — organized so you
              can find your way back quickly.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to="/bible"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-105 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                <BookOpen className="h-4 w-4" />
                Open Bible
              </Link>
              <Link
                to="/grow"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/30 bg-black/20 px-5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                Continue learning
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-6" aria-labelledby="library-explore-heading">
          <div className="flex items-end justify-between gap-3 px-1 pb-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
                Explore
              </p>
              <h2 id="library-explore-heading" className="mt-1 font-display text-[22px] font-semibold">
                Start anywhere
              </h2>
            </div>
            <span className="text-[11px] text-ink-3">4 ways to grow</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {LIBRARY_SHORTCUTS.map(({ to, label, detail, icon: Icon }) => (
              <Link
                key={label}
                to={to}
                className="group flex min-h-[142px] flex-col rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="nuru-soft-inset flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">
                  <Icon className="h-5 w-5" strokeWidth={1.9} />
                </span>
                <span className="mt-4 flex items-center justify-between gap-2">
                  <span className="text-[14px] font-semibold">{label}</span>
                  <ChevronRight className="h-4 w-4 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </span>
                <span className="mt-1 text-[12px] leading-snug text-ink-3">{detail}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-7" aria-labelledby="personal-library-heading">
          <div className="px-1">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
              Personal library
            </p>
            <h2 id="personal-library-heading" className="mt-1 font-display text-[22px] font-semibold">
              Yours to come back to
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
              Browse books, revisit saved Scripture and posts, or pick up something you watched
              earlier.
            </p>
          </div>

          <div className="mt-4">
            <PillTabs
              tabs={TABS}
              value={tab}
              onChange={setTab}
              labels={{ books: "Books", saved: "Saved", history: "History" }}
            />
          </div>

          {tab === "books" ? <BooksCatalogue /> : tab === "saved" ? <SavedTab /> : <HistoryTab />}
        </section>
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
                        <CoverImage
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
              <CoverImage
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
