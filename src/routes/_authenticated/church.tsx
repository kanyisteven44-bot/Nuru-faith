import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  BarChart3,
  CalendarDays,
  CalendarPlus,
  ChevronRight,
  MapPin,
  Megaphone,
  Plus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchChurches,
  fetchEvents,
  fetchGroups,
  fetchMentors,
  fetchMyRoles,
  fetchProfile,
} from "@/services/content";
import { AppShell, Avatar, ScreenHeader } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState } from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/church")({
  head: () => ({
    meta: [
      { title: "My Church — Nuru Faith" },
      { name: "description", content: "Your church on Nuru Faith: members, groups and events." },
    ],
  }),
  component: ChurchScreen,
});

function ChurchScreen() {
  const { userId } = useAuth();

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

  // Counts and lists are derived from what this user is actually allowed to read.
  const churchGroups = (groups.data ?? []).filter((g) => g.church_id === churchId);
  const churchEvents = (events.data ?? [])
    .filter((e) => e.church_id === churchId)
    .filter((e) => new Date(e.starts_at).getTime() >= Date.now() - 3600_000)
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  const leaders = (mentors.data ?? []).filter((m) => m.church_id === churchId);
  const memberCount = churchGroups.reduce((n, g) => n + (g.member_count ?? 0), 0);

  if (profile.isLoading || churches.isLoading) {
    return (
      <AppShell>
        <ScreenHeader title="My Church" back />
        <div className="px-4 pt-4">
          <CardSkeleton count={3} height="h-20" />
        </div>
      </AppShell>
    );
  }

  if (!church) {
    return (
      <AppShell>
        <ScreenHeader title="My Church" back />
        <div className="px-4 pt-4">
          <EmptyState
            title="You haven't joined a church yet"
            description="Join a church to see its groups, events and leaders here."
            action={
              <Link
                to="/explore"
                search={{ q: "", kind: "churches" }}
                className="inline-flex min-h-11 items-center rounded-full bg-[linear-gradient(180deg,var(--forest-hi),var(--primary))] px-5 text-sm font-bold text-foreground nuru-raise"
              >
                Find a church
              </Link>
            }
          />
        </div>
      </AppShell>
    );
  }

  const place = [church.city, church.country].filter(Boolean).join(", ");

  return (
    <AppShell>
      <ScreenHeader title="My Church" back />

      <div className="px-4 pb-6">
        {/* Cover, then the round mark lifting into it, as the board lays it out. */}
        <section className="nuru-card overflow-hidden">
          <div className="relative h-[168px]">
            {church.cover_url ? (
              <img src={church.cover_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="block h-full w-full bg-[linear-gradient(140deg,#17456E,#0f2a49)]" />
            )}
            <span className="absolute inset-0 bg-[linear-gradient(to_top,var(--card),rgba(25,32,29,0.25)_62%,transparent)]" />
          </div>

          <div className="px-4 pb-4">
            <div className="flex gap-3">
              <span className="-mt-11 block h-[76px] w-[76px] shrink-0 overflow-hidden rounded-full ring-4 ring-[var(--card)]">
                {church.logo_url ? (
                  <img src={church.logo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-surface-2 text-ink-2">
                    <Users className="h-7 w-7" strokeWidth={1.6} />
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1 pt-1.5">
                <h1 className="flex items-center gap-1.5 font-display text-[24px] leading-tight">
                  <span className="truncate">{church.name}</span>
                  {church.verified && (
                    <BadgeCheck className="h-4.5 w-4.5 shrink-0 text-leaf" aria-label="Verified" />
                  )}
                </h1>
                {church.description && (
                  <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-ink-2">
                    {church.description}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {place && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-[linear-gradient(180deg,#143254,#0C2440)] px-3 py-1.5 text-[12px] font-semibold text-ink-2">
                  <MapPin className="h-3.5 w-3.5" strokeWidth={1.9} />
                  {place}
                </span>
              )}
              {memberCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-[linear-gradient(180deg,#143254,#0C2440)] px-3 py-1.5 text-[12px] font-semibold text-ink-2">
                  <Users className="h-3.5 w-3.5" strokeWidth={1.9} />
                  {memberCount} members
                </span>
              )}
            </div>

            <Link
              to="/groups"
              className="nuru-raise mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(180deg,var(--forest-hi),var(--primary))] text-[14px] font-bold text-foreground"
            >
              <Plus className="h-4 w-4" strokeWidth={2.3} />
              Join church group
            </Link>
          </div>
        </section>

        {/* Gatherings. The schema has no recurring service times, so these are
            the church's real upcoming events rather than an invented timetable. */}
        <SectionHead title="Gatherings" to="/events" show={churchEvents.length > 0} />
        {churchEvents.length > 0 ? (
          <ul className="space-y-2">
            {churchEvents.slice(0, 3).map((e) => (
              <li key={e.id}>
                <Link to="/events" className="nuru-card flex items-center gap-3 p-2.5">
                  <span className="nuru-disc nuru-disc-terra h-10 w-10">
                    <CalendarDays className="h-[18px] w-[18px]" strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[17px] leading-tight">
                      {e.title}
                    </span>
                    <span className="block truncate text-[12px] text-ink-3">
                      {new Date(e.starts_at).toLocaleDateString(undefined, {
                        weekday: "long",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={2} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="nuru-card p-4 text-[13px] text-ink-3">
            No gatherings scheduled yet — your church can add them.
          </p>
        )}

        {/* Leaders, from the mentors this church has listed. */}
        {leaders.length > 0 && (
          <>
            <SectionHead title="Our leaders" to="/mentors" show />
            <ul className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4">
              {leaders.slice(0, 8).map((m) => (
                <li key={m.id} className="w-[84px] shrink-0 text-center">
                  <Link to="/mentors/$id" params={{ id: m.id }}>
                    <Avatar
                      url={m.photo_url}
                      name={m.display_name}
                      seed={m.id}
                      size="lg"
                      className="mx-auto h-[68px] w-[68px]"
                    />
                    <span className="mt-1.5 block truncate text-[12px] font-semibold">
                      {m.display_name}
                    </span>
                    {m.role_title && (
                      <span className="block truncate text-[10.5px] text-ink-3">
                        {m.role_title}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Management tools stay for admins. */}
        <h2 className="mt-6 mb-3 font-display text-[22px] leading-none">Manage</h2>
        <div className="space-y-2">
          <AdminAction icon={Users} label="Manage members" allowed={isAdmin} to="/community" />
          <AdminAction icon={CalendarPlus} label="Create events" allowed={isAdmin} to="/events" />
          <AdminAction
            icon={Megaphone}
            label="Share announcements"
            allowed={isAdmin}
            to="/create"
          />
          <AdminAction icon={BarChart3} label="View analytics" allowed={isAdmin} to={null} />
        </div>

        {!isAdmin && (
          <p className="pt-4 text-center text-[11px] text-ink-3">
            Management tools are available to your church's admins.
          </p>
        )}
      </div>
    </AppShell>
  );
}

function SectionHead({
  title,
  to,
  show,
}: {
  title: string;
  to: "/events" | "/mentors";
  show: boolean;
}) {
  return (
    <div className="mt-6 mb-3 flex items-center justify-between gap-2">
      <h2 className="font-display text-[22px] leading-none">{title}</h2>
      {show && (
        <Link
          to={to}
          className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-ink-2"
        >
          See all
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </Link>
      )}
    </div>
  );
}

function AdminAction({
  icon: Icon,
  label,
  allowed,
  to,
}: {
  icon: LucideIcon;
  label: string;
  allowed: boolean;
  to: "/community" | "/events" | "/create" | null;
}) {
  const inner = (
    <>
      <span className="nuru-disc h-9 w-9">
        <Icon className="h-4 w-4" strokeWidth={1.9} />
      </span>
      <span className="flex-1 text-sm font-semibold">{label}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={2} />
    </>
  );
  if (!allowed || !to)
    return (
      <button
        type="button"
        onClick={() =>
          toast(allowed ? `${label} isn't available yet.` : "Church admin access required.")
        }
        className="nuru-card flex w-full items-center gap-3 p-2.5 text-left opacity-70"
      >
        {inner}
      </button>
    );
  return (
    <Link to={to} className="nuru-card flex items-center gap-3 p-2.5">
      {inner}
    </Link>
  );
}
