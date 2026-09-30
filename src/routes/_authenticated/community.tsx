import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Church, Image as ImageIcon, Search, Users } from "lucide-react";
import { toast } from "sonner";
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
const KIND_FOR_TAB: Partial<Record<Tab, string>> = {
  Prayer: "prayer",
  Testimony: "testimony",
  News: "news",
};

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

  const posts = useInfiniteQuery({
    queryKey: ["posts", tab, tab === "Following" ? followingIds : "all"],
    queryFn: ({ pageParam }) =>
      fetchPostPage(pageParam, tab === "Following" ? followingIds : undefined),
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
  const allRows = (posts.data?.pages.flat() ?? []) as PostRow[];
  // The kind chips narrow what has already loaded; the query itself is shared
  // across them so switching a chip does not refetch the feed.
  const kind = KIND_FOR_TAB[tab];
  const rows = kind ? allRows.filter((r) => r.kind === kind) : allRows;

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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-strong bg-[linear-gradient(180deg,#212A26,#1A211E)] text-ink-2"
          >
            <Search className="h-4 w-4" />
          </Link>
        </div>

        {/* Which church's people you are looking at. */}
        <div className="mt-3 flex justify-center">
          <Link
            to="/church"
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-border-strong bg-[linear-gradient(180deg,#212A26,#1A211E)] py-1.5 pr-3 pl-1.5 text-[13px] font-semibold"
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
          className="mt-3 flex items-center gap-2.5 rounded-full border border-border-strong bg-[#151B18] py-2 pr-2 pl-2"
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
          {posts.isLoading && <CardSkeleton count={3} height="h-48" />}
          {posts.isError && (
            <ErrorState message="Couldn't load the feed." onRetry={() => void posts.refetch()} />
          )}
          {!posts.isLoading && rows.length === 0 && (
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
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-primary/12 text-leaf">
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
