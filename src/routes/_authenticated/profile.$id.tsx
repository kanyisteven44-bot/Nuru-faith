import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Church, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { fetchProfile, fetchProfileCounts } from "@/services/content";
import { fetchFollowingIds, toggleFollow } from "@/services/reels";
import { AppShell, Avatar, ScreenHeader } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState } from "@/components/nuru/Primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/profile/$id")({
  component: PublicProfileScreen,
});

function PublicProfileScreen() {
  const { id } = Route.useParams();
  const { userId } = useAuth();
  const qc = useQueryClient();

  const profile = useQuery({
    queryKey: ["public-profile", id],
    queryFn: () => fetchProfile(id),
    enabled: !!id,
  });

  const counts = useQuery({
    queryKey: ["profile-counts", id],
    queryFn: () => fetchProfileCounts(id),
    enabled: !!id,
  });

  const following = useQuery({
    queryKey: ["my-following-ids", userId],
    queryFn: () => fetchFollowingIds(userId!),
    enabled: !!userId && userId !== id,
  });

  const isSelf = userId === id;
  const isFollowing = (following.data ?? []).includes(id);

  const follow = useMutation({
    mutationFn: () => toggleFollow(userId!, id, isFollowing),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["my-following-ids", userId] }),
        qc.invalidateQueries({ queryKey: ["profile-counts", id] }),
        qc.invalidateQueries({ queryKey: ["profile-counts", userId] }),
        qc.invalidateQueries({ queryKey: ["following", userId] }),
      ]);
    },
    onError: () => toast.error("Couldn't update that — try again"),
  });

  if (profile.isLoading) {
    return (
      <AppShell>
        <ScreenHeader title="Profile" back />
        <div className="px-4 pt-4">
          <CardSkeleton count={3} height="h-20" />
        </div>
      </AppShell>
    );
  }

  if (!profile.data) {
    return (
      <AppShell>
        <ScreenHeader title="Profile" back />
        <div className="px-4 pt-8">
          <EmptyState
            title="Profile unavailable"
            description="This member may no longer be available on Nuru Faith."
          />
        </div>
      </AppShell>
    );
  }

  const p = profile.data;
  const name = p.full_name?.trim() || p.username?.trim() || "Nuru member";

  return (
    <AppShell>
      <ScreenHeader title="Profile" back />
      <div className="space-y-3 px-4 pt-2">
        <section className="nuru-card p-5">
          <div className="flex items-start gap-4">
            <Avatar
              url={p.avatar_url ?? null}
              name={name}
              seed={id}
              size="lg"
              className="ring-2 ring-primary/20"
            />
            <div className="min-w-0 flex-1 pt-1">
              <h1 className="flex items-center gap-1.5 font-display text-xl font-bold">
                <span className="truncate">{name}</span>
                {p.verified && (
                  <BadgeCheck
                    aria-label="Verified"
                    className="h-4.5 w-4.5 shrink-0 text-cyan"
                  />
                )}
              </h1>
              {p.username && (
                <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                  @{p.username}
                </p>
              )}
              {p.bio && (
                <p className="mt-3 text-[13px] leading-relaxed text-secondary-foreground">
                  {p.bio}
                </p>
              )}
              {p.churches?.name && (
                <p className="mt-3 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <Church className="h-3.5 w-3.5 text-cyan" />
                  {p.churches.name}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border/70 pt-4 text-center">
            <Stat label="Posts" value={counts.data?.posts ?? 0} />
            <Stat label="Followers" value={counts.data?.followers ?? 0} />
            <Stat label="Following" value={counts.data?.following ?? 0} />
          </div>

          <div className="mt-4">
            {isSelf ? (
              <Link
                to="/profile"
                className="flex min-h-10 w-full items-center justify-center rounded-xl border border-border-strong bg-surface-2 text-sm font-semibold text-secondary-foreground"
              >
                View your profile
              </Link>
            ) : userId ? (
              <button
                type="button"
                disabled={follow.isPending}
                onClick={() => follow.mutate()}
                className={cn(
                  "flex min-h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60",
                  isFollowing
                    ? "border border-border-strong bg-surface-2 text-secondary-foreground"
                    : "bg-primary text-primary-foreground",
                )}
              >
                {!isFollowing && <UserPlus className="h-4 w-4" />}
                {isFollowing ? "Following" : "Follow"}
              </button>
            ) : null}
          </div>
        </section>

        <section className="nuru-card p-4">
          <h2 className="text-sm font-semibold">About this profile</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            Public profiles show only community information already available to signed-in Nuru
            members. Private mentorship, prayer-journal and account information never appears here.
          </p>
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-display text-lg font-semibold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
