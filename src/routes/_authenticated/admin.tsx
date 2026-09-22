import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BellRing,
  CalendarDays,
  ExternalLink,
  Flag,
  LayoutDashboard,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { eventDate, timeAgo } from "@/lib/format";
import {
  fetchChurches,
  fetchEvents,
  fetchGroups,
  fetchMentors,
  fetchModerationQueue,
  fetchMyRoles,
  fetchServeOpportunities,
  updateModerationStatus,
  type ModerationItem,
} from "@/services/content";
import {
  CardSkeleton,
  ComingSoon,
  EmptyState,
  SectionHeader,
} from "@/components/nuru/Primitives";
import { NuruLogo } from "@/components/nuru/Logo";
import { fetchPilotMetrics } from "@/services/pilot";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Church admin — Nuru Faith" },
      {
        name: "description",
        content: "Manage your church community, events, groups and members on Nuru Faith.",
      },
      { property: "og:title", content: "Church admin — Nuru Faith" },
      { property: "og:description", content: "Manage your church community on Nuru Faith." },
    ],
  }),
  component: AdminScreen,
});

function AdminScreen() {
  const { userId } = useAuth();
  const qc = useQueryClient();

  const roles = useQuery({
    queryKey: ["roles", userId],
    queryFn: () => fetchMyRoles(userId!),
    enabled: !!userId,
  });

  const isSuper = (roles.data ?? []).some((r) => r.role === "super_admin");
  const isModerator = (roles.data ?? []).some((r) => r.role === "moderator");
  const isChurchAdmin = (roles.data ?? []).some((r) => r.role === "church_admin");
  const isAdmin = isSuper || isModerator || isChurchAdmin;

  const churches = useQuery({ queryKey: ["churches"], queryFn: () => fetchChurches() });
  const events = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const groups = useQuery({ queryKey: ["groups"], queryFn: () => fetchGroups() });
  const mentors = useQuery({ queryKey: ["mentors"], queryFn: fetchMentors });
  const serve = useQuery({ queryKey: ["serve"], queryFn: fetchServeOpportunities });
  const moderation = useQuery({
    queryKey: ["moderation-queue", userId],
    queryFn: fetchModerationQueue,
    enabled: !!userId && isAdmin,
  });

  const pilot = useQuery({
    queryKey: ["pilot-metrics"],
    queryFn: fetchPilotMetrics,
    enabled: !!userId && (isSuper || isModerator),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  const updateReport = useMutation({
    mutationFn: ({
      item,
      status,
    }: {
      item: ModerationItem;
      status: "reviewing" | "resolved" | "dismissed";
    }) => updateModerationStatus(item.source, item.id, status),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["moderation-queue", userId] });
      toast.success("Moderation status updated");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Couldn't update that report"),
  });

  const myChurchIds = (roles.data ?? []).map((r) => r.church_id).filter(Boolean);
  const scoped = isSuper || isModerator
    ? (churches.data ?? [])
    : (churches.data ?? []).filter((c) => myChurchIds.includes(c.id));

  if (roles.isLoading) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <CardSkeleton count={3} height="h-24" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md items-center px-6">
        <EmptyState
          title="Admin access only"
          description="This dashboard is for church admins and Nuru moderation staff."
          action={
            <Link to="/home" className="mt-2 text-sm font-semibold text-cyan">
              Back to Nuru Faith
            </Link>
          }
        />
      </div>
    );
  }

  const openReports = (moderation.data ?? []).filter(
    (item) => item.status === "open" || item.status === "pending" || item.status === "reviewing",
  );

  const roleLabel = isSuper ? "Super admin" : isModerator ? "Moderator" : "Church admin";
  const pilotMetrics = pilot.data;
  const onboardingRate =
    pilotMetrics?.profiles && pilotMetrics.profiles > 0
      ? Math.round((pilotMetrics.onboarded / pilotMetrics.profiles) * 100)
      : 0;
  const activationRate =
    pilotMetrics?.profiles && pilotMetrics.profiles > 0
      ? Math.round((pilotMetrics.activated_users / pilotMetrics.profiles) * 100)
      : 0;

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface/90 px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <NuruLogo compact />
          <span className="hidden items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs text-cyan sm:flex">
            <ShieldCheck className="h-3.5 w-3.5" /> {roleLabel}
          </span>
        </div>
        <Link to="/home" className="text-sm font-medium text-cyan">
          Back to app
        </Link>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        <div>
          <h1 className="font-display text-2xl font-semibold">Nuru operations dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage community activity, gatherings and reports within your authorized scope.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Churches" value={scoped.length} icon={LayoutDashboard} />
          <Metric label="Groups" value={groups.data?.length ?? 0} icon={Users} />
          <Metric label="Upcoming events" value={events.data?.length ?? 0} icon={CalendarDays} />
          <Metric label="Open reports" value={openReports.length} icon={Flag} />
        </div>

        {(isSuper || isModerator) && (
          <section>
            <SectionHeader title="Pilot health" />
            {pilot.isLoading ? (
              <CardSkeleton count={4} height="h-20" />
            ) : pilot.isError || !pilotMetrics ? (
              <div className="nuru-card p-4">
                <p className="text-sm font-semibold">Pilot metrics unavailable</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  The app is still usable; refresh this dashboard after the next activity heartbeat.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Metric label="Members" value={pilotMetrics.profiles} icon={Users} />
                  <Metric label="Active today" value={pilotMetrics.active_today} icon={Activity} />
                  <Metric label="7-day active" value={pilotMetrics.active_7d} icon={UserCheck} />
                  <Metric label="Push enabled" value={pilotMetrics.push_enabled_users} icon={BellRing} />
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="nuru-card p-4">
                    <p className="text-xs font-medium text-muted-foreground">Onboarding completion</p>
                    <p className="mt-1 font-display text-2xl font-semibold">{onboardingRate}%</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {pilotMetrics.onboarded} of {pilotMetrics.profiles} profiles onboarded
                    </p>
                  </div>
                  <div className="nuru-card p-4">
                    <p className="text-xs font-medium text-muted-foreground">Core activation</p>
                    <p className="mt-1 font-display text-2xl font-semibold">{activationRate}%</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      A user counts as activated after a Reel view, follow, post or mentorship request.
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground md:grid-cols-4">
                  <span>Reel viewers: {pilotMetrics.reel_viewers}</span>
                  <span>Following: {pilotMetrics.following_users}</span>
                  <span>Post authors: {pilotMetrics.post_authors}</span>
                  <span>Mentorship: {pilotMetrics.mentorship_requesters}</span>
                </div>
              </>
            )}
          </section>
        )}

        <section>
          <SectionHeader title="Your churches" />
          <div className="grid gap-3 md:grid-cols-2">
            {scoped.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No church is linked to your current administrative scope.
              </p>
            )}
            {scoped.map((c) => (
              <article key={c.id} className="nuru-card p-4">
                <p className="text-sm font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[c.denomination, c.city].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-2 text-[11px] text-cyan">
                  {c.verified ? "Verified" : "Pending verification"}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="Moderation queue" />
          {moderation.isLoading ? (
            <CardSkeleton count={3} height="h-24" />
          ) : moderation.isError ? (
            <p className="text-sm text-destructive">
              The moderation queue couldn't be loaded for this account.
            </p>
          ) : openReports.length === 0 ? (
            <div className="nuru-card p-5">
              <p className="text-sm font-semibold">No open reports</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Reports you are authorized to review will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {openReports.slice(0, 20).map((item) => (
                <article key={`${item.source}:${item.id}`} className="nuru-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{item.reason}</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {item.target}
                      </p>
                    </div>
                    <span className="rounded-full border border-border-strong bg-surface-2 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan">
                      {item.status}
                    </span>
                  </div>

                  {item.details && (
                    <p className="mt-3 text-[12px] leading-relaxed text-secondary-foreground">
                      {item.details}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="mr-auto text-[10px] text-muted-foreground">
                      {timeAgo(item.created_at)}
                    </span>
                    {item.source_url && (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-border-strong px-2.5 text-[11px] font-semibold text-secondary-foreground"
                      >
                        Source <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={updateReport.isPending}
                      onClick={() => updateReport.mutate({ item, status: "reviewing" })}
                      className="min-h-8 rounded-lg border border-border-strong px-2.5 text-[11px] font-semibold text-secondary-foreground disabled:opacity-50"
                    >
                      Review
                    </button>
                    <button
                      type="button"
                      disabled={updateReport.isPending}
                      onClick={() => updateReport.mutate({ item, status: "dismissed" })}
                      className="min-h-8 rounded-lg border border-border-strong px-2.5 text-[11px] font-semibold text-secondary-foreground disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      disabled={updateReport.isPending}
                      onClick={() => updateReport.mutate({ item, status: "resolved" })}
                      className="min-h-8 rounded-lg bg-primary px-2.5 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      Resolve
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionHeader title="Upcoming events" />
          <div className="space-y-2">
            {(events.data ?? []).slice(0, 6).map((e) => (
              <div key={e.id} className="nuru-card flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{eventDate(e.starts_at)}</p>
                </div>
                <span className="text-[11px] text-cyan">{e.churches?.name}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="Serve opportunities" />
          <div className="grid gap-2 md:grid-cols-2">
            {(serve.data ?? []).map((s) => (
              <div key={s.id} className="nuru-card p-4">
                <p className="text-sm font-semibold">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.category}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          <Panel title="Publish content" icon={LayoutDashboard} />
          <Panel title="Member management" icon={Users} />
        </section>

        <p className="text-[11px] text-muted-foreground">
          Mentors in scope: {mentors.data?.length ?? 0}. Administrative actions are still enforced
          by Supabase row-level security; hiding a control in this dashboard is not treated as an
          authorization boundary.
        </p>
      </main>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: typeof Users;
}) {
  return (
    <div className="nuru-card p-4">
      <Icon className="h-4 w-4 text-cyan" />
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Panel({ title, icon: Icon }: { title: string; icon: typeof Users }) {
  return (
    <div className="nuru-card flex items-center gap-3 p-4">
      <Icon className="h-4 w-4 text-cyan" />
      <span className="flex-1 text-sm font-semibold">{title}</span>
      <ComingSoon label="Soon" />
    </div>
  );
}
