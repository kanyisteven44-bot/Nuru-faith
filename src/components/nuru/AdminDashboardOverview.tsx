import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  BookOpenCheck,
  Church,
  CircleCheck,
  Clapperboard,
  FileCheck2,
  Gauge,
  HeartHandshake,
  MessageCircle,
  Music2,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UserCog,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/format";
import type { PilotMetrics } from "@/services/pilot";
import type { AdminFactSnapshot } from "@/lib/adminFacts.functions";
import type { ModerationItem } from "@/services/content";
import type { AdminSectionId } from "@/components/nuru/AdminCommandShell";
import { GhostButton, GradientButton } from "@/components/nuru/Primitives";

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
  facts,
  factsLoading,
  factsError,
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
  facts: AdminFactSnapshot | undefined;
  factsLoading: boolean;
  factsError: boolean;
  onNavigate: (section: AdminSectionId) => void;
}) {
  const since = useMemo(
    () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    [],
  );

  const mediaSummary = useQuery({
    queryKey: ["admin-dashboard-media-summary"],
    queryFn: async () => {
      const [sources, pending, total] = await Promise.all([
        supabase.from("media_sources").select("id", { count: "exact", head: true }).eq("is_approved", true),
        supabase.from("media_items").select("id", { count: "exact", head: true }).eq("is_approved", false),
        supabase.from("media_items").select("id", { count: "exact", head: true }),
      ]);
      if (sources.error) throw sources.error;
      if (pending.error) throw pending.error;
      if (total.error) throw total.error;
      return {
        approvedSources: sources.count ?? 0,
        pendingItems: pending.count ?? 0,
        totalItems: total.count ?? 0,
      };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  const signupTrend = useQuery({
    queryKey: ["admin-dashboard-signup-trend", since],
    queryFn: async () => {
      const result = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: true });
      if (result.error) throw result.error;
      return result.data ?? [];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  const platformSummary = useQuery({
    queryKey: ["admin-dashboard-platform-summary"],
    queryFn: async () => {
      const [reels, prayers, messages, posts, devotionals, series, courses] = await Promise.all([
        supabase.from("reels").select("id", { count: "exact", head: true }),
        supabase.from("prayer_requests").select("id", { count: "exact", head: true }),
        supabase.from("direct_messages").select("id", { count: "exact", head: true }),
        supabase.from("posts").select("id", { count: "exact", head: true }),
        supabase.from("devotionals").select("id", { count: "exact", head: true }),
        supabase.from("scripture_series").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
      ]);
      for (const result of [reels, prayers, messages, posts, devotionals, series, courses]) {
        if (result.error) throw result.error;
      }
      return {
        reels: reels.count ?? 0,
        prayers: prayers.count ?? 0,
        messages: messages.count ?? 0,
        posts: posts.count ?? 0,
        devotionals: devotionals.count ?? 0,
        series: series.count ?? 0,
        courses: courses.count ?? 0,
      };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
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
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
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
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
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
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
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
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  const signupDays = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("en", { weekday: "short" });
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      return {
        key: date.toISOString().slice(0, 10),
        label: formatter.format(date),
        count: 0,
      };
    });
    for (const row of signupTrend.data ?? []) {
      if (!row.created_at) continue;
      const key = new Date(row.created_at).toISOString().slice(0, 10);
      const day = days.find((item) => item.key === key);
      if (day) day.count += 1;
    }
    return days;
  }, [signupTrend.data]);

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
      .slice(0, 7);
  }, [recentPeople.data, recentChurches.data, recentPosts.data]);

  const counts = facts?.counts;
  const pendingMediaCount = counts?.pendingMediaItems ?? mediaSummary.data?.pendingItems ?? 0;
  const pendingCount = pendingMediaCount + openReports.length + unverifiedMentorCount;
  const healthy = healthChecks.every((check) => !check.error) && !factsError;
  const firstName = userName.trim().split(/\s+/)[0] || "Admin";
  const maxSignups = Math.max(1, ...signupDays.map((day) => day.count));
  const totalMedia = counts?.mediaItemsTotal ?? mediaSummary.data?.totalItems ?? 0;
  const pendingMediaRate = totalMedia ? Math.round((pendingMediaCount / totalMedia) * 1000) / 10 : 0;
  const learningLibrary =
    (counts?.devotionals ?? platformSummary.data?.devotionals ?? 0) +
    (counts?.scriptureSeries ?? platformSummary.data?.series ?? 0) +
    (counts?.courses ?? platformSummary.data?.courses ?? 0);
  const communityRecords =
    (counts?.directMessages ?? platformSummary.data?.messages ?? 0) +
    (counts?.prayerRequests ?? platformSummary.data?.prayers ?? 0) +
    (counts?.posts ?? platformSummary.data?.posts ?? 0);
  const attentionSources = healthChecks.filter((check) => check.error).length;
  const connectedSources = healthChecks.filter((check) => !check.error && !check.loading).length;
  const totalHealthSources = healthChecks.length;
  const musicImport = facts?.imports.find((row) => row.kind === "music");
  const podcastImport = facts?.imports.find((row) => row.kind === "podcast");

  const metrics = [
    {
      label: "Total Users",
      value: counts?.profiles ?? pilot?.profiles ?? "—",
      detail: pilot ? String(pilot.active_7d) + " active in 7 days" : "Exact profile count",
      icon: Users,
      accent: "cyan" as const,
      onClick: () => onNavigate("users"),
    },
    {
      label: "Churches",
      value: counts?.churches ?? churchCount,
      detail:
        String(counts?.groups ?? groupCount) +
        " groups · " +
        String(counts?.events ?? eventCount) +
        " events",
      icon: Church,
      accent: "blue" as const,
      onClick: () => onNavigate("churches"),
    },
    {
      label: "Approved Artists",
      value: counts?.approvedMusicSources ?? "—",
      detail: "Verified + approved YouTube music sources",
      icon: Music2,
      accent: "purple" as const,
      onClick: () => onNavigate("music"),
    },
    {
      label: "Pending Reviews",
      value: pendingCount,
      detail:
        String(pendingMediaCount) +
        " media · " +
        String(openReports.length) +
        " reports · " +
        String(unverifiedMentorCount) +
        " mentors",
      icon: FileCheck2,
      accent: "amber" as const,
      onClick: () => onNavigate(openReports.length ? "moderation" : "content"),
    },
  ];

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[28px] border border-cyan-400/25 bg-[#071727] shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
        <img
          src="/photos/friends-outdoors.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#03101d] via-[#03101d]/92 to-[#03101d]/48" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_35%,rgba(34,211,238,0.2),transparent_34%)]" />
        <div className="relative z-10 grid min-h-[240px] items-end gap-6 p-5 sm:p-7 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-300">
              Nuru command center
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Welcome back, {firstName} <span aria-hidden="true">👋</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
              Run the community, content and safety side of Nuru Faith from one clear workspace.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Live operations · refreshes every 60 seconds
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold text-cyan-200">
                {factsLoading
                  ? "Refreshing production facts…"
                  : facts
                    ? `Supabase production · captured ${timeAgo(facts.capturedAt)}`
                    : "Production fact snapshot unavailable"}
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <GradientButton onClick={() => onNavigate("content")} className="min-h-10 px-4 text-xs">
                <BookOpenCheck className="h-4 w-4" />
                Review content
              </GradientButton>
              <GhostButton onClick={() => onNavigate("churches")} className="min-h-10 px-4 text-xs">
                <Church className="h-4 w-4" />
                Add church
              </GhostButton>
              <GhostButton onClick={() => onNavigate("music")} className="min-h-10 px-4 text-xs">
                <Music2 className="h-4 w-4" />
                Music
              </GhostButton>
              <GhostButton onClick={() => onNavigate("moderation")} className="min-h-10 px-4 text-xs">
                <ShieldCheck className="h-4 w-4" />
                Reports
              </GhostButton>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 self-stretch">
            <HeroMiniStat label="Active today" value={pilot?.active_today ?? "—"} icon={Activity} />
            <HeroMiniStat label="New signups" value={signupTrend.data?.length ?? "—"} icon={UserPlus} />
            <HeroMiniStat label="Reels" value={counts?.reels ?? platformSummary.data?.reels ?? "—"} icon={Clapperboard} />
            <HeroMiniStat label="Media items" value={totalMedia || "—"} icon={Music2} />
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid auto-rows-min gap-4 xl:grid-cols-12">
        <BentoCard className="xl:col-span-5" title="Platform growth" icon={BarChart3}>
          <div className="grid gap-5 sm:grid-cols-[0.75fr_1.25fr]">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
              <MiniData label="Active today" value={pilot?.active_today ?? "—"} detail="Current active users" />
              <MiniData label="Active in 7 days" value={pilot?.active_7d ?? "—"} detail="7-day active users" />
              <MiniData label="New signups" value={signupTrend.data?.length ?? "—"} detail="Past 7 days" />
            </div>
            <div>
              <div className="flex h-44 items-end gap-2 rounded-2xl border border-[#163a55] bg-[#04111f] px-4 pb-4 pt-6">
                {signupDays.map((day) => {
                  const height = day.count === 0 ? 8 : Math.max(20, (day.count / maxSignups) * 100);
                  return (
                    <div key={day.key} className="flex h-full flex-1 flex-col justify-end gap-2">
                      <div className="flex flex-1 items-end">
                        <div
                          className="w-full rounded-t-xl bg-gradient-to-t from-cyan-500/25 via-cyan-400/60 to-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.14)]"
                          style={{ height: `${height}%` }}
                          title={`${day.count} signup${day.count === 1 ? "" : "s"}`}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] text-slate-500">{day.label.slice(0, 1)}</p>
                        <p className="text-[9px] font-semibold text-slate-300">{day.count}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[10px] text-slate-500">Actual profile signups from the last 7 days.</p>
            </div>
          </div>
        </BentoCard>

        <BentoCard className="xl:col-span-3" title="Quick Actions" icon={Sparkles}>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <QuickAction label="Add church" icon={Church} onClick={() => onNavigate("churches")} />
            <QuickAction label="Review content" icon={BookOpenCheck} onClick={() => onNavigate("content")} />
            <QuickAction label="Approve artist" icon={Music2} onClick={() => onNavigate("music")} />
            <QuickAction label="Manage roles" icon={UserCog} onClick={() => onNavigate("roles")} />
          </div>
        </BentoCard>

        <BentoCard className="xl:col-span-4" title="Faith & community pulse" icon={HeartHandshake}>
          <div className="grid grid-cols-2 gap-2">
            <PulseStat label="Prayer requests" value={counts?.prayerRequests ?? platformSummary.data?.prayers ?? "—"} />
            <PulseStat label="Direct messages" value={counts?.directMessages ?? platformSummary.data?.messages ?? "—"} />
            <PulseStat label="Groups" value={counts?.groups ?? groupCount} />
            <PulseStat label="Events" value={counts?.events ?? eventCount} />
          </div>
          <div className="mt-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.05] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
              Nuru mission
            </p>
            <p className="mt-2 font-display text-lg font-semibold text-white">
              More people. Deeper faith. Stronger community.
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              The figures above are record counts from the production database. They do not claim
              spiritual impact, engagement quality or outcomes that Nuru has not measured.
            </p>
          </div>
        </BentoCard>

        <BentoCard className="xl:col-span-5" title="Pending Approvals" icon={FileCheck2}>
          <div className="mb-3 flex flex-wrap gap-2 text-[10px] font-semibold">
            <span className="rounded-full border border-cyan-400/35 bg-cyan-500/10 px-3 py-1 text-cyan-100">
              All {pendingCount}
            </span>
            <span className="rounded-full border border-[#234b68] px-3 py-1 text-slate-400">
              Media {pendingMediaCount}
            </span>
            <span className="rounded-full border border-[#234b68] px-3 py-1 text-slate-400">
              Reports {openReports.length}
            </span>
          </div>

          <div className="space-y-2">
            {(pendingMedia.data ?? []).slice(0, 3).map((item) => (
              <article
                key={item.id}
                className="flex items-center gap-3 rounded-2xl border border-[#163a55] bg-[#04111f] p-3"
              >
                <span className="flex h-11 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#1c425f] bg-[#0a2033]">
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
                  <span className="block truncate text-xs font-semibold text-white">{item.title}</span>
                  <span className="block truncate text-[10px] text-slate-500">
                    {item.creator_name || "Nuru catalogue"} · {item.created_at ? timeAgo(item.created_at) : "recent"}
                  </span>
                </span>
                <GhostButton
                  onClick={() => onNavigate(item.media_type === "music" ? "music" : "content")}
                  className="min-h-9 px-3 text-[10px]"
                >
                  Review
                </GhostButton>
              </article>
            ))}

            {openReports.slice(0, 1).map((report) => (
              <article
                key={"report-" + report.id}
                className="flex items-center gap-3 rounded-2xl border border-rose-400/15 bg-rose-400/[0.04] p-3"
              >
                <span className="flex h-11 w-14 shrink-0 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-400/5">
                  <ShieldCheck className="h-4 w-4 text-rose-300" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[9px] font-bold uppercase tracking-wide text-rose-300">Report</span>
                  <span className="block truncate text-xs font-semibold text-white">{report.reason}</span>
                  <span className="block truncate text-[10px] text-slate-500">{report.target}</span>
                </span>
                <GhostButton onClick={() => onNavigate("moderation")} className="min-h-9 px-3 text-[10px]">
                  Review
                </GhostButton>
              </article>
            ))}

            {!pendingMedia.isLoading &&
              !(pendingMedia.data?.length ?? 0) &&
              !openReports.length &&
              !unverifiedMentorCount && (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.04] p-5 text-sm text-slate-400">
                  <CircleCheck className="h-5 w-5 text-emerald-300" />
                  Nothing is waiting for review right now.
                </div>
              )}
          </div>

          <div className="mt-3">
            <GhostButton
              onClick={() => onNavigate(openReports.length ? "moderation" : "content")}
              className="min-h-9 w-full px-3 text-[10px]"
            >
              View full approval queue <ArrowRight className="h-3.5 w-3.5" />
            </GhostButton>
          </div>
        </BentoCard>

        <BentoCard className="xl:col-span-4" title="Recent Activity" icon={Activity}>
          <div className="space-y-1">
            {activityRows.map((row) => {
              const Icon = row.type === "user" ? Users : row.type === "church" ? Church : MessageCircle;
              return (
                <div key={row.key} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-[#0a1d2f]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#234b68] bg-[#0a2033] text-cyan-300">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-semibold text-white">{row.title}</span>
                    <span className="block truncate text-[9px] text-slate-500">{row.detail}</span>
                  </span>
                  <span className="whitespace-nowrap text-[9px] text-slate-600">
                    {row.created_at ? timeAgo(row.created_at) : ""}
                  </span>
                </div>
              );
            })}
            {!activityRows.length && (
              <div className="py-8 text-center text-xs text-slate-500">
                Activity will appear here as people use Nuru.
              </div>
            )}
          </div>
        </BentoCard>

        <BentoCard className="xl:col-span-3" title="Content library" icon={BookOpen}>
          <div className="grid grid-cols-2 gap-2">
            <LibraryStat label="Media" value={totalMedia || "—"} />
            <LibraryStat label="Reels" value={counts?.reels ?? platformSummary.data?.reels ?? "—"} />
            <LibraryStat label="Devotions" value={counts?.devotionals ?? platformSummary.data?.devotionals ?? "—"} />
            <LibraryStat label="Series" value={counts?.scriptureSeries ?? platformSummary.data?.series ?? "—"} />
            <LibraryStat label="Courses" value={counts?.courses ?? platformSummary.data?.courses ?? "—"} />
            <LibraryStat label="Posts" value={counts?.posts ?? platformSummary.data?.posts ?? "—"} />
          </div>
          <GhostButton onClick={() => onNavigate("content")} className="mt-3 min-h-9 w-full text-[10px]">
            Manage content <ArrowRight className="h-3.5 w-3.5" />
          </GhostButton>
        </BentoCard>

        <BentoCard className="xl:col-span-8" title="Operational Intelligence" icon={Gauge}>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <IntelligenceStat
              label="Media scale"
              value={totalMedia}
              detail="Total catalogue items"
              tone="cyan"
            />
            <IntelligenceStat
              label="Learning library"
              value={learningLibrary}
              detail="Devotions + series + courses"
              tone="blue"
            />
            <IntelligenceStat
              label="Approval load"
              value={pendingMediaRate + "%"}
              detail={pendingMediaCount.toLocaleString() + " media items pending"}
              tone={pendingMediaRate > 10 ? "amber" : "green"}
            />
            <IntelligenceStat
              label="Community records"
              value={communityRecords}
              detail="Messages + prayer requests + posts"
              tone="purple"
            />
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <div className="rounded-2xl border border-[#163a55] bg-[#04111f] p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Admin data coverage
              </p>
              <p className="mt-2 font-display text-2xl font-semibold text-white">
                {connectedSources}/{totalHealthSources}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">Connected data sources operational</p>
            </div>
            <div className="rounded-2xl border border-[#163a55] bg-[#04111f] p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Safety workload
              </p>
              <p className="mt-2 font-display text-2xl font-semibold text-white">
                {openReports.length.toLocaleString()}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">Open or in-review safety reports</p>
            </div>
            <div className="rounded-2xl border border-[#163a55] bg-[#04111f] p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Verification workload
              </p>
              <p className="mt-2 font-display text-2xl font-semibold text-white">
                {unverifiedMentorCount.toLocaleString()}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">Mentors still awaiting verification</p>
            </div>
          </div>
        </BentoCard>

        <BentoCard className="xl:col-span-4" title="Catalogue Operations" icon={Music2}>
          <div className="space-y-2">
            <ImportStatusRow label="Music scan" row={musicImport} />
            <ImportStatusRow label="Podcast scan" row={podcastImport} />
            <div className="grid grid-cols-2 gap-2">
              <MiniData
                label="Approved songs"
                value={counts?.approvedMusicItems ?? "—"}
                detail="YouTube music items"
              />
              <MiniData
                label="Video podcasts"
                value={counts?.approvedPodcastItems ?? "—"}
                detail="Approved YouTube items"
              />
              <MiniData
                label="Music sources"
                value={counts?.approvedMusicSources ?? "—"}
                detail="Approved + verified"
              />
              <MiniData
                label="Podcast sources"
                value={counts?.approvedPodcastSources ?? "—"}
                detail="Approved + verified"
              />
            </div>
            <GhostButton onClick={() => onNavigate("music")} className="min-h-10 w-full text-[10px]">
              Open media operations <ArrowRight className="h-3.5 w-3.5" />
            </GhostButton>
          </div>
        </BentoCard>

        <BentoCard className="xl:col-span-4" title="Attention Center" icon={TriangleAlert}>
          <div className="space-y-2">
            <AttentionAction
              label="Media awaiting review"
              value={pendingMediaCount}
              detail="Open the content and music review flow"
              urgent={pendingMediaCount > 0}
              onClick={() => onNavigate("music")}
            />
            <AttentionAction
              label="Safety reports"
              value={openReports.length}
              detail="Review reports that still need an admin decision"
              urgent={openReports.length > 0}
              onClick={() => onNavigate("moderation")}
            />
            <AttentionAction
              label="Mentor verification"
              value={unverifiedMentorCount}
              detail="Check mentors awaiting verification"
              urgent={unverifiedMentorCount > 0}
              onClick={() => onNavigate("users")}
            />
            <AttentionAction
              label="Data sources"
              value={attentionSources}
              detail={attentionSources ? "One or more data sources needs attention" : "All connected data sources are healthy"}
              urgent={attentionSources > 0}
              onClick={() => onNavigate("dashboard")}
            />
          </div>
        </BentoCard>

        <BentoCard className="xl:col-span-12" title="System Status" icon={ShieldCheck}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {healthChecks.map((check) => (
              <HealthTile key={check.label} label={check.label} error={check.error} loading={check.loading} />
            ))}
            <HealthTile
              label="YouTube API config"
              error={facts ? !facts.youtubeApiConfigured : factsError}
              loading={factsLoading}
              okText={facts?.youtubeApiConfigured ? "Configured" : "Unavailable"}
            />
          </div>
          <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold">
            <span className={["h-2 w-2 rounded-full", healthy ? "bg-emerald-400" : "bg-amber-400"].join(" ")} />
            <span className={healthy ? "text-emerald-300" : "text-amber-300"}>
              {healthy ? "All connected admin data sources are operational." : "One or more data sources needs attention."}
            </span>
          </div>
        </BentoCard>
      </section>
    </div>
  );
}

function BentoCard({
  title,
  icon: Icon,
  className = "",
  children,
}: {
  title: string;
  icon: LucideIcon;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={[
        "overflow-hidden rounded-[24px] border border-[#153b5c] bg-[#071727] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.16)]",
        className,
      ].join(" ")}
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function HeroMiniStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex min-h-[92px] flex-col justify-between rounded-2xl border border-white/10 bg-[#061522]/75 p-3 backdrop-blur-md">
      <Icon className="h-4 w-4 text-cyan-300" />
      <div>
        <p className="font-display text-xl font-semibold text-white">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        <p className="text-[9px] text-slate-400">{label}</p>
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
  onClick,
}: {
  label: string;
  value: number | string;
  detail: string;
  icon: LucideIcon;
  accent: "cyan" | "blue" | "purple" | "amber";
  onClick: () => void;
}) {
  const accentClasses = {
    cyan: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300",
    blue: "border-blue-400/25 bg-blue-400/10 text-blue-300",
    purple: "border-violet-400/25 bg-violet-400/10 text-violet-300",
    amber: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  }[accent];

  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-[22px] border border-[#153b5c] bg-[#071727] p-4 text-left shadow-[0_14px_40px_rgba(0,0,0,0.14)] transition hover:-translate-y-0.5 hover:border-cyan-400/35"
    >
      <div className="flex items-start gap-3">
        <span className={["flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border", accentClasses].join(" ")}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-medium text-slate-400">{label}</p>
            <ArrowRight className="h-3.5 w-3.5 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-cyan-300" />
          </div>
          <p className="mt-1 font-display text-2xl font-semibold text-white">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          <p className="mt-1 truncate text-[10px] text-slate-500">{detail}</p>
        </div>
      </div>
    </button>
  );
}

function MiniData({
  label,
  value,
  detail,
}: {
  label: string;
  value: number | string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-[#163a55] bg-[#04111f] p-3">
      <p className="text-[9px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold text-white">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="mt-1 text-[9px] text-slate-600">{detail}</p>
    </div>
  );
}

function QuickAction({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <GhostButton onClick={onClick} className="min-h-11 w-full justify-start px-4 text-xs">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="flex-1 text-left">{label}</span>
      <ArrowRight className="h-3.5 w-3.5 opacity-60" />
    </GhostButton>
  );
}

function PulseStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-[#163a55] bg-[#04111f] p-3">
      <p className="font-display text-xl font-semibold text-white">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="mt-1 text-[9px] text-slate-500">{label}</p>
    </div>
  );
}

function LibraryStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-[#163a55] bg-[#04111f] p-3">
      <p className="text-[9px] text-slate-500">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold text-white">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function IntelligenceStat({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number | string;
  detail: string;
  tone: "cyan" | "blue" | "purple" | "amber" | "green";
}) {
  const toneClasses = {
    cyan: "border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-300",
    blue: "border-blue-400/20 bg-blue-400/[0.06] text-blue-300",
    purple: "border-violet-400/20 bg-violet-400/[0.06] text-violet-300",
    amber: "border-amber-400/20 bg-amber-400/[0.06] text-amber-300",
    green: "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300",
  }[tone];

  return (
    <div className={["rounded-2xl border p-4", toneClasses].join(" ")}>
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] opacity-80">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-white">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="mt-1 text-[10px] text-slate-500">{detail}</p>
    </div>
  );
}

function AttentionAction({
  label,
  value,
  detail,
  urgent,
  onClick,
}: {
  label: string;
  value: number;
  detail: string;
  urgent: boolean;
  onClick: () => void;
}) {
  return (
    <GhostButton onClick={onClick} className="min-h-14 w-full justify-start rounded-2xl px-3 py-2.5 text-left">
      <span
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
          urgent
            ? "border-amber-400/25 bg-amber-400/10 text-amber-300"
            : "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
        ].join(" ")}
      >
        {value > 99 ? "99+" : value}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-semibold text-white">{label}</span>
        <span className="block truncate text-[9px] text-slate-500">{detail}</span>
      </span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
    </GhostButton>
  );
}

