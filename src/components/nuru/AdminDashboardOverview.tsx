import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  BookOpenCheck,
  Church,
  CircleCheck,
  FileCheck2,
  MessageCircle,
  Music2,
  Plus,
  ShieldCheck,
  Sparkles,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/format";
import type { PilotMetrics } from "@/services/pilot";
import type { ModerationItem } from "@/services/content";
import type { AdminSectionId } from "@/components/nuru/AdminCommandShell";

type HealthCheck = { label: string; error: boolean; loading: boolean };

export function AdminDashboardOverview({
  userName,
  pilot,
  churchCount,
  groupCount,
  eventCount,
  openReports,
  unverifiedMentorCount,
  healthChecks,
  onNavigate,
}: {
  userName: string;
  pilot: PilotMetrics | undefined;
  churchCount: number;
  groupCount: number;
  eventCount: number;
  openReports: ModerationItem[];
  unverifiedMentorCount: number;
  healthChecks: HealthCheck[];
  onNavigate: (section: AdminSectionId) => void;
}) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const mediaSummary = useQuery({
    queryKey: ["admin-dashboard-media-summary"],
    queryFn: async () => {
      const [sources, pending] = await Promise.all([
        supabase.from("media_sources").select("id", { count: "exact", head: true }).eq("is_approved", true),
        supabase.from("media_items").select("id", { count: "exact", head: true }).eq("is_approved", false),
      ]);
      if (sources.error) throw sources.error;
      if (pending.error) throw pending.error;
      return { approvedSources: sources.count ?? 0, pendingItems: pending.count ?? 0 };
    },
    staleTime: 30_000,
  });

  const newSignups = useQuery({
    queryKey: ["admin-dashboard-new-signups", since],
    queryFn: async () => {
      const result = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since);
      if (result.error) throw result.error;
      return result.count ?? 0;
    },
    staleTime: 30_000,
  });

  const pendingMedia = useQuery({
    queryKey: ["admin-dashboard-pending-media"],
    queryFn: async () => {
      const result = await supabase
        .from("media_items")
        .select("id,title,media_type,creator_name,thumbnail_url,created_at")
        .eq("is_approved", false)
        .order("created_at", { ascending: false })
        .limit(6);
      if (result.error) throw result.error;
      return result.data ?? [];
    },
    staleTime: 30_000,
  });

  const recentPeople = useQuery({
    queryKey: ["admin-dashboard-recent-people"],
    queryFn: async () => {
      const result = await supabase
        .from("profiles")
        .select("id,full_name,username,created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (result.error) throw result.error;
      return result.data ?? [];
    },
    staleTime: 30_000,
  });

  const recentChurches = useQuery({
    queryKey: ["admin-dashboard-recent-churches"],
    queryFn: async () => {
      const result = await supabase
        .from("churches")
        .select("id,name,city,created_at")
        .order("created_at", { ascending: false })
        .limit(4);
      if (result.error) throw result.error;
      return result.data ?? [];
    },
    staleTime: 30_000,
  });

  const recentPosts = useQuery({
    queryKey: ["admin-dashboard-recent-posts"],
    queryFn: async () => {
      const result = await supabase
        .from("posts")
        .select("id,author_name,body,created_at")
        .order("created_at", { ascending: false })
        .limit(3);
      if (result.error) throw result.error;
      return result.data ?? [];
    },
    staleTime: 30_000,
  });

  const activityRows = useMemo(() => {
    const rows = [
      ...(recentPeople.data ?? []).map((row) => ({
        key: "person-" + row.id,
        type: "user" as const,
        title: "New user registered",
        detail: row.full_name || row.username || "Nuru member",
        created_at: row.created_at,
      })),
      ...(recentChurches.data ?? []).map((row) => ({
        key: "church-" + row.id,
        type: "church" as const,
        title: "Church added",
        detail: row.name + (row.city ? " · " + row.city : ""),
        created_at: row.created_at,
      })),
      ...(recentPosts.data ?? []).map((row) => ({
        key: "post-" + row.id,
        type: "post" as const,
        title: "Community post published",
        detail: row.author_name || "Nuru member",
        created_at: row.created_at,
      })),
    ];
    return rows
      .filter((row) => !!row.created_at)
      .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
      .slice(0, 8);
  }, [recentPeople.data, recentChurches.data, recentPosts.data]);

  const pendingCount =
    (mediaSummary.data?.pendingItems ?? 0) + openReports.length + unverifiedMentorCount;
  const healthy = healthChecks.every((check) => !check.error);
  const firstName = userName.trim().split(/\s+/)[0] || "Admin";

  const metrics = [
    {
      label: "Total Users",
      value: pilot?.profiles ?? "—",
      detail: pilot ? String(pilot.active_7d) + " active in 7 days" : "Pilot metrics syncing",
      icon: Users,
      accent: "cyan",
    },
    {
      label: "Church Directory",
      value: churchCount,
      detail: String(groupCount) + " groups · " + String(eventCount) + " events",
      icon: Church,
      accent: "blue",
    },
    {
      label: "Approved Artists",
      value: mediaSummary.data?.approvedSources ?? "—",
      detail: "Verified media sources",
      icon: Music2,
      accent: "purple",
    },
    {
      label: "Pending Reviews",
      value: pendingCount,
      detail: String(openReports.length) + " safety reports",
      icon: FileCheck2,
      accent: "amber",
    },
    {
      label: "Active Today",
      value: pilot?.active_today ?? "—",
      detail: pilot ? String(pilot.push_enabled_users) + " push enabled" : "Activity syncing",
      icon: Activity,
      accent: "cyan",
    },
    {
      label: "New Signups",
      value: newSignups.data ?? "—",
      detail: "Past 7 days",
      icon: UserPlus,
      accent: "amber",
    },
  ] as const;

  return (
    <div className="space-y-4">
      <section className="relative min-h-[190px] overflow-hidden rounded-2xl border border-cyan-400/30 bg-[#071727]">
        <img
          src="/photos/friends-outdoors.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#03101d] via-[#03101d]/86 to-[#03101d]/35" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_45%,rgba(34,211,238,0.18),transparent_30%)]" />
        <div className="relative z-10 flex min-h-[190px] items-end p-5 sm:p-7">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300">
              Welcome back,
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">
              {firstName} <span aria-hidden="true">👋</span>
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-200 sm:text-base">
              Together we’re building a brighter generation for a brighter world.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Here’s what’s happening on Nuru Faith today.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <MetricCard key={metric.label} {...metric} wide={index >= 4} />
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.9fr_0.7fr]">
        <section className="overflow-hidden rounded-2xl border border-[#153b5c] bg-[#071727]">
          <PanelHeader
            title="Pending Approvals"
            icon={FileCheck2}
            action="View all"
            onAction={() => onNavigate(openReports.length ? "moderation" : "content")}
          />
          <div className="flex flex-wrap gap-2 border-b border-[#12314b] px-4 py-3 text-[10px] font-semibold">
            <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-cyan-100">
              All ({pendingCount})
            </span>
            <span className="rounded-full border border-[#234b68] px-3 py-1 text-slate-400">
              Media ({mediaSummary.data?.pendingItems ?? 0})
            </span>
            <span className="rounded-full border border-[#234b68] px-3 py-1 text-slate-400">
              Reports ({openReports.length})
            </span>
            <span className="rounded-full border border-[#234b68] px-3 py-1 text-slate-400">
              Mentors ({unverifiedMentorCount})
            </span>
          </div>

          <div className="divide-y divide-[#12314b]">
            {(pendingMedia.data ?? []).slice(0, 5).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.media_type === "music" ? "music" : "content")}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#0a1d2f]"
              >
                <span className="flex h-11 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#1c425f] bg-[#0a2033]">
                  {item.thumbnail_url ? (
                    <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Music2 className="h-4 w-4 text-cyan-300" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[9px] font-bold uppercase tracking-wide text-cyan-300">
                    {item.media_type}
                  </span>
                  <span className="block truncate text-sm font-semibold text-white">{item.title}</span>
                  <span className="block truncate text-[10px] text-slate-500">
                    {item.creator_name || "Nuru catalogue"} · {item.created_at ? timeAgo(item.created_at) : "recent"}
                  </span>
                </span>
                <span className="rounded-lg bg-cyan-500 px-3 py-2 text-[10px] font-bold text-[#02101b]">
                  Review
                </span>
              </button>
            ))}

            {openReports.slice(0, 2).map((report) => (
              <button
                key={"report-" + report.id}
                type="button"
                onClick={() => onNavigate("moderation")}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#0a1d2f]"
              >
                <span className="flex h-11 w-14 shrink-0 items-center justify-center rounded-lg border border-rose-400/20 bg-rose-400/5">
                  <BarChart3 className="h-4 w-4 text-rose-300" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[9px] font-bold uppercase tracking-wide text-rose-300">Report</span>
                  <span className="block truncate text-sm font-semibold text-white">{report.reason}</span>
                  <span className="block truncate text-[10px] text-slate-500">{report.target}</span>
                </span>
                <span className="rounded-lg border border-[#2b4e68] px-3 py-2 text-[10px] font-bold text-slate-300">
                  Review
                </span>
              </button>
            ))}

            {!pendingMedia.isLoading &&
              !(pendingMedia.data?.length ?? 0) &&
              !openReports.length &&
              !unverifiedMentorCount && (
                <div className="flex items-center gap-3 px-4 py-8 text-sm text-slate-400">
                  <CircleCheck className="h-5 w-5 text-emerald-300" />
                  Nothing is waiting for review right now.
                </div>
              )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#153b5c] bg-[#071727]">
          <PanelHeader title="Recent Activity" icon={Activity} />
          <div className="divide-y divide-[#12314b]">
            {activityRows.map((row) => {
              const Icon = row.type === "user" ? Users : row.type === "church" ? Church : MessageCircle;
              return (
                <div key={row.key} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#234b68] bg-[#0a2033] text-cyan-300">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-white">{row.title}</span>
                    <span className="block truncate text-[10px] text-slate-500">{row.detail}</span>
                  </span>
                  <span className="whitespace-nowrap text-[9px] text-slate-500">
                    {row.created_at ? timeAgo(row.created_at) : ""}
                  </span>
                </div>
              );
            })}
            {!activityRows.length && (
              <div className="px-4 py-8 text-sm text-slate-400">Activity will appear here as people use Nuru.</div>
            )}
          </div>
        </section>

        <div className="space-y-4">
          <section className="overflow-hidden rounded-2xl border border-[#153b5c] bg-[#071727]">
            <PanelHeader title="Quick Actions" icon={Sparkles} />
            <div className="space-y-2 p-3">
              <ActionButton label="Add Church" icon={Church} tone="cyan" onClick={() => onNavigate("churches")} />
              <ActionButton label="Review Content" icon={BookOpenCheck} tone="purple" onClick={() => onNavigate("content")} />
              <ActionButton label="Approve Artist" icon={Music2} tone="amber" onClick={() => onNavigate("music")} />
              <ActionButton label="Review Reports" icon={BarChart3} tone="green" onClick={() => onNavigate("moderation")} />
              <ActionButton label="Manage Roles" icon={UserCog} tone="slate" onClick={() => onNavigate("roles")} />
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#153b5c] bg-[#071727]">
            <PanelHeader title="System Status" icon={ShieldCheck} />
            <div className="px-4 pb-4">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {healthy ? "All core systems connected" : "Some data needs attention"}
              </div>
              <div className="space-y-2">
                {healthChecks.map((check) => (
                  <div key={check.label} className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="text-slate-300">{check.label}</span>
                    <span
                      className={[
                        "inline-flex items-center gap-1",
                        check.error
                          ? "text-rose-300"
                          : check.loading
                            ? "text-amber-300"
                            : "text-emerald-300",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "h-1.5 w-1.5 rounded-full",
                          check.error
                            ? "bg-rose-400"
                            : check.loading
                              ? "bg-amber-400"
                              : "bg-emerald-400",
                        ].join(" ")}
                      />
                      {check.error ? "Attention" : check.loading ? "Syncing" : "Operational"}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-slate-300">Media catalogue</span>
                  <span className={mediaSummary.isError ? "text-rose-300" : mediaSummary.isLoading ? "text-amber-300" : "text-emerald-300"}>
                    {mediaSummary.isError ? "Attention" : mediaSummary.isLoading ? "Syncing" : "Operational"}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  detail: string;
  icon: typeof Users;
  accent: "cyan" | "blue" | "purple" | "amber";
  wide?: boolean;
}) {
  const accentClasses = {
    cyan: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300",
    blue: "border-blue-400/25 bg-blue-400/10 text-blue-300",
    purple: "border-violet-400/25 bg-violet-400/10 text-violet-300",
    amber: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  }[accent];
  return (
    <div className="rounded-2xl border border-[#153b5c] bg-[#071727] p-4 transition hover:border-cyan-400/35">
      <div className="flex items-center gap-3">
        <span className={["flex h-10 w-10 items-center justify-center rounded-xl border", accentClasses].join(" ")}>
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-slate-400">{label}</p>
          <p className="mt-0.5 font-display text-2xl font-semibold text-white">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          <p className="truncate text-[10px] text-slate-500">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function PanelHeader({
  title,
  icon: Icon,
  action,
  onAction,
}: {
  title: string;
  icon: typeof Users;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-[#153b5c] px-4 py-3">
      <Icon className="h-4 w-4 text-cyan-300" />
      <h2 className="flex-1 text-sm font-semibold text-white">{title}</h2>
      {action && onAction && (
        <button type="button" onClick={onAction} className="text-[10px] font-semibold text-cyan-300 hover:text-cyan-200">
          {action} →
        </button>
      )}
    </div>
  );
}

function ActionButton({
  label,
  icon: Icon,
  tone,
  onClick,
}: {
  label: string;
  icon: typeof Users;
  tone: "cyan" | "purple" | "amber" | "green" | "slate";
  onClick: () => void;
}) {
  const classes = {
    cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
    purple: "border-violet-400/30 bg-violet-400/10 text-violet-100",
    amber: "border-amber-400/30 bg-amber-400/10 text-amber-100",
    green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
    slate: "border-[#31516a] bg-[#0a2033] text-slate-100",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={["flex min-h-10 w-full items-center gap-2 rounded-xl border px-3 text-left text-xs font-semibold transition hover:brightness-110", classes].join(" ")}
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1">{label}</span>
      <span aria-hidden="true">›</span>
    </button>
  );
}
