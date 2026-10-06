import { AdminDirectory } from "@/components/nuru/AdminDirectory";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  BellRing,
  CalendarDays,
  Church,
  Clock,
  ExternalLink,
  Flag,
  HandHeart,
  MapPin,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { eventDate, greeting, timeAgo } from "@/lib/format";
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
  Chip,
  EmptyState,
  ErrorState,
  IconTile,
  SectionHeader,
} from "@/components/nuru/Primitives";
import { NuruLogo } from "@/components/nuru/Logo";
import { MusicCatalogImport } from "@/components/youtube/MusicCatalogImport";
import { getPilotMetrics } from "@/lib/pilot.functions";
import { AdminOperations } from "@/components/nuru/AdminOperations";

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

type Tone = "brand" | "cyan" | "violet" | "growth" | "warning";
type ChurchRecord = Awaited<ReturnType<typeof fetchChurches>>[number];
type ServeRecord = Awaited<ReturnType<typeof fetchServeOpportunities>>[number];
type EventRecord = Awaited<ReturnType<typeof fetchEvents>>[number];

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
    queryFn: () => getPilotMetrics(),
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
  const scoped =
    isSuper || isModerator
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
            <Link to="/home" className="mt-2 text-sm font-semibold text-leaf">
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
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface/90 px-4 py-4 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <NuruLogo compact />
          <span className="hidden items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-leaf ring-1 ring-inset ring-primary/25 sm:flex">
            <ShieldCheck className="h-3.5 w-3.5" /> {roleLabel}
          </span>
        </div>
        <Link
          to="/home"
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-leaf transition-colors hover:bg-surface-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to app
        </Link>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10">
        <section className="nuru-card-hero relative overflow-hidden p-6 sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl"
          />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sand">
              {greeting()}
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-white sm:text-3xl">
              Nuru operations dashboard
            </h1>
            <p className="mt-1.5 max-w-md text-sm text-white/70">
              Manage community activity, gatherings and reports within your authorized scope.
            </p>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Churches" value={scoped.length} icon={Church} tone="brand" />
          <Metric label="Groups" value={groups.data?.length ?? 0} icon={Users} tone="violet" />
          <Metric
            label="Upcoming events"
            value={events.data?.length ?? 0}
            icon={CalendarDays}
            tone="cyan"
          />
          <Metric label="Open reports" value={openReports.length} icon={Flag} tone="warning" />
        </div>

        {(isSuper || isModerator) && (
          <section>
            <SectionHeader title="Pilot health" eyebrow="Growth" />
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
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Metric label="Members" value={pilotMetrics.profiles} icon={Users} tone="brand" />
                  <Metric
                    label="Active today"
                    value={pilotMetrics.active_today}
                    icon={Activity}
                    tone="growth"
                  />
                  <Metric
                    label="7-day active"
                    value={pilotMetrics.active_7d}
                    icon={UserCheck}
                    tone="cyan"
                  />
                  <Metric
                    label="Push enabled"
                    value={pilotMetrics.push_enabled_users}
                    icon={BellRing}
                    tone="violet"
                  />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="nuru-card p-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      Onboarding completion
                    </p>
                    <p className="mt-1 font-display text-2xl font-semibold">{onboardingRate}%</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {pilotMetrics.onboarded} of {pilotMetrics.profiles} profiles onboarded
                    </p>
                  </div>
                  <div className="nuru-card p-4">
                    <p className="text-xs font-medium text-muted-foreground">Core activation</p>
                    <p className="mt-1 font-display text-2xl font-semibold">{activationRate}%</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      A user counts as activated after a Reel view, follow, post or mentorship
                      request.
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground sm:grid-cols-4">
                  <span>Reel viewers: {pilotMetrics.reel_viewers}</span>
                  <span>Following: {pilotMetrics.following_users}</span>
                  <span>Post authors: {pilotMetrics.post_authors}</span>
                  <span>Mentorship: {pilotMetrics.mentorship_requesters}</span>
                </div>
              </>
            )}
          </section>
        )}

        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-8">
            <section>
              <SectionHeader title="Your churches" eyebrow="Community" />
              {churches.isLoading && <CardSkeleton count={2} height="h-20" />}
              {churches.isError && <ErrorState onRetry={() => churches.refetch()} />}
              {!churches.isLoading && !churches.isError && scoped.length === 0 && (
                <EmptyState
                  title="No church linked yet"
                  description="No church is linked to your current administrative scope."
                />
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {scoped.slice(0, 12).map((c) => (
                  <ChurchCard key={c.id} church={c} />
                ))}
              </div>
            </section>

            <section>
              <SectionHeader
                title="Moderation queue"
                eyebrow="Reports"
                {...(openReports.length ? { action: `${openReports.length} open` } : {})}
              />
              {moderation.isLoading ? (
                <CardSkeleton count={3} height="h-24" />
              ) : moderation.isError ? (
                <ErrorState
                  message="The moderation queue couldn't be loaded for this account."
                  onRetry={() => moderation.refetch()}
                />
              ) : openReports.length === 0 ? (
                <EmptyState
                  title="No open reports"
                  description="Reports you are authorized to review will appear here."
                />
              ) : (
                <div className="space-y-3">
                  {openReports.slice(0, 20).map((item) => (
                    <ModerationCard
                      key={`${item.source}:${item.id}`}
                      item={item}
                      busy={updateReport.isPending}
                      onAction={(status) => updateReport.mutate({ item, status })}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-8">
            <section>
              <SectionHeader title="Upcoming events" eyebrow="Schedule" />
              {events.isLoading && <CardSkeleton count={3} height="h-16" />}
              {events.isError && <ErrorState onRetry={() => events.refetch()} />}
              {!events.isLoading && !events.isError && (events.data ?? []).length === 0 && (
                <EmptyState
                  title="Nothing scheduled"
                  description="Events your churches create will appear here."
                />
              )}
              <div className="space-y-2">
                {(events.data ?? []).slice(0, 6).map((e) => (
                  <EventRow key={e.id} event={e} />
                ))}
              </div>
            </section>

            <section>
              <SectionHeader
                title="Serve opportunities"
                eyebrow="Ministry"
                {...(serve.data?.length ? { action: `${serve.data.length} open` } : {})}
              />
              {serve.isLoading && <CardSkeleton count={2} height="h-20" />}
              {serve.isError && <ErrorState onRetry={() => serve.refetch()} />}
              {!serve.isLoading && !serve.isError && (serve.data ?? []).length === 0 && (
                <EmptyState
                  title="No roles posted"
                  description="Serve opportunities your churches post will show up here."
                />
              )}
              <div className="space-y-2">
                {(serve.data ?? []).map((s) => (
                  <ServeCard key={s.id} role={s} />
                ))}
              </div>
            </section>

            <section>
              <SectionHeader title="Learning library" eyebrow="Resources" />
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/faith-courses"
                  className="nuru-card p-3.5 text-center text-sm font-semibold transition-colors hover:border-border-strong"
                >
                  Courses & studies
                </Link>
                <Link
                  to="/devotionals"
                  className="nuru-card p-3.5 text-center text-sm font-semibold transition-colors hover:border-border-strong"
                >
                  Devotional library
                </Link>
                <Link
                  to="/series"
                  className="nuru-card col-span-2 p-3.5 text-center text-sm font-semibold transition-colors hover:border-border-strong"
                >
                  Scripture series
                </Link>
              </div>
            </section>

            {!isSuper && (
              <p className="text-xs text-muted-foreground">
                Mentors available: {mentors.data?.length ?? 0}
              </p>
            )}
          </div>
        </div>

        {(isSuper || isModerator) && (
          <div className="space-y-8 border-t border-border pt-8 sm:pt-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sand">
              Advanced tools
            </p>
            {isSuper && <AdminOperations churches={churches.data ?? []} />}
            {isSuper && userId && <AdminDirectory userId={userId} churches={churches.data ?? []} />}
            {(isSuper || isModerator) && <MusicCatalogImport />}
          </div>
        )}
      </main>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: typeof Users;
  tone: Tone;
}) {
  return (
    <div className="nuru-card p-4 transition-colors hover:border-border-strong">
      <IconTile icon={icon} tone={tone} filled size="sm" />
      <p className="mt-3 font-display text-2xl font-semibold sm:text-3xl">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ChurchCard({ church }: { church: ChurchRecord }) {
  const verified = church.verified;
  return (
    <article className="nuru-card flex items-start gap-3 p-4">
      <IconTile icon={Church} tone="brand" className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{church.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[church.denomination, church.city].filter(Boolean).join(" · ") || "No details yet"}
        </p>
        <span
          className={cn(
            "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
            verified ? "bg-growth/15 text-growth" : "bg-warning/10 text-warning",
          )}
        >
          {verified ? <ShieldCheck className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
          {verified ? "Verified" : "Pending verification"}
        </span>
      </div>
    </article>
  );
}

function ServeCard({ role }: { role: ServeRecord }) {
  return (
    <div className="nuru-card p-4">
      <div className="flex items-start gap-3">
        <IconTile icon={HandHeart} tone="growth" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{role.title}</p>
          {role.churches?.name && <p className="text-[11px] text-leaf">{role.churches.name}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {role.category && <Chip tone="brand">{role.category}</Chip>}
          </div>
          {role.location && (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3" /> {role.location}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function EventRow({ event }: { event: EventRecord }) {
  const date = new Date(event.starts_at);
  const day = date.toLocaleDateString(undefined, { day: "numeric" });
  const month = date.toLocaleDateString(undefined, { month: "short" }).toUpperCase();
  return (
    <div className="nuru-card flex items-center gap-3 p-3">
      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-border bg-surface-2">
        <span className="text-[9px] font-bold tracking-wide text-leaf">{month}</span>
        <span className="font-display text-base font-bold leading-none">{day}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{event.title}</p>
        <p className="truncate text-[11px] text-muted-foreground">{eventDate(event.starts_at)}</p>
      </div>
      {event.churches?.name && (
        <span className="shrink-0 text-[11px] text-leaf">{event.churches.name}</span>
      )}
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  open: "bg-warning/15 text-warning",
  pending: "bg-warning/15 text-warning",
  reviewing: "bg-primary/18 text-leaf",
  resolved: "bg-growth/15 text-growth",
  dismissed: "bg-surface-2 text-muted-foreground",
};

function ModerationCard({
  item,
  busy,
  onAction,
}: {
  item: ModerationItem;
  busy: boolean;
  onAction: (status: "reviewing" | "resolved" | "dismissed") => void;
}) {
  return (
    <article className="nuru-card p-4">
      <div className="flex items-start gap-3">
        <IconTile icon={Flag} tone="warning" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{item.reason}</p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.target}</p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase",
                STATUS_TONE[item.status] ?? "bg-surface-2 text-muted-foreground",
              )}
            >
              {item.status}
            </span>
          </div>

          {item.details && (
            <p className="mt-2 text-[12px] leading-relaxed text-secondary-foreground">
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
              disabled={busy}
              onClick={() => onAction("reviewing")}
              className="min-h-8 rounded-lg border border-border-strong px-2.5 text-[11px] font-semibold text-secondary-foreground disabled:opacity-50"
            >
              Review
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onAction("dismissed")}
              className="min-h-8 rounded-lg border border-border-strong px-2.5 text-[11px] font-semibold text-secondary-foreground disabled:opacity-50"
            >
              Dismiss
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onAction("resolved")}
              className="min-h-8 rounded-lg bg-primary px-2.5 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
            >
              Resolve
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
