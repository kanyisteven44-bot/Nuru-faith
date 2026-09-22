import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { fetchFollowingIds } from "@/services/reels";
import {
  fetchGroups,
  fetchMyFollowing,
  fetchPeople,
  fetchMyGroupIds,
  fetchMyPostLikes,
  fetchMySavedPosts,
  fetchPosts,
  joinGroup,
  leaveGroup,
} from "@/services/content";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { PersonRow } from "@/components/nuru/PersonRow";
import { PostCard, type PostRow } from "@/components/nuru/PostCard";
import { CardSkeleton, EmptyState, ErrorState, PillTabs } from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({
    meta: [
      { title: "Community — Nuru Faith" },
      {
        name: "description",
        content: "Share testimonies, ask for prayer and join Christian groups on Nuru Faith.",
      },
      { property: "og:title", content: "Community — Nuru Faith" },
      { property: "og:description", content: "Testimonies, prayer and Christian groups." },
    ],
  }),
  component: CommunityScreen,
});

const TABS = ["For You", "Following", "People", "Groups"] as const;
type Tab = (typeof TABS)[number];

function CommunityScreen() {
  const { userId } = useAuth();
  const [tab, setTab] = useState<Tab>("For You");

  const posts = useQuery({ queryKey: ["posts"], queryFn: () => fetchPosts() });
  const likes = useQuery({
    queryKey: ["post-likes", userId],
    queryFn: () => fetchMyPostLikes(userId!),
    enabled: !!userId,
  });
  const saves = useQuery({
    queryKey: ["saved-posts", userId],
    queryFn: () => fetchMySavedPosts(userId!),
    enabled: !!userId,
  });

  const likedIds = new Set(likes.data ?? []);
  const savedIds = new Set(saves.data ?? []);
  const rows = (posts.data ?? []) as PostRow[];
  const following = useQuery({
    queryKey: ["following", userId],
    queryFn: () => fetchMyFollowing(userId!),
    enabled: !!userId && tab === "Following",
  });
  const followingRows =
    tab === "Following"
      ? rows.filter((p) => p.author_id && (following.data ?? []).includes(p.author_id))
      : rows;

  return (
    <AppShell>
      <ScreenHeader
        title="Community"
        right={
          <Link
            to="/explore"
            search={{ q: "", kind: "all" }}
            aria-label="Search community"
            className="p-1 text-secondary-foreground"
          >
            <Search className="h-5 w-5" />
          </Link>
        }
      />

      <div className="px-4 pb-1">
        <PillTabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      {tab === "Groups" ? (
        <GroupsTab userId={userId} />
      ) : tab === "People" ? (
        <PeopleTab userId={userId} />
      ) : (
        <div className="space-y-3 px-4 pt-2">
          {posts.isLoading && <CardSkeleton count={3} height="h-48" />}
          {posts.isError && (
            <ErrorState message="Couldn't load the feed." onRetry={() => void posts.refetch()} />
          )}
          {!posts.isLoading && followingRows.length === 0 && (
            <EmptyState
              title={tab === "Following" ? "Nothing from people you follow" : "No posts yet"}
              description={
                tab === "Following"
                  ? "Join a group to see what your community is sharing."
                  : "Be the first to share what God is doing."
              }
              action={
                <Link
                  to="/create"
                  className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
                >
                  Create a post
                </Link>
              }
            />
          )}
          {followingRows.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              userId={userId}
              liked={likedIds.has(post.id)}
              saved={savedIds.has(post.id)}
            />
          ))}
        </div>
      )}

      <Link
        to="/create"
        aria-label="Create a post"
        className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground nuru-glow transition-transform active:scale-95"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </AppShell>
  );
}

/**
 * Everyone else on Nuru, so people can actually find each other. Until this
 * existed the only way to follow anyone was from a Reels video, which left
 * the Followers and Following lists empty for everybody.
 */
function PeopleTab({ userId }: { userId: string | null }) {
  const people = useQuery({
    queryKey: ["people-directory", userId],
    queryFn: () => fetchPeople(userId!),
    enabled: !!userId,
  });

  const myFollowing = useQuery({
    queryKey: ["my-following-ids", userId],
    queryFn: () => fetchFollowingIds(userId!),
    enabled: !!userId,
  });
  const followingIds = new Set(myFollowing.data ?? []);

  const rows = people.data ?? [];

  return (
    <div className="px-4 pt-2">
      {people.isLoading && <CardSkeleton count={5} height="h-14" />}
      {people.isError && (
        <ErrorState message="Couldn't load people." onRetry={() => void people.refetch()} />
      )}
      {people.isSuccess && rows.length === 0 && (
        <EmptyState
          title="No one else here yet"
          description="As more people join Nuru Faith, they'll show up here to follow."
        />
      )}
      {rows.map((person) => (
        <PersonRow
          key={person.id}
          person={person}
          viewerId={userId}
          isFollowing={followingIds.has(person.id)}
          invalidate={[["people-directory", userId]]}
        />
      ))}
    </div>
  );
}

function GroupsTab({ userId }: { userId: string | null }) {
  const qc = useQueryClient();
  const groups = useQuery({ queryKey: ["groups"], queryFn: () => fetchGroups() });
  const mine = useQuery({
    queryKey: ["my-group-ids", userId],
    queryFn: () => fetchMyGroupIds(userId!),
    enabled: !!userId,
  });
  const joined = new Set(mine.data ?? []);

  async function toggle(groupId: string, isMember: boolean) {
    if (!userId) {
      toast.error("Sign in to join groups");
      return;
    }
    try {
      if (isMember) await leaveGroup(userId, groupId);
      else await joinGroup(userId, groupId);
      await qc.invalidateQueries({ queryKey: ["my-group-ids", userId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update that group");
    }
  }

  return (
    <div className="space-y-2 px-4 pt-2">
      {groups.isLoading && <CardSkeleton count={4} height="h-16" />}
      {!groups.isLoading && (groups.data ?? []).length === 0 && (
        <EmptyState title="No groups yet" description="Groups from your church will appear here." />
      )}
      {(groups.data ?? []).map((g) => {
        const isMember = joined.has(g.id);
        return (
          <div key={g.id} className="nuru-card flex items-center gap-3 p-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-primary/12 text-cyan">
              <Users className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{g.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {g.description ?? `${g.member_count ?? 0} members`}
              </span>
            </span>
            <button
              type="button"
              onClick={() => void toggle(g.id, isMember)}
              className={
                isMember
                  ? "flex shrink-0 items-center gap-1 rounded-lg border border-border-strong bg-surface-2 px-3 py-1.5 text-[11px] font-semibold text-secondary-foreground"
                  : "shrink-0 rounded-lg bg-primary px-3.5 py-1.5 text-[11px] font-semibold text-primary-foreground"
              }
            >
              {isMember ? (
                <>
                  <Check className="h-3 w-3" /> Joined
                </>
              ) : (
                "Join"
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