function ImportStatusRow({
  label,
  row,
}: {
  label: string;
  row:
    | {
        status: string;
        importedTotal: number;
        pagesProcessed: number;
        hasNextPage: boolean;
        lastError: string | null;
        updatedAt: string;
      }
    | undefined;
}) {
  if (!row) {
    return (
      <div className="rounded-2xl border border-[#163a55] bg-[#04111f] p-3">
        <p className="text-[10px] font-semibold text-slate-300">{label}</p>
        <p className="mt-1 text-[10px] text-slate-500">No import record is available.</p>
      </div>
    );
  }
  const problem = Boolean(row.lastError);
  return (
    <div className="rounded-2xl border border-[#163a55] bg-[#04111f] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold text-slate-300">{label}</p>
        <span
          className={[
            "rounded-full border px-2 py-0.5 text-[9px] font-semibold capitalize",
            problem
              ? "border-rose-400/20 bg-rose-400/10 text-rose-300"
              : row.status === "running"
                ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
                : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
          ].join(" ")}
        >
          {problem ? "attention" : row.status}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <p className="text-slate-600">Imported total</p>
          <p className="mt-0.5 font-semibold text-white">{row.importedTotal.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-slate-600">Pages processed</p>
          <p className="mt-0.5 font-semibold text-white">{row.pagesProcessed.toLocaleString()}</p>
        </div>
      </div>
      <p className="mt-2 text-[9px] text-slate-600">
        Updated {timeAgo(row.updatedAt)}{row.hasNextPage ? " · continuation saved" : ""}
      </p>
      {row.lastError && <p className="mt-1 text-[9px] text-rose-300">{row.lastError}</p>}
    </div>
  );
}

function HealthTile({
  label,
  error,
  loading,
  okText = "Operational",
}: {
  label: string;
  error: boolean;
  loading: boolean;
  okText?: string;
}) {
  const state = error
    ? { text: "Attention", textClass: "text-rose-300", dot: "bg-rose-400" }
    : loading
      ? { text: "Syncing", textClass: "text-amber-300", dot: "bg-amber-400" }
      : { text: okText, textClass: "text-emerald-300", dot: "bg-emerald-400" };

  return (
    <div className="rounded-2xl border border-[#163a55] bg-[#04111f] p-3">
      <p className="text-[10px] font-semibold text-slate-300">{label}</p>
      <p className={["mt-2 flex items-center gap-1.5 text-[9px] font-semibold", state.textClass].join(" ")}>
        <span className={["h-1.5 w-1.5 rounded-full", state.dot].join(" ")} />
        {state.text}
      </p>
    </div>
  );
}
