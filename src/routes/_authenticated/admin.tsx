import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Church,
  Clock3,
  ExternalLink,
  Flag,
  LayoutDashboard,
  Music2,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserRoundCheck,
  UserRoundCog,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
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
import { CardSkeleton, EmptyState, SectionHeader } from "@/components/nuru/Primitives";
import { NuruLogo } from "@/components/nuru/Logo";
import { MusicCatalogImport } from "@/components/youtube/MusicCatalogImport";
import { getPilotMetrics } from "@/lib/pilot.functions";
import { AdminOperations } from "@/components/nuru/AdminOperations";

const ADMIN_SECTION_IDS = ["overview", "people", "content", "moderation", "community"] as const;
type AdminSection = (typeof ADMIN_SECTION_IDS)[number];

const adminSearchSchema = z.object({
  section: z.enum(ADMIN_SECTION_IDS).optional(),
});

export const Route = createFileRoute("/_authenticated/admin")({
  validateSearch: adminSearchSchema,
  head: () => ({
    meta: [
      { title: "Nuru Admin — Nuru Faith" },
      {
        name: "description",
        content: "Manage people, content, churches, moderation and community operations on Nuru Faith.",
      },
      { property: "og:title", content: "Nuru Admin — Nuru Faith" },
      {
        property: "og:description",
        content: "Manage people, content, churches and moderation on Nuru Faith.",
      },
    ],
  }),
  component: AdminScreen,
});


const ADMIN_SECTIONS: {
  id: AdminSection;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
}[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Health, activity and priorities",
    icon: LayoutDashboard,
  },
  {
    id: "people",
    label: "People & access",
    description: "Members, mentors and churches",
    icon: UserRoundCog,
  },
  {
    id: "content",
    label: "Content & music",
    description: "Learning library and catalogue",
    icon: Music2,
  },
  {
    id: "moderation",
    label: "Moderation",
    description: "Reports and review queue",
    icon: Flag,
  },
  {
    id: "community",
    label: "Churches & community",
    description: "Events, groups and serving",
    icon: Church,
  },
];

