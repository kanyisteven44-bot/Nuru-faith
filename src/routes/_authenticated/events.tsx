import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, MapPin } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { resolveMedia } from "@/lib/media";
import { eventDate } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { fetchEvents, fetchMyEventIds, toggleAttendance } from "@/services/content";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import {
  CardSkeleton,
  Chip,
  EmptyState,
  GhostButton,
  GradientButton,
  PillTabs,
} from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({
    meta: [
      { title: "Events — Nuru Faith" },
      {
        name: "description",
        content: "Youth services, conferences, worship nights and outreach near you.",
      },
      { property: "og:title", content: "Events — Nuru Faith" },
      { property: "og:description", content: "Christian events and gatherings near you." },
    ],
  }),
  component: EventsScreen,
});

const FILTERS = ["All", "Upcoming", "Nearby", "Online"] as const;
type Filter = (typeof FILTERS)[number];

function EventsScreen() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("All");
  const events = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const mine = useQuery({
    queryKey: ["my-events", userId],
    queryFn: () => fetchMyEventIds(userId!),
    enabled: !!userId,
  });

  const visible = useMemo(() => {
    const now = Date.now();
    return (events.data ?? []).filter((e) => {
      if (filter === "Upcoming") return new Date(e.starts_at).getTime() >= now;
      if (filter === "Online") return e.is_online;
      if (filter === "Nearby") return !e.is_online && !!e.location;
      return true;
    });
  }, [events.data, filter]);

  async function rsvp(eventId: string, going: boolean) {
    if (!userId) return;
    try {
      await toggleAttendance(userId, eventId, going);
      await queryClient.invalidateQueries({ queryKey: ["my-events", userId] });
      toast.success(going ? "RSVP cancelled" : "You're going!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update your RSVP");
    }
  }

  return (
    <AppShell>
      <ScreenHeader title="Events" subtitle="Show up, belong, serve" />

      <div className="px-4 py-3">
        <PillTabs tabs={FILTERS} value={filter} onChange={setFilter} />
      </div>

      <div className="space-y-3 px-4 pb-3">
        {events.isLoading && <CardSkeleton count={3} height="h-48" />}
        {!events.isLoading && visible.length === 0 && (
          <EmptyState
            title="Nothing scheduled"
            description="Churches will post upcoming gatherings here."
          />
        )}
        {visible.map((e, i) => {
          const going = (mine.data ?? []).includes(e.id);
          const featured = i === 0 && filter === "All";
          return (
            <article
              key={e.id}
              className={cn("overflow-hidden", featured ? "nuru-card-hero" : "nuru-card")}
            >
              <img
                src={resolveMedia(e.cover_url)}
                alt=""
                width={1024}
                height={480}
                loading="lazy"
                className="h-36 w-full object-cover"
              />
              <div className="p-4">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-base font-semibold">{e.title}</h3>
                    {e.churches?.name && <p className="text-[11px] text-cyan">{e.churches.name}</p>}
                  </div>
                  {e.is_online && <Chip tone="brand">Online</Chip>}
                </div>
                {e.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-secondary-foreground">
                    {e.description}
                  </p>
                )}
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" /> {eventDate(e.starts_at)}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {e.location ?? "Online"}
                  </p>
                </div>
                <div className="mt-3">
                  {going ? (
                    <GhostButton className="w-full" onClick={() => rsvp(e.id, true)}>
                      You're going · Cancel
                    </GhostButton>
                  ) : (
                    <GradientButton className="w-full" onClick={() => rsvp(e.id, false)}>
                      I'll be there
                    </GradientButton>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
