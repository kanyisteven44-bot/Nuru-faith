import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, MapPin } from "lucide-react";
import { toast } from "sonner";
import { resolveMedia } from "@/lib/media";
import { eventDate } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchChurches,
  fetchEvents,
  fetchMyChurchIds,
  fetchProfile,
  joinChurch,
  leaveChurch,
  updateProfile,
} from "@/services/content";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import {
  CardSkeleton,
  Chip,
  GhostButton,
  GradientButton,
  SectionHeader,
} from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/church")({
  head: () => ({
    meta: [
      { title: "My Church — Nuru Faith" },
      {
        name: "description",
        content: "Your church home: announcements, services, liturgy and upcoming events.",
      },
      { property: "og:title", content: "My Church — Nuru Faith" },
      { property: "og:description", content: "Your church home inside Nuru Faith." },
    ],
  }),
  component: ChurchScreen,
});

function ChurchScreen() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
  const churches = useQuery({ queryKey: ["churches"], queryFn: () => fetchChurches() });
  const joined = useQuery({
    queryKey: ["my-churches", userId],
    queryFn: () => fetchMyChurchIds(userId!),
    enabled: !!userId,
  });
  const events = useQuery({ queryKey: ["events"], queryFn: fetchEvents });

  const home = profile.data?.churches ?? null;
  const churchEvents = (events.data ?? [])
    .filter((e) => home && e.church_id === home.id)
    .slice(0, 4);

  async function setHome(churchId: string) {
    if (!userId) return;
    try {
      await updateProfile(userId, { church_id: churchId });
      await joinChurch(userId, churchId);
      await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      await queryClient.invalidateQueries({ queryKey: ["my-churches", userId] });
      toast.success("Church saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not join");
    }
  }

  async function leave(churchId: string) {
    if (!userId) return;
    await leaveChurch(userId, churchId);
    await updateProfile(userId, { church_id: null });
    await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    await queryClient.invalidateQueries({ queryKey: ["my-churches", userId] });
    toast.success("You've left this church");
  }

  return (
    <AppShell>
      <ScreenHeader title="My Church" subtitle="Your local family" />

      {profile.isLoading && (
        <div className="p-4">
          <CardSkeleton count={2} height="h-40" />
        </div>
      )}

      {home ? (
        <>
          <article className="relative mx-4 mt-3 overflow-hidden rounded-3xl">
            <img
              src={resolveMedia(home.cover_url)}
              alt=""
              width={1024}
              height={480}
              className="h-44 w-full object-cover"
            />
            <div className="absolute inset-0 nuru-veil" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <h2 className="flex items-center gap-1.5 font-display text-lg font-semibold">
                {home.name} {home.verified && <BadgeCheck className="h-4 w-4 text-cyan" />}
              </h2>
              <p className="flex items-center gap-1.5 text-xs text-secondary-foreground">
                <MapPin className="h-3.5 w-3.5" />{" "}
                {[home.denomination, home.city].filter(Boolean).join(" · ")}
              </p>
            </div>
          </article>

          <div className="flex gap-2 px-4 pt-3">
            <GhostButton className="flex-1" onClick={() => leave(home.id)}>
              Leave church
            </GhostButton>
            <Link
              to="/serve"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground nuru-glow-sm"
            >
              Serve here
            </Link>
          </div>

          <section className="px-4 pt-6">
            <SectionHeader title="Upcoming at your church" action="All events" to="/events" />
            <div className="space-y-2">
              {churchEvents.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No events posted yet — check back soon.
                </p>
              )}
              {churchEvents.map((e) => (
                <Link key={e.id} to="/events" className="nuru-card flex items-center gap-3 p-3">
                  <img
                    src={resolveMedia(e.cover_url)}
                    alt=""
                    width={128}
                    height={128}
                    loading="lazy"
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{e.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {eventDate(e.starts_at)}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="px-4 pt-6">
            <SectionHeader title="Liturgy & teachings" action="Coming soon" />
            <p className="text-xs text-muted-foreground">
              Weekly liturgy, orders of service and sermon archives will appear here once your
              church uploads them.
            </p>
          </section>
        </>
      ) : (
        <section className="px-4 pt-3">
          <SectionHeader title="Choose your church" />
          <div className="space-y-2">
            {churches.isLoading && <CardSkeleton count={4} height="h-20" />}
            {(churches.data ?? []).map((c) => (
              <div key={c.id} className="nuru-card flex items-center gap-3 p-4">
                <img
                  src={resolveMedia(c.logo_url ?? c.cover_url)}
                  alt=""
                  width={96}
                  height={96}
                  loading="lazy"
                  className="h-12 w-12 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[c.denomination, c.city].filter(Boolean).join(" · ")}
                  </p>
                  {c.verified && <Chip tone="growth">Verified</Chip>}
                </div>
                <GradientButton onClick={() => setHome(c.id)}>
                  {(joined.data ?? []).includes(c.id) ? "Set as home" : "Join"}
                </GradientButton>
              </div>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
