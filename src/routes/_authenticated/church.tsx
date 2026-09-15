import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  BarChart3,
  CalendarPlus,
  Megaphone,
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
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState } from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/church")({
  head: () => ({
    meta: [
      { title: "Church — Nuru Faith" },
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

  // Counts are derived from what this user is actually allowed to read.
  const groupCount = (groups.data ?? []).filter((g) => g.church_id === churchId).length;
  const eventCount = (events.data ?? []).filter((e) => e.church_id === churchId).length;
  const mentorCount = (mentors.data ?? []).filter((m) => m.church_id === churchId).length;

  if (profile.isLoading || churches.isLoading) {
    return (
      <AppShell>
        <ScreenHeader title="Church Dashboard" />
        <div className="px-4 pt-4">
          <CardSkeleton count={3} height="h-20" />
        </div>
      </AppShell>
    );
  }

  if (!church) {
    return (
      <AppShell>
        <ScreenHeader title="Church Dashboard" />
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
      <ScreenHeader title="Church Dashboard" />

      <div className="px-4 pt-2">
        <section className="text-center">
          <h1 className="flex items-center justify-center gap-1.5 font-display text-lg font-semibold">
            {church.name}
            {church.verified && <BadgeCheck className="h-4 w-4 text-cyan" aria-label="Verified" />}
          </h1>
          <p className="text-[12px] text-muted-foreground">
            {[church.city, church.country].filter(Boolean).join(", ") || "Nuru Faith church"}
          </p>
        </section>

        <section className="mt-5 grid grid-cols-4 gap-2">
          <Stat value={groupCount} label="Groups" />
          <Stat value={eventCount} label="Events" />
          <Stat value={mentorCount} label="Mentors" />
          <Stat value={church.denomination ? 1 : 0} label="Campuses" />
        </section>

        <section className="space-y-2 pt-6">
          <AdminAction icon={Users} label="Manage Members" allowed={isAdmin} to="/community" />
          <AdminAction icon={CalendarPlus} label="Create Events" allowed={isAdmin} to="/events" />
          <AdminAction
            icon={Megaphone}
            label="Share Announcements"
            allowed={isAdmin}
            to="/create"
          />
          <AdminAction icon={BarChart3} label="View Analytics" allowed={isAdmin} to={null} />
        </section>

        {!isAdmin && (
          <p className="pt-4 text-center text-[11px] text-muted-foreground">
            Management tools are available to your church's admins.
          </p>
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
      <Icon className="h-4.5 w-4.5 shrink-0 text-cyan" strokeWidth={1.8} />
      <span className="flex-1 text-sm font-medium">{label}</span>
    </>
  );
  if (!allowed || !to)
    return (
      <button
        type="button"
        onClick={() =>
          toast(allowed ? `${label} isn't available yet.` : "Church admin access required.")
        }
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
