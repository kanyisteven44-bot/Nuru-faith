import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Church, Image as ImageIcon, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { COMMUNITY_KIND_FOR_TAB, type CommunityPostKind } from "@/lib/communityFeed";
import { useAuth } from "@/hooks/useAuth";
import { fetchFollowingIds } from "@/services/reels";
import {
  COMMUNITY_PAGE_SIZE,
  PEOPLE_PAGE_SIZE,
  fetchGroups,
  fetchMyFollowing,
  fetchPeoplePage,
  fetchMyGroupIds,
  fetchMyPostLikes,
  fetchMySavedPosts,
  fetchPostPage,
  fetchProfile,
  joinGroup,
  leaveGroup,
} from "@/services/content";
import { AppShell, Avatar, BrandBar } from "@/components/nuru/AppShell";
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

/**
 * The board's four content filters lead, then the two directories the app
 * already had. "All" is what the board calls the unfiltered feed.
 */
const TABS = ["All", "Prayer", "Testimony", "News", "Following", "People", "Groups"] as const;
type Tab = (typeof TABS)[number];

/** Which post `kind` each content chip narrows the feed to. */
const KIND_FOR_TAB: Partial<Record<Tab, CommunityPostKind>> = COMMUNITY_KIND_FOR_TAB;

function CommunityScreen() {
  const { userId } = useAuth();
  const [tab, setTab] = useState<Tab>("All");

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
  // Named only when the person actually belongs to one.
  const churchName = profile.data?.church_id ? "My church" : "All of Nuru";

  const following = useQuery({
    queryKey: ["following", userId],
    queryFn: () => fetchMyFollowing(userId!),
    enabled: !!userId && tab === "Following",
  });
  const followingIds = following.data ?? [];

  const kind = KIND_FOR_TAB[tab];
  const posts = useInfiniteQuery({
    queryKey: ["posts", userId, kind ?? "all", tab === "Following" ? followingIds : "all"],
    queryFn: ({ pageParam }) =>
      fetchPostPage(pageParam, tab === "Following" ? followingIds : undefined, kind),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === COMMUNITY_PAGE_SIZE ? pages.length : undefined,
    enabled:
      tab !== "People" &&
      tab !== "Groups" &&
      (tab !== "Following" || (!!userId && following.isSuccess)),
  });
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
  const rows = (posts.data?.pages.flat() ?? []) as PostRow[];
  const feedLoading = posts.isLoading || (tab === "Following" && following.isPending);
  const feedFailed = posts.isError || (tab === "Following" && following.isError);
  const feedReady = posts.isSuccess && (tab !== "Following" || following.isSuccess);

  return (
    <AppShell>
      <BrandBar />

      <div className="px-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-[36px] leading-none">Community</h1>
          <Link
            to="/explore"
            search={{ q: "", kind: "all" }}
            aria-label="Search community"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-2 text-ink-2"
          >
            <Search className="h-4 w-4" />
          </Link>
        </div>

        {/* Which church's people you are looking at. */}
        <div className="mt-3 flex justify-center">
          <Link
            to="/church"
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-border-strong bg-surface-2 py-1.5 pr-3 pl-1.5 text-[13px] font-semibold"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-ink-2">
              <Church className="h-3.5 w-3.5" strokeWidth={1.9} />
            </span>
            <span className="truncate">{churchName}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={2} />
          </Link>
        </div>

        {/* Composer — opens the real Create screen rather than editing here. */}
        <Link
          to="/create"
          className="mt-3 flex items-center gap-2.5 rounded-full border border-border-strong bg-surface py-2 pr-2 pl-2"
        >
          <Avatar
            url={profile.data?.avatar_url ?? null}
            name={profile.data?.full_name ?? ""}
            seed={userId}
            size="sm"
            className="h-9 w-9"
          />
          <span className="min-w-0 flex-1 truncate text-[13px] text-ink-3">
            Share an update, prayer or encouragement…
          </span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2">
            <ImageIcon className="h-4 w-4" strokeWidth={1.9} />
          </span>
        </Link>

        <PillTabs className="mt-3" tabs={TABS} value={tab} onChange={setTab} />
      </div>

      {tab === "Groups" ? (
        <GroupsTab userId={userId} />
      ) : tab === "People" ? (
        <PeopleTab userId={userId} />
      ) : (
        <div className="space-y-3 px-4 pt-2">
          {feedLoading && <CardSkeleton count={3} height="h-48" />}
          {feedFailed && (
            <ErrorState
              message="Couldn't load the feed."
              onRetry={() => void (following.isError ? following.refetch() : posts.refetch())}
            />
          )}
          {feedReady && !feedFailed && rows.length === 0 && (
            <EmptyState
              title={tab === "Following" ? "Nothing from people you follow" : "No posts yet"}
              description={
                tab === "Following"
                  ? "Follow people in the People tab to see their updates here."
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
          {rows.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              userId={userId}
              liked={likedIds.has(post.id)}
              saved={savedIds.has(post.id)}
            />
          ))}
          {posts.hasNextPage && (
            <button
              type="button"
              disabled={posts.isFetchingNextPage}
              onClick={() => void posts.fetchNextPage()}
              className="nuru-card flex min-h-11 w-full items-center justify-center text-sm font-semibold text-leaf disabled:opacity-50"
            >
              {posts.isFetchingNextPage ? "Loading…" : "Load more posts"}
            </button>
          )}
        </div>
      )}
    </AppShell>
  );
}

/**
 * Everyone else on Nuru, so people can actually find each other. Until this
 * existed the only way to follow anyone was from a Reels video, which left
 * the Followers and Following lists empty for everybody.
 */
function PeopleTab({ userId }: { userId: string | null }) {
  const people = useInfiniteQuery({
    queryKey: ["people-directory", userId],
    queryFn: ({ pageParam }) => fetchPeoplePage(userId!, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === PEOPLE_PAGE_SIZE ? pages.length : undefined,
    enabled: !!userId,
  });

  const myFollowing = useQuery({
    queryKey: ["my-following-ids", userId],
    queryFn: () => fetchFollowingIds(userId!),
    enabled: !!userId,
  });
  const followingIds = new Set(myFollowing.data ?? []);

  const rows = people.data?.pages.flat() ?? [];

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
      {people.hasNextPage && (
        <button
          type="button"
          disabled={people.isFetchingNextPage}
          onClick={() => void people.fetchNextPage()}
          className="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl border border-border-strong bg-surface-2 text-sm font-semibold text-leaf disabled:opacity-50"
        >
          {people.isFetchingNextPage ? "Loading…" : "Load more people"}
        </button>
      )}
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

  const membership = useMutation({
    mutationFn: async ({ groupId, isMember }: { groupId: string; isMember: boolean }) => {
      if (!userId) throw new Error("Sign in to join groups");
      if (isMember) await leaveGroup(userId, groupId);
      else await joinGroup(userId, groupId);
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["my-group-ids", userId] }),
        qc.invalidateQueries({ queryKey: ["groups"] }),
        qc.invalidateQueries({ queryKey: ["chat-groups", userId] }),
      ]);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Couldn't update that group"),
  });

  return (
    <div className="space-y-2 px-4 pt-2">
      {groups.isLoading && <CardSkeleton count={4} height="h-16" />}
      {(groups.isError || mine.isError) && (
        <ErrorState
          message="Couldn't load groups or your memberships."
          onRetry={() => {
            if (groups.isError) void groups.refetch();
            if (mine.isError) void mine.refetch();
          }}
        />
      )}
      {groups.isSuccess && (groups.data ?? []).length === 0 && (
        <EmptyState title="No groups yet" description="Groups from your church will appear here." />
      )}
      {(groups.data ?? []).map((g) => {
        const isMember = joined.has(g.id);
        return (
          <div key={g.id} className="nuru-card flex items-center gap-3 p-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-primary/12 text-leaf">
              <Users className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <Link
              to="/groups"
              search={{ group: g.id }}
              className="min-w-0 flex-1 rounded-lg py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="block truncate text-sm font-semibold">{g.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {g.description ?? `${g.member_count ?? 0} members`}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => membership.mutate({ groupId: g.id, isMember })}
              disabled={!mine.isSuccess || membership.isPending}
              aria-busy={membership.isPending && membership.variables?.groupId === g.id}
              className={
                isMember
                  ? "flex min-h-11 shrink-0 items-center gap-1 disabled:opacity-50 rounded-lg border border-border-strong bg-surface-2 px-3 py-1.5 text-[11px] font-semibold text-secondary-foreground"
                  : "min-h-11 shrink-0 disabled:opacity-50 rounded-lg bg-primary px-3.5 py-1.5 text-[11px] font-semibold text-primary-foreground"
              }
            >
              {membership.isPending && membership.variables?.groupId === g.id
                ? "Updating…"
                : isMember
                  ? "Leave"
                  : "Join"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
