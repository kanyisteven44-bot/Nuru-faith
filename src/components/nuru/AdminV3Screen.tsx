import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Church,
  Clapperboard,
  ExternalLink,
  Flag,
  GraduationCap,
  Music2,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { timeAgo } from "@/lib/format";
import {
  fetchChurches,
  fetchEvents,
  fetchGroups,
  fetchMentors,
  fetchModerationQueue,
  fetchMyRoles,
  fetchProfile,
  fetchServeOpportunities,
  updateModerationStatus,
  type ModerationItem,
} from "@/services/content";
import { CardSkeleton, EmptyState } from "@/components/nuru/Primitives";
import { MusicCatalogImport } from "@/components/youtube/MusicCatalogImport";
import { getPilotMetrics } from "@/lib/pilot.functions";
import { AdminOperations } from "@/components/nuru/AdminOperations";
import { AdminRoleManager } from "@/components/nuru/AdminRoleManager";
import {
  AdminCommandShell,
  type AdminSectionId,
} from "@/components/nuru/AdminCommandShell";
import { AdminDashboardOverview } from "@/components/nuru/AdminDashboardOverview";
import { supabase } from "@/integrations/supabase/client";

export function AdminV3Screen({ initialSection }: { initialSection: AdminSectionId }) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [activeSection, setLocalSection] = useState<AdminSectionId>(initialSection);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [moderationFilter, setModerationFilter] = useState<
    "active" | "reviewing" | "resolved" | "dismissed" | "all"
  >("active");
  const [moderationSearch, setModerationSearch] = useState("");
  const [communitySearch, setCommunitySearch] = useState("");
  const [communityPage, setCommunityPage] = useState(0);

  function setActiveSection(section: AdminSectionId) {
    setLocalSection(section);
    void navigate({ to: "/admin", search: { section }, replace: true });
  }

  useEffect(() => { setLocalSection(initialSection); }, [initialSection]);

  async function refreshAdminData() {
    setIsRefreshing(true);
    try {
      await qc.refetchQueries({ type: "active" }, { throwOnError: true });
      toast.success("Admin data refreshed.");
    } catch {
      toast.error("Some admin data could not be refreshed.");
    } finally {
      setIsRefreshing(false);
    }
  }

  const roles = useQuery({
    queryKey: ["roles", userId],
    queryFn: () => fetchMyRoles(userId!),
    enabled: !!userId,
  });
  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });

  const isSuper = (roles.data ?? []).some((row) => row.role === "super_admin");
  const isModerator = (roles.data ?? []).some((row) => row.role === "moderator");
  const isChurchAdmin = (roles.data ?? []).some((row) => row.role === "church_admin");
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
  const reelCount = useQuery({
    queryKey: ["admin-reel-count"],
    enabled: !!userId && isAdmin,
    queryFn: async () => {
      const result = await supabase.from("reels").select("id", { count: "exact", head: true });
      if (result.error) throw result.error;
      return result.count ?? 0;
    },
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
      toast.success("Moderation status updated.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Couldn't update that report."),
  });

  const myChurchIds = (roles.data ?? []).map((row) => row.church_id).filter(Boolean);
  const scopedChurches =
    isSuper || isModerator
      ? (churches.data ?? [])
      : (churches.data ?? []).filter((church) => myChurchIds.includes(church.id));

  if (roles.isLoading) {
    return (
      <div className="min-h-dvh bg-[#020a13] p-6 text-white">
        <CardSkeleton count={5} height="h-24" />
      </div>
    );
  }

  if (roles.isError) {
    return <div className="mx-auto max-w-md p-6"><EmptyState title="Could not verify admin access" description="Retry loading your roles." action={<button type="button" onClick={() => void roles.refetch()}>Retry</button>} /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md items-center bg-background px-6">
        <EmptyState
          title="Admin access only"
          description="This dashboard is for authorized Nuru administrators."
          action={
            <Link to="/home" className="mt-2 text-sm font-semibold text-primary">
              Back to Nuru Faith
            </Link>
          }
        />
      </div>
    );
  }

  const openReports = (moderation.data ?? []).filter((item) =>
    ["open", "pending", "reviewing"].includes(item.status),
  );
  const unverifiedMentors = (mentors.data ?? []).filter((mentor) => !mentor.verified);
  const attentionCount = openReports.length + unverifiedMentors.length;
  const roleLabel = isSuper ? "Super Admin" : isModerator ? "Moderator" : "Church Admin";
  const userName =
    profile.data?.full_name || profile.data?.username || (isSuper ? "Super Admin" : "Nuru Admin");

  const healthChecks = [
    { label: "Platform", error: profile.isError, loading: profile.isLoading },
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
    return (
      item.reason +
      " " +
      item.target +
      " " +
      (item.details ?? "") +
      " " +
      item.source
    )
      .toLowerCase()
      .includes(normalizedModerationSearch);
  });

  const normalizedChurchSearch = communitySearch.trim().toLowerCase();
  const filteredChurches = scopedChurches.filter((church) =>
    !normalizedChurchSearch
      ? true
      : (
          church.name +
          " " +
          (church.denomination ?? "") +
          " " +
          (church.city ?? "") +
          " " +
          (church.region ?? "")
        )
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

  return (
    <AdminCommandShell
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      userId={userId}
      userName={userName}
      avatarUrl={profile.data?.avatar_url ?? null}
      roleLabel={roleLabel}
      attentionCount={attentionCount}
    >
      <div className="mb-4 flex items-center justify-end">
        <button
          type="button"
          onClick={() => void refreshAdminData()}
          disabled={isRefreshing}
          className="rounded-xl border border-[#1c425f] bg-[#071727] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-cyan-400/40 hover:text-white disabled:opacity-50"
        >
          {isRefreshing ? "Refreshing…" : "Refresh live data"}
        </button>
      </div>

      {activeSection === "dashboard" && (
        <AdminDashboardOverview
          userName={userName}
          pilot={pilot.data}
          churchCount={scopedChurches.length}
          groupCount={groups.data?.length ?? 0}
          eventCount={events.data?.length ?? 0}
          openReports={openReports}
          unverifiedMentorCount={unverifiedMentors.length}
          healthChecks={healthChecks}
          onNavigate={setActiveSection}
        />
      )}

      {activeSection === "users" && (
        <AdminPanel title="Users" subtitle="Search members, mentors and community records.">
          {isSuper && userId ? (
            <AdminOperations churches={churches.data ?? []} initialTab="People" />
          ) : (
            <ScopedNotice />
          )}
        </AdminPanel>
      )}

      {activeSection === "churches" && (
        <AdminPanel title="Churches" subtitle="Manage the church directory and connected people.">
          {isSuper && userId ? (
            <AdminOperations churches={churches.data ?? []} initialTab="Churches" />
          ) : (
            <CommunityDirectory
              churches={visibleChurches}
              total={filteredChurches.length}
              search={communitySearch}
              setSearch={(value) => {
                setCommunitySearch(value);
                setCommunityPage(0);
              }}
              page={safeCommunityPage}
              pageCount={communityPageCount}
              setPage={setCommunityPage}
            />
          )}
        </AdminPanel>
      )}

      {activeSection === "content" && (
        <AdminPanel title="Content" subtitle="Courses, devotionals, Scripture series and learning resources.">
          <div className="grid gap-3 md:grid-cols-3">
            <AdminLinkCard
              to="/faith-courses"
              title="Courses & studies"
              detail="Long-form learning and guided study"
              icon={GraduationCap}
            />
            <AdminLinkCard
              to="/devotionals"
              title="Devotional library"
              detail="Daily and topical reflections"
              icon={BookOpen}
            />
            <AdminLinkCard
              to="/series"
              title="Scripture series"
              detail="Multi-part Bible journeys"
              icon={BookOpen}
            />
          </div>
        </AdminPanel>
      )}

      {activeSection === "music" && (
        <AdminPanel title="Music" subtitle="Review and operate the approved Nuru media catalogue.">
          {isSuper || isModerator ? <MusicCatalogImport /> : <ScopedNotice />}
        </AdminPanel>
      )}

      {activeSection === "reels" && (
        <AdminPanel title="Reels" subtitle="Keep short-form faith content visible, safe and active.">
          <div className="grid gap-3 md:grid-cols-3">
            <AdminMetric label="Reels in catalogue" value={reelCount.data ?? "—"} icon={Clapperboard} />
            <AdminMetric label="Open reports" value={openReports.length} icon={Flag} />
            <AdminMetric label="Active today" value={pilot.data?.active_today ?? "—"} icon={Activity} />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/reels"
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-cyan-500 px-4 text-xs font-bold text-[#02101b]"
            >
              Open Reels
            </Link>
            <button
              type="button"
              onClick={() => setActiveSection("moderation")}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#234b68] bg-[#071727] px-4 text-xs font-semibold text-slate-200"
            >
              Review Reel Reports
            </button>
          </div>
        </AdminPanel>
      )}

      {activeSection === "community" && (
        <AdminPanel
          title="Community"
          subtitle="Churches, groups, events and serving activity in one operational view."
        >
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <AdminMetric label="Churches" value={scopedChurches.length} icon={Church} />
            <AdminMetric label="Groups" value={groups.data?.length ?? 0} icon={Users} />
            <AdminMetric label="Events" value={events.data?.length ?? 0} icon={CalendarDays} />
            <AdminMetric label="Serve roles" value={serve.data?.length ?? 0} icon={CheckCircle2} />
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <CommunityDirectory
              churches={visibleChurches}
              total={filteredChurches.length}
              search={communitySearch}
              setSearch={(value) => {
                setCommunitySearch(value);
                setCommunityPage(0);
              }}
              page={safeCommunityPage}
              pageCount={communityPageCount}
              setPage={setCommunityPage}
            />
            <div className="space-y-3">
              <AdminLinkCard to="/groups" title="Groups" detail="Open community groups and activity" icon={Users} />
              <AdminLinkCard to="/events" title="Events" detail="See upcoming Nuru events" icon={CalendarDays} />
              <AdminLinkCard to="/serve" title="Serve" detail="Open serving opportunities" icon={CheckCircle2} />
            </div>
          </div>
        </AdminPanel>
      )}

      {activeSection === "moderation" && (
        <AdminPanel title="Reports" subtitle="Review safety reports and close the moderation loop.">
          <div className="grid gap-3 sm:grid-cols-3">
            <AdminMetric label="Open queue" value={openReports.length} icon={Flag} />
            <AdminMetric
              label="In review"
              value={openReports.filter((item) => item.status === "reviewing").length}
              icon={Activity}
            />
            <AdminMetric label="Total loaded" value={moderation.data?.length ?? 0} icon={BarChart3} />
          </div>

          <div className="mt-5 rounded-2xl border border-[#153b5c] bg-[#071727] p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={moderationSearch}
                  onChange={(event) => setModerationSearch(event.target.value)}
                  placeholder="Search reason, target or source"
                  className="min-h-11 w-full rounded-xl border border-[#173b59] bg-[#04111f] pl-10 pr-3 text-sm text-white outline-none"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {(["active", "reviewing", "resolved", "dismissed", "all"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setModerationFilter(filter)}
                    className={[
                      "min-h-10 rounded-xl border px-3 text-xs font-semibold capitalize",
                      moderationFilter === filter
                        ? "border-cyan-400/50 bg-cyan-500/10 text-cyan-100"
                        : "border-[#173b59] bg-[#071727] text-slate-400",
                    ].join(" ")}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {moderation.isLoading ? (
                <CardSkeleton count={3} height="h-24" />
              ) : filteredModeration.length === 0 ? (
                <div className="rounded-xl border border-[#173b59] bg-[#04111f] p-5 text-sm text-slate-400">
                  No reports match this view.
                </div>
              ) : (
                filteredModeration.slice(0, 30).map((item) => (
                  <article
                    key={item.source + ":" + item.id}
                    className="rounded-xl border border-[#173b59] bg-[#04111f] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">{item.reason}</p>
                        <p className="mt-1 truncate text-[11px] text-slate-500">{item.target}</p>
                      </div>
                      <ModerationStatusBadge status={item.status} />
                    </div>
                    {item.details && (
                      <p className="mt-3 text-xs leading-relaxed text-slate-300">{item.details}</p>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="mr-auto text-[10px] text-slate-500">
                        {item.source.replace("_", " ")} · {timeAgo(item.created_at)}
                      </span>
                      {item.source_url && (
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-[#234b68] px-3 text-[11px] font-semibold text-slate-200"
                        >
                          Source <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      <button
                        type="button"
                        disabled={updateReport.isPending || item.status === "reviewing"}
                        onClick={() => updateReport.mutate({ item, status: "reviewing" })}
                        className="min-h-9 rounded-xl border border-[#234b68] px-3 text-[11px] font-semibold text-slate-200 disabled:opacity-40"
                      >
                        Review
                      </button>
                      <button
                        type="button"
                        disabled={updateReport.isPending || item.status === "dismissed"}
                        onClick={() => updateReport.mutate({ item, status: "dismissed" })}
                        className="min-h-9 rounded-xl border border-[#234b68] px-3 text-[11px] font-semibold text-slate-200 disabled:opacity-40"
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        disabled={updateReport.isPending || item.status === "resolved"}
                        onClick={() => updateReport.mutate({ item, status: "resolved" })}
                        className="min-h-9 rounded-xl bg-cyan-500 px-3 text-[11px] font-bold text-[#02101b] disabled:opacity-40"
                      >
                        Resolve
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </AdminPanel>
      )}

      {activeSection === "roles" && (
        <AdminPanel title="Roles" subtitle="Control who can operate Nuru administration.">
          {isSuper ? (
            <AdminRoleManager
              churches={(churches.data ?? []).map((church) => ({ id: church.id, name: church.name }))}
            />
          ) : (
            <ScopedNotice />
          )}
        </AdminPanel>
      )}
    </AdminCommandShell>
  );
}

function AdminPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#153b5c] bg-[#051421] p-4 sm:p-5">
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">Nuru Admin</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-white">{title}</h1>
        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function ScopedNotice() {
  return (
    <div className="rounded-xl border border-[#173b59] bg-[#04111f] p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <ShieldCheck className="h-4 w-4 text-cyan-300" />
        Role-scoped access
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">
        This workspace is limited to Super Admin or moderation staff. Your allowed church tools remain
        available through the Community section.
      </p>
    </div>
  );
}

function AdminMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-2xl border border-[#153b5c] bg-[#071727] p-4">
      <Icon className="h-4 w-4 text-cyan-300" />
      <p className="mt-3 font-display text-2xl font-semibold text-white">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  );
}

function AdminLinkCard({
  to,
  title,
  detail,
  icon: Icon,
}: {
  to: "/faith-courses" | "/devotionals" | "/series" | "/groups" | "/events" | "/serve";
  title: string;
  detail: string;
  icon: typeof Users;
}) {
  return (
    <Link
      to={to}
      className="flex min-h-24 items-center gap-3 rounded-2xl border border-[#153b5c] bg-[#071727] p-4 transition hover:border-cyan-400/40 hover:bg-[#0a1d2f]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span className="mt-1 block text-xs text-slate-400">{detail}</span>
      </span>
    </Link>
  );
}

function CommunityDirectory({
  churches,
  total,
  search,
  setSearch,
  page,
  pageCount,
  setPage,
}: {
  churches: Awaited<ReturnType<typeof fetchChurches>>;
  total: number;
  search: string;
  setSearch: (value: string) => void;
  page: number;
  pageCount: number;
  setPage: Dispatch<SetStateAction<number>>;
}) {
  return (
    <section className="rounded-2xl border border-[#153b5c] bg-[#071727] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Church directory</p>
          <p className="text-xs text-slate-500">{total.toLocaleString()} visible results</p>
        </div>
        <Church className="h-5 w-5 text-cyan-300" />
      </div>
      <label className="relative mt-3 block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search church, city or denomination"
          className="min-h-11 w-full rounded-xl border border-[#173b59] bg-[#04111f] pl-10 pr-3 text-sm text-white outline-none"
        />
      </label>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {churches.map((church) => (
          <article key={church.id} className="rounded-xl border border-[#173b59] bg-[#04111f] p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{church.name}</p>
                <p className="mt-1 truncate text-[10px] text-slate-500">
                  {[church.denomination, church.city].filter(Boolean).join(" · ") || "Church directory"}
                </p>
              </div>
              <span
                className={[
                  "rounded-full px-2 py-1 text-[9px] font-semibold",
                  church.verified
                    ? "bg-emerald-400/10 text-emerald-300"
                    : "bg-slate-400/10 text-slate-400",
                ].join(" ")}
              >
                {church.verified ? "Verified" : "Directory"}
              </span>
            </div>
          </article>
        ))}
        {!churches.length && (
          <div className="rounded-xl border border-[#173b59] bg-[#04111f] p-4 text-sm text-slate-400 sm:col-span-2">
            No churches match this search.
          </div>
        )}
      </div>
      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((value) => Math.max(0, value - 1))}
            className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-[#234b68] px-3 text-xs font-semibold text-slate-200 disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Previous
          </button>
          <span className="text-[10px] text-slate-500">
            Page {page + 1} of {pageCount}
          </span>
          <button
            type="button"
            disabled={page + 1 >= pageCount}
            onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
            className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-[#234b68] px-3 text-xs font-semibold text-slate-200 disabled:opacity-40"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </section>
  );
}

function ModerationStatusBadge({ status }: { status: string }) {
  const tone = ["open", "pending"].includes(status)
    ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
    : status === "reviewing"
      ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
      : status === "resolved"
        ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
        : "border-[#31516a] bg-[#0a2033] text-slate-400";
  return (
    <span className={["rounded-full border px-2.5 py-1 text-[10px] font-semibold capitalize", tone].join(" ")}>
      {status}
    </span>
  );
}