function AdminScreen() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const searchParams = Route.useSearch();
  const activeSection: AdminSection = searchParams.section ?? "overview";
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const [moderationFilter, setModerationFilter] = useState<
    "active" | "reviewing" | "resolved" | "dismissed" | "all"
  >("active");
  const [moderationSearch, setModerationSearch] = useState("");
  const [communitySearch, setCommunitySearch] = useState("");
  const [communityPage, setCommunityPage] = useState(0);

  function setActiveSection(section: AdminSection) {
    void navigate({ to: "/admin", search: { section }, replace: true });
  }

  async function refreshAdminData() {
    setIsRefreshing(true);
    try {
      await qc.refetchQueries({ type: "active" });
      setLastRefreshAt(new Date());
      toast.success("Admin data refreshed");
    } catch {
      toast.error("Some admin data could not be refreshed");
    } finally {
      setIsRefreshing(false);
    }
  }

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
      <div className="mx-auto max-w-7xl p-6">
        <CardSkeleton count={4} height="h-24" />
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
  const reviewingReports = openReports.filter((item) => item.status === "reviewing");
  const unverifiedMentors = (mentors.data ?? []).filter((mentor) => !mentor.verified);
  const verifiedChurches = scoped.filter((church) => church.verified);
  const directoryVerificationRate = scoped.length
    ? Math.round((verifiedChurches.length / scoped.length) * 100)
    : 0;
  const attentionCount = openReports.length + unverifiedMentors.length;

  const normalizedModerationSearch = moderationSearch.trim().toLowerCase();
  const filteredModeration = (moderation.data ?? []).filter((item) => {
    const statusMatch =
      moderationFilter === "all"
        ? true
        : moderationFilter === "active"
          ? ["open", "pending", "reviewing"].includes(item.status)
          : item.status === moderationFilter;
    if (!statusMatch) return false;
    if (!normalizedModerationSearch) return true;
    return `${item.reason} ${item.target} ${item.details ?? ""} ${item.source}`
      .toLowerCase()
      .includes(normalizedModerationSearch);
  });

  const normalizedChurchSearch = communitySearch.trim().toLowerCase();
  const filteredChurches = scoped.filter((church) =>
    !normalizedChurchSearch
      ? true
      : `${church.name} ${church.denomination ?? ""} ${church.city ?? ""} ${church.region ?? ""}`
          .toLowerCase()
          .includes(normalizedChurchSearch),
  );
  const churchesPerPage = 12;
  const communityPageCount = Math.max(1, Math.ceil(filteredChurches.length / churchesPerPage));
  const safeCommunityPage = Math.min(communityPage, communityPageCount - 1);
  const visibleChurches = filteredChurches.slice(
    safeCommunityPage * churchesPerPage,
    safeCommunityPage * churchesPerPage + churchesPerPage,
  );

  const healthChecks = [
    { label: "Directory", error: churches.isError, loading: churches.isLoading },
    {
      label: "Community",
      error: groups.isError || events.isError || serve.isError,
      loading: groups.isLoading || events.isLoading || serve.isLoading,
    },
    { label: "Moderation", error: moderation.isError, loading: moderation.isLoading },
    ...(isSuper || isModerator
      ? [{ label: "Pilot metrics", error: pilot.isError, loading: pilot.isLoading }]
      : []),
  ];
  const healthIssues = healthChecks.filter((check) => check.error).length;
  const healthLoading = healthChecks.some((check) => check.loading);
  const sectionBadges: Partial<Record<AdminSection, number>> = {
    overview: attentionCount,
    people: unverifiedMentors.length,
    moderation: openReports.length,
  };

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
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <NuruLogo compact />
            <div className="hidden h-7 w-px bg-border sm:block" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">Nuru Admin</p>
              <p className="hidden text-[11px] text-muted-foreground sm:block">
                Community operations centre
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-leaf/20 bg-leaf/10 px-3 py-1.5 text-[11px] font-semibold text-leaf sm:flex">
              <ShieldCheck className="h-3.5 w-3.5" />
              {roleLabel}
            </span>
            <button
              type="button"
              onClick={() => void refreshAdminData()}
              disabled={isRefreshing}
              className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-muted-foreground transition hover:border-border-strong hover:text-foreground disabled:opacity-50"
              aria-label="Refresh admin data"
            >
              <RefreshCw className={["h-3.5 w-3.5", isRefreshing ? "animate-spin" : ""].join(" ")} />
              <span className="hidden sm:inline">{isRefreshing ? "Refreshing…" : "Refresh"}</span>
            </button>
            <Link
              to="/settings"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground transition hover:border-border-strong hover:text-foreground"
              aria-label="Admin account settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
            <Link
              to="/home"
              className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-foreground transition hover:border-border-strong"
            >
              Back to app
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <section className="relative overflow-hidden rounded-[28px] border border-border bg-surface p-5 sm:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(72,149,239,0.12),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(89,222,143,0.08),transparent_34%)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface-2/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-leaf">
                <Sparkles className="h-3.5 w-3.5" />
                Operations
              </div>
              <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Nuru operations, organized around what matters.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                See platform health first, handle priority work next, then move into people,
                content, moderation and community tools without losing context.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-[330px]">
              <MiniStat label="Members" value={pilotMetrics?.profiles ?? "—"} />
              <MiniStat label="Attention" value={attentionCount} />
              <MiniStat label="Churches" value={scoped.length} />
            </div>
          </div>
        </section>

        <div className="mt-5 overflow-x-auto pb-1 lg:hidden">
          <nav className="flex min-w-max gap-2" aria-label="Admin sections">
            {ADMIN_SECTIONS.map((section) => {
              const Icon = section.icon;
              const active = activeSection === section.id;
              const badge = sectionBadges[section.id] ?? 0;
              return (
                <button
                  key={section.id}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => setActiveSection(section.id)}
                  className={[
                    "inline-flex min-h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition",
                    active
                      ? "border-leaf/40 bg-leaf/10 text-leaf"
                      : "border-border bg-surface text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                  {badge > 0 && (
                    <span className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <nav
                className="rounded-3xl border border-border bg-surface p-2"
                aria-label="Admin sections"
              >
                {ADMIN_SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const active = activeSection === section.id;
                  const badge = sectionBadges[section.id] ?? 0;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      aria-current={active ? "page" : undefined}
                      onClick={() => setActiveSection(section.id)}
                      className={[
                        "group flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition",
                        active
                          ? "bg-leaf/10 text-foreground"
                          : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                          active
                            ? "border-leaf/30 bg-leaf/10 text-leaf"
                            : "border-border bg-background/40 text-muted-foreground group-hover:text-foreground",
                        ].join(" ")}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          {section.label}
                          {badge > 0 && (
                            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                              {badge > 99 ? "99+" : badge}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                          {section.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </nav>

              <div className="rounded-3xl border border-border bg-surface p-4">
                <p className="text-xs font-semibold text-foreground">Security status</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-leaf">
                  <ShieldCheck className="h-4 w-4" />
                  Role protected
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  Verification, role changes and sensitive staff actions remain protected by
                  administrative checks.
                </p>
              </div>
            </div>
          </aside>

          <main className="min-w-0">
            {activeSection === "overview" && (
              <div className="space-y-6">
                <SectionIntro
                  eyebrow="Overview"
                  title="What needs your attention"
                  description="Start with the work that can block safety, trust or community growth, then move into the wider platform."
                />

                <section className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex items-start gap-3">
                      <span
                        className={[
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
                          healthIssues
                            ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
                            : "border-leaf/20 bg-leaf/10 text-leaf",
                        ].join(" ")}
                      >
                        {healthIssues ? (
                          <AlertTriangle className="h-5 w-5" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5" />
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">
                          {healthIssues
                            ? healthIssues + " admin data source" + (healthIssues === 1 ? "" : "s") + " need attention"
                            : healthLoading
                              ? "Admin data is syncing"
                              : "Admin data is connected"}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {lastRefreshAt
                            ? "Last manually refreshed at " +
                              lastRefreshAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : "Live data is loaded from Nuru's protected admin sources."}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {healthChecks.map((check) => (
                        <StatusPill
                          key={check.label}
                          label={check.label}
                          state={check.error ? "error" : check.loading ? "loading" : "ok"}
                        />
                      ))}
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-leaf">
                        Priority centre
                      </p>
                      <h3 className="mt-1 font-display text-xl font-semibold">Handle important work first</h3>
                    </div>
                    <span className="rounded-full border border-border bg-surface-2 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                      {attentionCount} item{attentionCount === 1 ? "" : "s"} need attention
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <PriorityCard
                      title="Moderation queue"
                      value={openReports.length}
                      detail={
                        reviewingReports.length
                          ? reviewingReports.length + " already in review"
                          : "No reports are currently being reviewed"
                      }
                      icon={Flag}
                      tone={openReports.length ? "attention" : "calm"}
                      onClick={() => setActiveSection("moderation")}
                    />
                    <PriorityCard
                      title="Mentor review"
                      value={unverifiedMentors.length}
                      detail={
                        unverifiedMentors.length
                          ? "Mentor profiles waiting for verification"
                          : "No mentor profiles are waiting for review"
                      }
                      icon={UserRoundCheck}
                      tone={unverifiedMentors.length ? "attention" : "calm"}
                      onClick={() => setActiveSection("people")}
                    />
                    <PriorityCard
                      title="Directory coverage"
                      value={directoryVerificationRate + "%"}
                      detail={verifiedChurches.length + " of " + scoped.length + " visible churches verified"}
                      icon={Church}
                      tone="calm"
                      onClick={() => setActiveSection("community")}
                    />
                  </div>
                </section>

                <section>
                  <SectionHeader title="At a glance" />
                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                  <Metric label="Churches" value={scoped.length} icon={Church} />
                  <Metric label="Groups" value={groups.data?.length ?? 0} icon={Users} />
                  <Metric label="Upcoming events" value={events.data?.length ?? 0} icon={CalendarDays} />
                  <Metric label="Open reports" value={openReports.length} icon={Flag} />
                  </div>
                </section>

                {(isSuper || isModerator) && (
                  <section className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
                    <SectionHeader title="Pilot health" />
                    {pilot.isLoading ? (
                      <CardSkeleton count={4} height="h-20" />
                    ) : pilot.isError || !pilotMetrics ? (
                      <div className="rounded-2xl border border-border bg-surface-2 p-4">
                        <p className="text-sm font-semibold">Pilot metrics unavailable</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          The app is still usable; refresh this dashboard after the next activity
                          heartbeat.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                          <Metric label="Members" value={pilotMetrics.profiles} icon={Users} />
                          <Metric
                            label="Active today"
                            value={pilotMetrics.active_today}
                            icon={Activity}
                          />
                          <Metric
                            label="7-day active"
                            value={pilotMetrics.active_7d}
                            icon={UserCheck}
                          />
                          <Metric
                            label="Push enabled"
                            value={pilotMetrics.push_enabled_users}
                            icon={BellRing}
                          />
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <ProgressCard
                            label="Onboarding completion"
                            value={onboardingRate}
                            detail={`${pilotMetrics.onboarded} of ${pilotMetrics.profiles} profiles onboarded`}
                          />
                          <ProgressCard
                            label="Core activation"
                            value={activationRate}
                            detail="Reel view, follow, post or mentorship request"
                          />
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                          <TinyMetric label="Reel viewers" value={pilotMetrics.reel_viewers} />
                          <TinyMetric label="Following" value={pilotMetrics.following_users} />
                          <TinyMetric label="Post authors" value={pilotMetrics.post_authors} />
                          <TinyMetric
                            label="Mentorship"
                            value={pilotMetrics.mentorship_requesters}
                          />
                        </div>
                      </>
                    )}
                  </section>
                )}

                <section>
                  <SectionHeader title="Quick actions" />
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <QuickAction
                      title="People & access"
                      detail="Members, mentors and admin operations"
                      icon={UserRoundCog}
                      onClick={() => setActiveSection("people")}
                    />
                    <QuickAction
                      title="Content & music"
                      detail="Courses, devotions, series and music"
                      icon={Music2}
                      onClick={() => setActiveSection("content")}
                    />
                    <QuickAction
                      title="Moderation"
                      detail={`${openReports.length} report${openReports.length === 1 ? "" : "s"} awaiting attention`}
                      icon={Flag}
                      onClick={() => setActiveSection("moderation")}
                    />
                    <QuickAction
                      title="Churches"
                      detail="Listings, events, groups and serving"
                      icon={Church}
                      onClick={() => setActiveSection("community")}
                    />
                  </div>
                </section>
              </div>
            )}

            {activeSection === "people" && (
              <div className="space-y-6">
                <SectionIntro
                  eyebrow="People & access"
                  title="Members, mentors and administration"
                  description="Manage the directory and role-scoped operations without mixing them into the rest of the dashboard."
                />
                {isSuper && userId ? (
                  <>
                    <div className="rounded-3xl border border-border bg-surface p-4 sm:p-6">
                      <AdminDirectory userId={userId} churches={churches.data ?? []} />
                    </div>
                    <div className="rounded-3xl border border-border bg-surface p-4 sm:p-6">
                      <AdminOperations churches={churches.data ?? []} />
                    </div>
                  </>
                ) : (
                  <div className="rounded-3xl border border-border bg-surface p-5">
                    <p className="text-sm font-semibold">Role-scoped access</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Super-admin directory and platform-wide people operations are hidden for this
                      role. Your church-scoped tools remain available in the community workspace.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeSection === "content" && (
              <div className="space-y-6">
                <SectionIntro
                  eyebrow="Content & music"
                  title="Manage what people learn, read and listen to"
                  description="Keep learning content and the music catalogue together in one dedicated workspace."
                />

                {(isSuper || isModerator) && (
                  <div className="rounded-3xl border border-border bg-surface p-4 sm:p-6">
                    <MusicCatalogImport />
                  </div>
                )}

                <section>
                  <SectionHeader title="Learning library" />
                  <div className="grid gap-3 md:grid-cols-3">
                    <LibraryLink
                      to="/faith-courses"
                      title="Courses & studies"
                      detail="Long-form learning and guided study"
                    />
                    <LibraryLink
                      to="/devotionals"
                      title="Devotional library"
                      detail="Daily and topical devotional content"
                    />
                    <LibraryLink
                      to="/series"
                      title="Scripture series"
                      detail="Multi-part Bible teaching journeys"
                    />
                  </div>
                </section>

                <div className="rounded-3xl border border-border bg-surface p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-leaf">
                    Catalogue note
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    Music approvals and learning content now have a dedicated operational home.
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    This keeps high-volume catalogue work away from member management and moderation,
                    making the admin experience easier to scan and safer to operate.
                  </p>
                </div>
              </div>
            )}

            {activeSection === "moderation" && (
              <div className="space-y-6">
                <SectionIntro
                  eyebrow="Moderation"
                  title="Review reports with less noise"
                  description="Open and in-review reports are grouped here so safety work does not get buried inside general operations."
                />

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <Metric label="Open queue" value={openReports.length} icon={Flag} />
                  <Metric
                    label="In review"
                    value={openReports.filter((item) => item.status === "reviewing").length}
                    icon={Activity}
                  />
                  <Metric
                    label="Total loaded"
                    value={moderation.data?.length ?? 0}
                    icon={LayoutDashboard}
                  />
                </div>

                <section className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
                  <SectionHeader title="Moderation queue" />
                  {moderation.isLoading ? (
                    <CardSkeleton count={3} height="h-24" />
                  ) : moderation.isError ? (
                    <p className="text-sm text-destructive">
                      The moderation queue couldn't be loaded for this account.
                    </p>
                  ) : openReports.length === 0 ? (
                    <div className="rounded-2xl border border-border bg-surface-2 p-5">
                      <p className="text-sm font-semibold">No open reports</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Reports you are authorized to review will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {openReports.slice(0, 20).map((item) => (
                        <article
                          key={`${item.source}:${item.id}`}
                          className="rounded-2xl border border-border bg-background/30 p-4 transition hover:border-border-strong"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">{item.reason}</p>
                              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                {item.target}
                              </p>
                            </div>
                            <span className="rounded-full border border-leaf/20 bg-leaf/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-leaf">
                              {item.status}
                            </span>
                          </div>

                          {item.details && (
                            <p className="mt-3 text-[12px] leading-relaxed text-secondary-foreground">
                              {item.details}
                            </p>
                          )}

                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <span className="mr-auto text-[10px] text-muted-foreground">
                              {timeAgo(item.created_at)}
                            </span>
                            {item.source_url && (
                              <a
                                href={item.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-border-strong px-3 text-[11px] font-semibold text-secondary-foreground"
                              >
                                Source <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            <button
                              type="button"
                              disabled={updateReport.isPending}
                              onClick={() =>
                                updateReport.mutate({ item, status: "reviewing" })
                              }
                              className="min-h-9 rounded-xl border border-border-strong px-3 text-[11px] font-semibold text-secondary-foreground disabled:opacity-50"
                            >
                              Review
                            </button>
                            <button
                              type="button"
                              disabled={updateReport.isPending}
                              onClick={() =>
                                updateReport.mutate({ item, status: "dismissed" })
                              }
                              className="min-h-9 rounded-xl border border-border-strong px-3 text-[11px] font-semibold text-secondary-foreground disabled:opacity-50"
                            >
                              Dismiss
                            </button>
                            <button
                              type="button"
                              disabled={updateReport.isPending}
                              onClick={() =>
                                updateReport.mutate({ item, status: "resolved" })
                              }
                              className="min-h-9 rounded-xl bg-primary px-3 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
                            >
                              Resolve
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {activeSection === "community" && (
              <div className="space-y-6">
                <SectionIntro
                  eyebrow="Churches & community"
                  title="Manage local community activity"
                  description="Church listings, events, groups and serving opportunities are grouped into one operational view."
                />

                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                  <Metric label="Churches" value={scoped.length} icon={Church} />
                  <Metric label="Groups" value={groups.data?.length ?? 0} icon={Users} />
                  <Metric label="Events" value={events.data?.length ?? 0} icon={CalendarDays} />
                  <Metric label="Serve roles" value={serve.data?.length ?? 0} icon={UserCheck} />
                </div>

                <section>
                  <SectionHeader title="Your churches" />
                  <div className="grid gap-3 md:grid-cols-2">
                    {scoped.length === 0 && (
                      <div className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted-foreground">
                        No church is linked to your current administrative scope.
                      </div>
                    )}
                    {scoped.slice(0, 12).map((c) => (
                      <article
                        key={c.id}
                        className="rounded-2xl border border-border bg-surface p-4 transition hover:border-border-strong"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{c.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {[c.denomination, c.city].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <span
                            className={[
                              "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold",
                              c.verified
                                ? "bg-leaf/10 text-leaf"
                                : "bg-surface-2 text-muted-foreground",
                            ].join(" ")}
                          >
                            {c.verified ? "Verified" : "Pending"}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <div className="grid gap-6 xl:grid-cols-2">
                  <section className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
                    <SectionHeader title="Upcoming events" />
                    <div className="space-y-2">
                      {(events.data ?? []).slice(0, 6).map((e) => (
                        <div
                          key={e.id}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/30 p-4"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{e.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {eventDate(e.starts_at)}
                            </p>
                          </div>
                          <span className="max-w-32 truncate text-[11px] text-leaf">
                            {e.churches?.name}
                          </span>
                        </div>
                      ))}
                      {!(events.data ?? []).length && (
                        <p className="text-sm text-muted-foreground">No upcoming events yet.</p>
                      )}
                    </div>
                  </section>

                  <section className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
                    <SectionHeader title="Serve opportunities" />
                    <div className="space-y-2">
                      {(serve.data ?? []).slice(0, 8).map((s) => (
                        <div
                          key={s.id}
                          className="rounded-2xl border border-border bg-background/30 p-4"
                        >
                          <p className="text-sm font-semibold">{s.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{s.category}</p>
                        </div>
                      ))}
                      {!(serve.data ?? []).length && (
                        <p className="text-sm text-muted-foreground">
                          No serve opportunities are currently listed.
                        </p>
                      )}
                    </div>
                  </section>
                </div>

                {!isSuper && (
                  <div className="rounded-2xl border border-border bg-surface p-4 text-xs text-muted-foreground">
                    Mentors available: {mentors.data?.length ?? 0}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-leaf">{eyebrow}</p>
      <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>
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
    <div className="rounded-2xl border border-border bg-surface p-4 transition hover:border-border-strong">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-leaf/20 bg-leaf/10">
        <Icon className="h-4 w-4 text-leaf" />
      </div>
      <p className="mt-3 font-display text-2xl font-semibold">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/35 px-3 py-3 text-center">
      <p className="font-display text-lg font-semibold">{value}</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function TinyMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-background/30 px-3 py-2.5">
      <p className="text-base font-semibold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function ProgressCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/30 p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 font-display text-2xl font-semibold">{value}%</p>
        </div>
        <span className="text-[10px] text-muted-foreground">{detail}</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-leaf transition-all"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

function PriorityCard({
  title,
  value,
  detail,
  icon: Icon,
  tone,
  onClick,
}: {
  title: string;
  value: number | string;
  detail: string;
  icon: typeof Users;
  tone: "attention" | "calm";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group rounded-2xl border p-4 text-left transition hover:-translate-y-0.5",
        tone === "attention"
          ? "border-amber-400/20 bg-amber-400/[0.06] hover:border-amber-400/35"
          : "border-border bg-background/30 hover:border-leaf/30",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={[
            "flex h-10 w-10 items-center justify-center rounded-xl border",
            tone === "attention"
              ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
              : "border-leaf/20 bg-leaf/10 text-leaf",
          ].join(" ")}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="font-display text-2xl font-semibold">{value}</span>
      </div>
      <p className="mt-4 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-leaf">
        Open workspace
        <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

function QuickAction({
  title,
  detail,
  icon: Icon,
  onClick,
}: {
  title: string;
  detail: string;
  icon: typeof Users;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-28 items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:border-leaf/30"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-leaf/20 bg-leaf/10 text-leaf">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{detail}</span>
      </span>
    </button>
  );
}

function LibraryLink({
  to,
  title,
  detail,
}: {
  to: "/faith-courses" | "/devotionals" | "/series";
  title: string;
  detail: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-leaf/30"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-leaf/20 bg-leaf/10 text-leaf">
          <Sparkles className="h-4 w-4" />
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-leaf" />
      </div>
      <p className="mt-4 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </Link>
  );
}
