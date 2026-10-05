import { CoverImage } from "@/components/nuru/CoverImage";
import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ArrowRight, Bookmark, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { resolveMedia } from "@/lib/media";
import { fetchProfile } from "@/services/content";
import { supabase } from "@/integrations/supabase/client";
import { DevotionalReader } from "@/components/nuru/DevotionalReader";
import { LearningLinks } from "@/components/nuru/LearningLinks";
import { readSavedDevotionalIds, toggleSavedDevotional } from "@/lib/devotionalBookmarks";
import { AppShell } from "@/components/nuru/AppShell";
import { FeatureHeaderBar } from "@/components/nuru/FeatureHeader";
import { CardSkeleton, EmptyState, ScreenHero } from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/devotionals")({
  validateSearch: (search: Record<string, unknown>): { reading?: string | undefined } => ({
    reading:
      typeof search["reading"] === "string" && /^[a-f\d-]{36}$/i.test(search["reading"])
        ? search["reading"]
        : undefined,
  }),
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

/** How many dots the streak row shows — one week at a glance, as on the board. */
const STREAK_DOTS = 7;

/** "Today", "Yesterday", then a short date — the board's own labelling. */
function dayLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type DevotionalRow = {
  id: string;
  title: string;
  subtitle: string | null;
  scripture_ref: string | null;
  cover_url: string | null;
  publish_date: string | null;
  read_minutes: number | null;
};

function DevotionalsScreen() {
  const { userId } = useAuth();
  const { reading } = Route.useSearch();
  const [search, setSearch] = useState("");
  const [savedIds, setSavedIds] = useState<Set<string>>(() => readSavedDevotionalIds(null));

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
  useEffect(() => setSavedIds(readSavedDevotionalIds(userId ?? null)), [userId]);
  const devotionals = useInfiniteQuery({
    queryKey: ["devotional-library", search],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let query = supabase
        .from("devotionals")
        .select("id,title,subtitle,scripture_ref,cover_url,publish_date,read_minutes", {
          count: "exact",
        })
        .order("publish_date", { ascending: false })
        .order("title")
        .order("id");
      const term = search
        .trim()
        .replace(/[^\p{L}\p{N}\s-]/gu, " ")
        .trim();
      if (term) query = query.or(`title.ilike.%${term}%,scripture_ref.ilike.%${term}%`);
      const { data, error, count } = await query.range(pageParam * 24, pageParam * 24 + 23);
      if (error) throw error;
      return {
        rows: data ?? [],
        total: count ?? 0,
        next: (pageParam + 1) * 24 < (count ?? 0) ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (page) => page.next,
  });
  const rows = (devotionals.data?.pages.flatMap((page) => page.rows) ?? []) as DevotionalRow[];
  const streak = profile.data?.faith_streak ?? 0;

  function toggleSave(id: string) {
    setSavedIds(toggleSavedDevotional(userId ?? null, id));
  }

  if (reading) return <DevotionalReader key={reading} id={reading} />;

  return (
    <AppShell>
      <FeatureHeaderBar />
      <LearningLinks active="Devotionals" />
      <ScreenHero image={resolveMedia("asset:topic-faith")} />

      <div className="px-4 pb-6">
        <h1 className="font-display text-[40px] leading-none">Devotionals</h1>

        {/* Streak — driven by the profile's real streak, not a fixed number. */}
        <section className="nuru-card mt-4 flex items-center gap-3 p-3">
          <span className="nuru-disc nuru-disc-terra h-11 w-11">
            <Flame className="h-5 w-5" strokeWidth={1.9} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[19px] leading-tight">
              {streak} day streak
            </span>
            <span className="block text-[12px] text-ink-3">
              {streak > 0 ? "Keep going. God is with you." : "Read today to start your streak."}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
            {Array.from({ length: STREAK_DOTS }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-2 w-2 rounded-full",
                  i < Math.min(streak, STREAK_DOTS) ? "bg-terra-lt" : "bg-surface-2",
                )}
              />
            ))}
          </span>
        </section>

        <h2 className="mt-6 mb-3 font-display text-[22px] leading-none">Daily devotionals</h2>
        <label className="mb-4 block">
          <span className="sr-only">Search devotionals</span>
          <input
            className="input-nuru"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search a devotional or Scripture passage"
          />
        </label>
        {devotionals.data && (
          <p className="mb-3 text-xs text-muted-foreground" role="status">
            {rows.length} of {devotionals.data.pages[0]?.total ?? 0} readings
          </p>
        )}
        {devotionals.isError && (
          <div role="alert">
            <p>Devotionals could not load.</p>
            <button
              type="button"
              className="min-h-11 text-primary underline"
              onClick={() => void devotionals.refetch()}
            >
              Retry devotionals
            </button>
          </div>
        )}

        {devotionals.isLoading && <CardSkeleton count={3} height="h-[120px]" />}

        {!devotionals.isLoading && rows.length === 0 && (
          <EmptyState
            title="No devotionals yet"
            description="Daily readings will appear here as they're published."
          />
        )}

        {rows.length > 0 && (
          <ul className="space-y-3">
            {rows.map((d) => {
              const saved = savedIds.has(d.id);
              const label = dayLabel(d.publish_date);
              return (
                <li key={d.id} className="relative">
                  <Link
                    to="/devotionals"
                    search={{ reading: d.id }}
                    className="relative block overflow-hidden rounded-2xl border border-border"
                  >
                    {d.cover_url ? (
                      <CoverImage
                        src={resolveMedia(d.cover_url)}
                        alt=""
                        loading="lazy"
                        className="h-[120px] w-full object-cover"
                      />
                    ) : (
                      <span className="block h-[120px] w-full bg-[linear-gradient(120deg,#143254,#0f2a49)]" />
                    )}
                    <span className="absolute inset-0 bg-[linear-gradient(to_right,rgba(17,23,21,0.94),rgba(17,23,21,0.6)_62%,rgba(17,23,21,0.28))]" />
                    <span className="absolute inset-0 flex items-end gap-3 p-4">
                      <span className="min-w-0 flex-1">
                        {label && <span className="nuru-eyebrow block">{label}</span>}
                        <span className="mt-1 block truncate font-display text-[22px] leading-tight text-white">
                          {d.title}
                        </span>
                        {d.scripture_ref && (
                          <span className="mt-0.5 block truncate text-[12px] text-white/80">
                            {d.scripture_ref}
                          </span>
                        )}
                      </span>
                      <span className="nuru-disc nuru-disc-terra h-10 w-10 shrink-0">
                        <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.2} />
                      </span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleSave(d.id);
                    }}
                    aria-label={saved ? "Remove bookmark" : "Save devotional"}
                    aria-pressed={saved}
                    className="absolute top-3 right-3 rounded-full bg-background/60 p-2 text-ink-2 backdrop-blur-sm"
                  >
                    <Bookmark className="h-3.5 w-3.5" fill={saved ? "currentColor" : "none"} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {devotionals.hasNextPage && (
          <button
            type="button"
            disabled={devotionals.isFetchingNextPage}
            className="mt-5 min-h-11 rounded-xl border border-border px-5 text-sm font-semibold"
            onClick={() => void devotionals.fetchNextPage()}
          >
            {devotionals.isFetchingNextPage ? "Loading…" : "Load more devotionals"}
          </button>
        )}
      </div>
    </AppShell>
  );
}
