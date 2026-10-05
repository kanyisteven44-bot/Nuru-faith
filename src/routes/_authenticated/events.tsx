import { CoverImage } from "@/components/nuru/CoverImage";
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { resolveMedia } from "@/lib/media";
import { eventDate } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { fetchEvents, fetchMyEventIds, toggleAttendance } from "@/services/content";
import { AppShell, BrandBar } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState, PillTabs } from "@/components/nuru/Primitives";
import { NURU_PHOTO_POOLS, useRotatingMedia } from "@/lib/rotatingMedia";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({
    meta: [
      { title: "Events — Nuru Faith" },
      {
        name: "description",
        content: "Worship nights, conferences and gatherings from churches near you.",
      },
      { property: "og:title", content: "Events — Nuru Faith" },
      { property: "og:description", content: "Find Christian events near you." },
    ],
  }),
  component: EventsScreen,
});

const TABS = ["All", "In-Person", "Online", "Nearby"] as const;
type Tab = (typeof TABS)[number];

function EventsScreen() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("All");
  // The board's month strip: this month and the five that follow.
  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() + i, 1));
  }, []);
  const [monthIndex, setMonthIndex] = useState(0);
  const heroBg = useRotatingMedia(NURU_PHOTO_POOLS.eventsFallback, "events-fallback");

  const events = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const mine = useQuery({
    queryKey: ["my-events", userId],
    queryFn: () => fetchMyEventIds(userId!),
    enabled: !!userId,
  });
  const going = new Set(mine.data ?? []);

  const rows = useMemo(() => {
    let all = events.data ?? [];
    if (tab === "Online") all = all.filter((e) => e.is_online);
    if (tab === "In-Person") all = all.filter((e) => !e.is_online);
    // "Nearby" has no geolocation yet; it shows events that carry a location.
    if (tab === "Nearby") all = all.filter((e) => !e.is_online && e.location);
    const m = months[monthIndex];
    if (m) {
      all = all.filter((e) => {
        const d = new Date(e.starts_at);
        return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
      });
    }
    return [...all].sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  }, [events.data, tab, months, monthIndex]);

  async function rsvp(eventId: string, isGoing: boolean) {
    if (!userId) {
      toast.error("Sign in to RSVP");
      return;
    }
    try {
      await toggleAttendance(userId, eventId, !isGoing);
      await qc.invalidateQueries({ queryKey: ["my-events", userId] });
      toast.success(isGoing ? "RSVP removed" : "You're going 🎉");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update your RSVP");
    }
  }

  return (
    <AppShell>
      <BrandBar />

      <div className="px-4 pb-6">
        <h1 className="font-display text-[40px] leading-none">Events</h1>
        <p className="mt-1.5 text-[14px] text-secondary-foreground">
          Gather, grow, and make a difference.
        </p>

        {/* Month strip */}
        <div className="mt-4 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMonthIndex((i) => Math.max(0, i - 1))}
            disabled={monthIndex === 0}
            aria-label="Earlier month"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground disabled:opacity-35"
          >
            <ChevronLeft className="h-4.5 w-4.5" strokeWidth={2} />
          </button>
          <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto">
            {months.map((m, i) => {
              const active = i === monthIndex;
              return (
                <button
                  key={m.toISOString()}
                  type="button"
                  onClick={() => setMonthIndex(i)}
                  aria-pressed={active}
                  className={cn(
                    "h-9 shrink-0 rounded-full px-4 text-[13px] font-bold transition-colors",
                    active
                      ? "nuru-tactile bg-primary text-foreground"
                      : "border border-border bg-surface-2 text-secondary-foreground",
                  )}
                >
                  {m.toLocaleDateString(undefined, { month: "short" })}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setMonthIndex((i) => Math.min(months.length - 1, i + 1))}
            disabled={monthIndex === months.length - 1}
            aria-label="Later month"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground disabled:opacity-35"
          >
            <ChevronRight className="h-4.5 w-4.5" strokeWidth={2} />
          </button>
        </div>

        <PillTabs className="mt-3" tabs={TABS} value={tab} onChange={setTab} />

        <h2 className="mt-5 mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Upcoming events
        </h2>

        {events.isLoading && <CardSkeleton count={3} height="h-[150px]" />}
        {!events.isLoading && rows.length === 0 && (
          <EmptyState
            title="Nothing this month"
            description="Church events and gatherings will show up here."
          />
        )}

        {featured && (
          <article className="nuru-card relative overflow-hidden">
            <div className="relative h-44 lg:h-72 xl:h-80">
              <CoverImage
                src={featured.cover_url ? resolveMedia(featured.cover_url) : heroBg}
                loading="eager"
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
              <span className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground">
                Featured
              </span>
            </div>
            <div className="p-4">
              <h2 className="font-display text-base font-semibold">{featured.title}</h2>
              {featured.description && (
                <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">
                  {featured.description}
                </p>
              )}
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5 text-leaf" />
                {eventDate(featured.starts_at)}
              </p>
              {featured.location && (
                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-leaf" />
                  {featured.location}
                </p>
              )}
              <button
                type="button"
                onClick={() => void rsvp(featured.id, going.has(featured.id))}
                className={cn(
                  "mt-3 min-h-10 w-full rounded-lg text-sm font-semibold transition-colors",
                  going.has(featured.id)
                    ? "border border-border-strong bg-surface-2 text-secondary-foreground"
                    : "bg-primary text-primary-foreground nuru-glow-sm",
                )}
              >
                {going.has(featured.id) ? "Going" : "Register"}
              </button>
            </div>
          </article>
        )}

        <div className="space-y-2">
          {rest.map((e) => {
            const isGoing = going.has(e.id);
            const when = new Date(e.starts_at);
            return (
              <li key={e.id}>
                <article className="nuru-card overflow-hidden">
                  <div className="flex h-[78px] lg:h-36">
                    {/* The board alternates the date block between terracotta
                        and forest down the list. */}
                    <span
                      className={cn(
                        "flex w-[78px] shrink-0 flex-col items-center justify-center",
                        i % 2 === 0
                          ? "bg-gradient-to-br from-violet-500 to-indigo-700 text-white"
                          : "bg-primary text-foreground",
                      )}
                    >
                      <span className="text-[10px] font-extrabold tracking-[0.14em] uppercase opacity-90">
                        {when.toLocaleDateString(undefined, { month: "short" })}
                      </span>
                      <span className="font-display text-[26px] leading-none">
                        {when.getDate()}
                      </span>
                    </span>
                    <span className="relative min-w-0 flex-1">
                      <CoverImage
                        src={e.cover_url ? resolveMedia(e.cover_url) : heroBg}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,19,47,0.55),rgba(0,19,47,0.15))]" />
                    </span>
                  </div>

                  <div className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-display text-[20px] leading-tight">{e.title}</h3>
                      <p className="mt-1 flex items-center gap-1.5 text-[12px] text-secondary-foreground">
                        <Clock
                          className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                          strokeWidth={1.9}
                        />
                        <span className="truncate">{eventDate(e.starts_at)}</span>
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />
                        <span className="truncate">
                          {e.is_online ? "Online" : (e.location ?? e.host ?? "In person")}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void rsvp(e.id, isGoing)}
                      className={cn(
                        "h-9 shrink-0 rounded-full px-4 text-[12px] font-bold transition-colors",
                        isGoing
                          ? "border border-growth/40 bg-growth/10 text-growth"
                          : "nuru-tactile bg-primary text-foreground",
                      )}
                    >
                      {isGoing ? "Going" : "RSVP"}
                    </button>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </AppShell>
  );
}
