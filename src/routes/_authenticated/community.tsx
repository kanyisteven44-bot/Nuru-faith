import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HandHeart, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { timeAgo } from "@/lib/format";
import {
  fetchGroups,
  fetchMyGroupIds,
  fetchMyPostLikes,
  fetchMySavedPosts,
  fetchPosts,
  fetchPrayerRequests,
  joinGroup,
  leaveGroup,
} from "@/services/content";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { PostCard, type PostRow } from "@/components/nuru/PostCard";
import {
  CardSkeleton,
  EmptyState,
  ErrorState,
  GhostButton,
  IconTile,
  PillTabs,
} from "@/components/nuru/Primitives";

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

const TABS = ["Feed", "Groups", "Prayer wall"] as const;
type Tab = (typeof TABS)[number];

function CommunityScreen() {
  const { userId } = useAuth();
  const [tab, setTab] = useState<Tab>("Feed");
  const queryClient = useQueryClient();

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
  const groups = useQuery({ queryKey: ["groups"], queryFn: () => fetchGroups() });
  const myGroups = useQuery({
    queryKey: ["my-groups", userId],
    queryFn: () => fetchMyGroupIds(userId!),
    enabled: !!userId,
  });
  const prayers = useQuery({ queryKey: ["prayers"], queryFn: fetchPrayerRequests });

  async function toggleGroup(groupId: string, joined: boolean) {
    if (!userId) return;
    try {
      if (joined) await leaveGroup(userId, groupId);
      else await joinGroup(userId, groupId);
      await queryClient.invalidateQueries({ queryKey: ["my-groups", userId] });
      toast.success(joined ? "Left the group" : "You've joined");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update membership");
    }
  }

  return (
    <AppShell>
      <ScreenHeader title="Community" subtitle="Grow together, not alone" />

      <div className="px-4 py-3">
        <PillTabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      {tab === "Feed" && (
        <div className="space-y-4 px-4">
          {posts.isLoading && <CardSkeleton count={3} height="h-40" />}
          {posts.isError && <ErrorState onRetry={() => posts.refetch()} />}
          {posts.data?.length === 0 && (
            <EmptyState
              title="No posts yet"
              description="Be the first to share what God is doing."
            />
          )}
          {(posts.data ?? []).map((p) => (
            <PostCard
              key={p.id}
              post={p as unknown as PostRow}
              userId={userId}
              liked={(likes.data ?? []).includes(p.id)}
              saved={(saves.data ?? []).includes(p.id)}
            />
          ))}
        </div>
      )}

      {tab === "Groups" && (
        <div className="space-y-2 px-4">
          {groups.isLoading && <CardSkeleton count={4} height="h-20" />}
          {(groups.data ?? []).map((g) => {
            const joined = (myGroups.data ?? []).includes(g.id);
            return (
              <div key={g.id} className="nuru-card flex items-center gap-3 p-3.5">
                <IconTile icon={Users} tone="brand" size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{g.name}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {g.member_count} members · {g.category}
                    {g.privacy !== "public" ? ` · ${g.privacy}` : ""}
                  </p>
                </div>
                <GhostButton
                  className="min-h-9 px-4 text-xs"
                  onClick={() => toggleGroup(g.id, joined)}
                >
                  {joined ? "Leave" : "Join"}
                </GhostButton>
              </div>
            );
          })}
        </div>
      )}

      {tab === "Prayer wall" && (
        <div className="space-y-2 px-4">
          {prayers.isLoading && <CardSkeleton count={3} height="h-24" />}
          {prayers.data?.length === 0 && (
            <EmptyState
              title="The wall is quiet"
              description="Tap the centre button to share a prayer request."
            />
          )}
          {(prayers.data ?? []).map((p) => (
            <article key={p.id} className="nuru-card p-4">
              <div className="mb-2 flex items-center gap-2.5">
                <IconTile icon={HandHeart} tone="violet" size="sm" />
                <p className="text-xs text-muted-foreground">
                  {p.is_anonymous ? "Anonymous" : "A Nuru member"} · {timeAgo(p.created_at)}
                </p>
              </div>
              <p className="text-sm leading-relaxed text-secondary-foreground">{p.body}</p>
              <p className="mt-2 text-[11px] font-semibold text-cyan">
                {p.prayer_count ?? 0} praying
              </p>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
