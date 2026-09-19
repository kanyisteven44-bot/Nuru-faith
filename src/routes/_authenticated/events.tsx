import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { resolveMedia } from "@/lib/media";
import { eventDate } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { fetchEvents, fetchMyEventIds, toggleAttendance } from "@/services/content";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState, PillTabs } from "@/components/nuru/Primitives";
import { useRotatingPhoto } from "@/lib/photoRotation";

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
  const heroBg = useRotatingPhoto("events-fallback");
  const { userId } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("All");

  const events = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const mine = useQuery({
    queryKey: ["my-events", userId],
    queryFn: () => fetchMyEventIds(userId!),
    enabled: !!userId,
  });
  const going = new Set(mine.data ?? []);

  const rows = useMemo(() => {
    const all = events.data ?? [];
    if (tab === "Online") return all.filter((e) => e.is_online);
    if (tab === "In-Person") return all.filter((e) => !e.is_online);
    // "Nearby" has no geolocation yet; it shows events that carry a location.
    if (tab === "Nearby") return all.filter((e) => !e.is_online && e.location);
    return all;
  }, [events.data, tab]);

  const [featured, ...rest] = rows;

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
      <ScreenHeader
        title="Events"
        right={
          <span className="p-1 text-secondary-foreground">
            <Search className="h-5 w-5" />
          </span>
        }
      />

      <div className="px-4 pb-1">
        <PillTabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      <div className="space-y-4 px-4 pt-2">
        {events.isLoading && <CardSkeleton count={3} height="h-40" />}
        {!events.isLoading && rows.length === 0 && (
          <EmptyState
            title="No events yet"
            description="Church events and gatherings will show up here."
          />
        )}

        {featured && (
          <article className="nuru-card relative overflow-hidden">
            <div className="relative h-44">
              <img
                src={featured.cover_url ? resolveMedia(featured.cover_url) : heroBg}
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
                <CalendarDays className="h-3.5 w-3.5 text-cyan" />
                {eventDate(featured.starts_at)}
              </p>
              {featured.location && (
                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-cyan" />
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
            return (
              <article key={e.id} className="nuru-card flex items-center gap-3 p-3">
                <img
                  src={e.cover_url ? resolveMedia(e.cover_url) : heroBg}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{e.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {eventDate(e.starts_at)}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {e.is_online ? "Online" : (e.location ?? e.host ?? "In person")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void rsvp(e.id, isGoing)}
                  className={cn(
                    "shrink-0 rounded-lg px-3.5 py-2 text-[11px] font-semibold",
                    isGoing
                      ? "border border-border-strong bg-surface-2 text-secondary-foreground"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  {isGoing ? "Going" : "Join"}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
