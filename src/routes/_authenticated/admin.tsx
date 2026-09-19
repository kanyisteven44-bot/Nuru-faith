import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Flag, LayoutDashboard, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { eventDate } from "@/lib/format";
import {
  fetchChurches,
  fetchEvents,
  fetchGroups,
  fetchMentors,
  fetchMyRoles,
  fetchServeOpportunities,
} from "@/services/content";
import { CardSkeleton, ComingSoon, EmptyState, SectionHeader } from "@/components/nuru/Primitives";
import { NuruLogo } from "@/components/nuru/Logo";

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
  const roles = useQuery({
    queryKey: ["roles", userId],
    queryFn: () => fetchMyRoles(userId!),
    enabled: !!userId,
  });
  const churches = useQuery({ queryKey: ["churches"], queryFn: () => fetchChurches() });
  const events = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const groups = useQuery({ queryKey: ["groups"], queryFn: () => fetchGroups() });
  const mentors = useQuery({ queryKey: ["mentors"], queryFn: fetchMentors });
  const serve = useQuery({ queryKey: ["serve"], queryFn: fetchServeOpportunities });

  const isSuper = (roles.data ?? []).some((r) => r.role === "super_admin");
  const isAdmin = isSuper || (roles.data ?? []).some((r) => r.role === "church_admin");
  const myChurchIds = (roles.data ?? []).map((r) => r.church_id).filter(Boolean);
  const scoped = isSuper
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
          description="This dashboard is for church admins. Ask your church leader to grant you access."
          action={
            <Link to="/home" className="mt-2 text-sm font-semibold text-cyan">
              Back to Nuru Faith
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface/90 px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <NuruLogo compact />
          <span className="hidden items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs text-cyan sm:flex">
            <ShieldCheck className="h-3.5 w-3.5" /> {isSuper ? "Super admin" : "Church admin"}
          </span>
        </div>
        <Link to="/home" className="text-sm font-medium text-cyan">
          Back to app
        </Link>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        <div>
          <h1 className="font-display text-2xl font-semibold">Church dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage your community, teaching and gatherings.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Churches" value={scoped.length} icon={LayoutDashboard} />
          <Metric label="Groups" value={groups.data?.length ?? 0} icon={Users} />
          <Metric label="Upcoming events" value={events.data?.length ?? 0} icon={CalendarDays} />
          <Metric label="Mentors" value={mentors.data?.length ?? 0} icon={ShieldCheck} />
        </div>

        <section>
          <SectionHeader title="Your churches" />
          <div className="grid gap-3 md:grid-cols-2">
            {scoped.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No church is linked to your admin role yet.
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

        <section className="grid gap-3 md:grid-cols-3">
          <Panel title="Publish content" icon={LayoutDashboard} />
          <Panel title="Moderation queue" icon={Flag} />
          <Panel title="Member management" icon={Users} />
        </section>
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
  value: number;
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
