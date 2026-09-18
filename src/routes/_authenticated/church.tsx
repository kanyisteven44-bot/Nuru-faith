import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  BarChart3,
  BookMarked,
  CalendarPlus,
  ChevronRight,
  GraduationCap,
  Megaphone,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { resolveMedia } from "@/lib/media";
import { eventDate } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchChurches,
  fetchEvents,
  fetchGroups,
  fetchMentors,
  fetchMyRoles,
  fetchProfile,
} from "@/services/content";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState, PillTabs } from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/church")({
  head: () => ({
    meta: [
      { title: "My Church — Nuru Faith" },
      { name: "description", content: "Your church on Nuru Faith: members, groups and events." },
    ],
  }),
  component: ChurchScreen,
});

const TABS = ["About", "Services", "Leaders"] as const;
type Tab = (typeof TABS)[number];

function ChurchScreen() {
  const { userId } = useAuth();
  const [tab, setTab] = useState<Tab>("About");

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
  const churches = useQuery({ queryKey: ["churches"], queryFn: () => fetchChurches() });
  const groups = useQuery({ queryKey: ["groups"], queryFn: () => fetchGroups() });
  const events = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const mentors = useQuery({ queryKey: ["mentors"], queryFn: fetchMentors });
  const roles = useQuery({
    queryKey: ["roles", userId],
    queryFn: () => fetchMyRoles(userId!),
    enabled: !!userId,
  });

  const churchId = profile.data?.church_id ?? null;
  const church = (churches.data ?? []).find((c) => c.id === churchId) ?? null;
  const isAdmin = (roles.data ?? []).some(
    (r) => r.role === "super_admin" || (r.role === "church_admin" && r.church_id === churchId),
  );

  // Counts are derived from what this user is actually allowed to read.
  const churchGroups = (groups.data ?? []).filter((g) => g.church_id === churchId);
  const churchEvents = (events.data ?? [])
    .filter((e) => e.church_id === churchId)
    .filter((e) => new Date(e.ends_at ?? e.starts_at).getTime() >= Date.now())
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  const churchMentors = (mentors.data ?? []).filter((m) => m.church_id === churchId);

  if (profile.isLoading || churches.isLoading) {
    return (
      <AppShell>
        <ScreenHeader title="My Church" />
        <div className="px-4 pt-4">
          <CardSkeleton count={3} height="h-20" />
        </div>
      </AppShell>
    );
  }

  if (!church) {
    return (
      <AppShell>
        <ScreenHeader title="My Church" />
        <div className="px-4 pt-4">
          <EmptyState
            title="You haven't joined a church yet"
            description="Join a church to see its groups, events and announcements here."
            action={
              <Link
                to="/explore"
                search={{ q: "", kind: "churches" }}
                className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
              >
                Find a church
              </Link>
            }
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ScreenHeader title="My Church" />

      {/* Church hero */}
      <section className="px-4 pt-1">
        <div className="relative overflow-hidden rounded-2xl border border-border">
          <img
            src={resolveMedia(church.cover_url)}
            alt=""
            className="h-44 w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15" />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <h1 className="flex items-center gap-1.5 font-display text-[19px] leading-tight font-bold text-white drop-shadow">
              {church.name}
              {church.verified && (
                <BadgeCheck className="h-4 w-4 shrink-0 text-cyan" aria-label="Verified" />
              )}
            </h1>
            <p className="text-[12px] text-white/80 drop-shadow">
              {[church.denomination, church.city].filter(Boolean).join(" · ") ||
                "Nuru Faith church"}
            </p>
          </div>
        </div>
      </section>

      <div className="px-4 pt-4 pb-1">
        <PillTabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      <div className="space-y-2 px-4 pt-2">
        {tab === "About" && (
          <>
            <section className="grid grid-cols-3 gap-2 pb-2">
              <Stat value={churchGroups.length} label="Groups" />
              <Stat value={churchEvents.length} label="Events" />
              <Stat value={churchMentors.length} label="Mentors" />
            </section>

            {church.description && (
              <p className="pb-2 text-[13px] leading-relaxed text-secondary-foreground">
                {church.description}
              </p>
            )}

            <Row icon={Users} label="Groups" to="/groups" />
            <Row icon={BookMarked} label="Liturgy & Books" to={null} />
            <Row icon={GraduationCap} label="Catechism" to={null} />
            <Row icon={Megaphone} label="Announcements" to="/community" />
          </>
        )}

        {tab === "Services" && (
          <>
            <p className="pb-1 text-[11px] tracking-wide text-muted-foreground uppercase">
              Upcoming
            </p>
            {churchEvents.length === 0 && (
              <EmptyState
                title="Nothing scheduled yet"
                description="Your church's services and events will appear here."
              />
            )}
            {churchEvents.map((e) => (
              <Link
                key={e.id}
                to="/events"
                className="nuru-card flex items-center gap-3 px-4 py-3.5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{e.title}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {eventDate(e.starts_at)}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </>
        )}

        {tab === "Leaders" && (
          <>
            {churchMentors.length === 0 && (
              <EmptyState
                title="No leaders listed yet"
                description="Verified mentors and leaders from your church will appear here."
              />
            )}
            {churchMentors.map((m) => (
              <Link
                key={m.id}
                to="/mentors/$id"
                params={{ id: m.id }}
                className="nuru-card flex items-center gap-3 px-4 py-3.5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{m.display_name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {m.role_title ?? "Leader"}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </>
        )}

        {/* Church admin tools stay available to the people who run the church. */}
        {isAdmin && (
          <section className="space-y-2 pt-5">
            <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Church admin
            </p>
            <Row icon={Users} label="Manage Members" to="/community" />
            <Row icon={CalendarPlus} label="Create Events" to="/events" />
            <Row icon={Megaphone} label="Share Announcements" to="/create" />
            <Row icon={BarChart3} label="View Analytics" to={null} />
          </section>
        )}
      </div>
    </AppShell>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="nuru-card flex flex-col items-center px-2 py-3">
      <span className="font-display text-lg font-bold text-cyan">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  to,
}: {
  icon: LucideIcon;
  label: string;
  to: "/community" | "/events" | "/create" | "/groups" | null;
}) {
  const inner = (
    <>
      <Icon className="h-4.5 w-4.5 shrink-0 text-cyan" strokeWidth={1.8} />
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </>
  );
  if (!to)
    return (
      <button
        type="button"
        onClick={() => toast(`${label} isn't available yet.`)}
        className="nuru-card flex w-full items-center gap-3 px-4 py-3.5 text-left opacity-70"
      >
        {inner}
      </button>
    );
  return (
    <Link to={to} className="nuru-card flex items-center gap-3 px-4 py-3.5">
      {inner}
    </Link>
  );
}
