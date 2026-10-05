import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { createChatGroup } from "@/services/messaging";
import { useAuth } from "@/hooks/useAuth";
import { fetchGroups, fetchMyGroupIds, joinGroup, leaveGroup } from "@/services/content";
import {
  fetchGroup,
  fetchGroupMembers,
  fetchGroupPosts,
  fetchGroupReels,
} from "@/services/groups";
import { AppShell, Avatar, ScreenHeader } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState, PillTabs } from "@/components/nuru/Primitives";
import { CoverImage } from "@/components/nuru/CoverImage";
import { RichChatThread } from "@/components/nuru/RichChatThread";
import { resolveMedia } from "@/lib/media";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  group: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/groups")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Groups — Nuru Faith" },
      { name: "description", content: "Join Christian groups from your church and community." },
    ],
  }),
  component: GroupsScreen,
});

const TABS = ["My Groups", "Discover"] as const;
type Tab = (typeof TABS)[number];

const GROUP_TABS = ["Activity", "Reels", "Messages", "Members"] as const;
type GroupTab = (typeof GROUP_TABS)[number];

function GroupsScreen() {
  const search = Route.useSearch();
  if (search.group) return <GroupSpace groupId={search.group} />;
  return <GroupDirectory />;
}

function GroupDirectory() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createError, setCreateError] = useState("");
  const [tab, setTab] = useState<Tab>("My Groups");

  const groups = useQuery({ queryKey: ["groups"], queryFn: () => fetchGroups() });
  const mine = useQuery({
    queryKey: ["my-group-ids", userId],
    queryFn: () => fetchMyGroupIds(userId!),
    enabled: !!userId,
  });

  const joined = new Set(mine.data ?? []);
  const all = groups.data ?? [];
  const rows = tab === "My Groups" ? all.filter((g) => joined.has(g.id)) : all;

  async function create() {
    if (creating) return;
    setCreating(true);
    setCreateError("");
    try {
      const group = await createChatGroup(name, description);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["groups"] }),
        qc.invalidateQueries({ queryKey: ["my-group-ids", userId] }),
        qc.invalidateQueries({ queryKey: ["chat-groups", userId] }),
      ]);
      await navigate({ to: "/groups", search: { group } });
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Couldn't create group.");
    } finally {
      setCreating(false);
    }
  }

  async function joinAndOpen(groupId: string) {
    if (!userId) {
      toast.error("Sign in to join groups");
      return;
    }
    try {
      if (!joined.has(groupId)) await joinGroup(userId, groupId);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["my-group-ids", userId] }),
        qc.invalidateQueries({ queryKey: ["groups"] }),
        qc.invalidateQueries({ queryKey: ["chat-groups", userId] }),
      ]);
      await navigate({ to: "/groups", search: { group: groupId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't join that group");
    }
  }

  return (
    <AppShell>
      <ScreenHeader
        title="Groups"
        right={
          <Link
            to="/explore"
            search={{ q: "", kind: "groups" }}
            aria-label="Search groups"
            className="flex h-10 w-10 items-center justify-center rounded-full text-secondary-foreground hover:bg-surface-2"
          >
            <Search className="h-5 w-5" />
          </Link>
        }
      />

      <div className="px-4 pb-1">
        <PillTabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      <div className="space-y-3 px-4 pt-2">
        <button
          type="button"
          onClick={() => setShowCreate((value) => !value)}
          aria-expanded={showCreate}
          className="mb-1 flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm"
        >
          {showCreate ? "Close group form" : "Create a group"}
        </button>

        {showCreate && (
          <form
            className="nuru-card space-y-3 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            <label className="block text-sm font-semibold" htmlFor="group-name">
              Group name
            </label>
            <input
              id="group-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              maxLength={80}
              disabled={creating}
              className="min-h-11 w-full rounded-lg border border-border-strong bg-surface-2 px-3 text-sm"
            />
            <label className="block text-sm font-semibold" htmlFor="group-description">
              Description
            </label>
            <textarea
              id="group-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={400}
              disabled={creating}
              className="min-h-20 w-full rounded-lg border border-border-strong bg-surface-2 p-3 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              New groups are public. Members can share activity, Reels and group messages.
            </p>
            {createError && (
              <p role="alert" className="text-sm text-destructive">
                {createError}
              </p>
            )}
            <button
              type="submit"
              disabled={creating || name.trim().length < 2}
              className="min-h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create and open group"}
            </button>
          </form>
        )}

        {groups.isLoading && <CardSkeleton count={5} height="h-24" />}

        {!groups.isLoading && rows.length === 0 && (
          <EmptyState
            title={tab === "My Groups" ? "You haven't joined a group yet" : "No groups yet"}
            description={
              tab === "My Groups"
                ? "Browse Discover to find a group for you."
                : "New community groups will appear here."
            }
          />
        )}

        {rows.map((group) => {
          const isMember = joined.has(group.id);
          const image = resolveMedia(group.cover_url || "asset:topic-prayer");
          return (
            <article
              key={group.id}
              className="overflow-hidden rounded-[24px] border border-border bg-card shadow-sm"
            >
              <div className="flex min-h-28">
                <CoverImage
                  src={image}
                  alt=""
                  className="w-28 shrink-0 object-cover sm:w-36"
                />
                <div className="flex min-w-0 flex-1 flex-col justify-center p-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-[15px] font-bold">{group.name}</h2>
                      <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                        {group.description || "A Nuru Faith community group."}
                      </p>
                    </div>
                    {isMember && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-growth/10 px-2 py-1 text-[10px] font-bold text-growth">
                        <Check className="h-3 w-3" /> Joined
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {group.member_count ?? 0} members
                    </span>
                    <button
                      type="button"
                      onClick={() => void joinAndOpen(group.id)}
                      className={cn(
                        "inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold",
                        isMember
                          ? "border border-border bg-surface-2 text-secondary-foreground"
                          : "bg-primary text-primary-foreground",
                      )}
                    >
                      {isMember ? "Open" : "Join"}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}

function GroupSpace({ groupId }: { groupId: string }) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<GroupTab>("Activity");

  const group = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => fetchGroup(groupId),
  });
  const mine = useQuery({
    queryKey: ["my-group-ids", userId],
    queryFn: () => fetchMyGroupIds(userId!),
    enabled: !!userId,
  });
  const isMember = !!userId && (mine.data ?? []).includes(groupId);

  const posts = useQuery({
    queryKey: ["group-posts", groupId],
    queryFn: () => fetchGroupPosts(groupId),
    enabled: isMember && tab === "Activity",
  });
  const reels = useQuery({
    queryKey: ["group-reels", groupId],
    queryFn: () => fetchGroupReels(groupId),
    enabled: isMember && tab === "Reels",
  });
  const members = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: () => fetchGroupMembers(groupId),
    enabled: isMember && tab === "Members",
  });

  async function join() {
    if (!userId) return;
    try {
      await joinGroup(userId, groupId);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["my-group-ids", userId] }),
        qc.invalidateQueries({ queryKey: ["groups"] }),
        qc.invalidateQueries({ queryKey: ["group", groupId] }),
      ]);
      toast.success("You joined the group");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't join this group");
    }
  }

  async function leave() {
    if (!userId) return;
    try {
      await leaveGroup(userId, groupId);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["my-group-ids", userId] }),
        qc.invalidateQueries({ queryKey: ["groups"] }),
      ]);
      await navigate({ to: "/groups", search: {} });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't leave this group");
    }
  }

  if (group.isLoading) {
    return (
      <AppShell>
        <ScreenHeader title="Group" back />
        <div className="px-4 pt-4">
          <CardSkeleton count={4} height="h-20" />
        </div>
      </AppShell>
    );
  }

  if (!group.data) {
    return (
      <AppShell>
        <ScreenHeader title="Group" back />
        <div className="px-4 pt-6">
          <EmptyState
            title="Group unavailable"
            description="This group may have been removed or is not available to your account."
          />
        </div>
      </AppShell>
    );
  }

  const image = resolveMedia(group.data.cover_url || "asset:topic-prayer");

  return (
    <AppShell>
      <ScreenHeader title={group.data.name} back />

      <div className="mx-auto w-full max-w-3xl pb-8">
        <section className="relative overflow-hidden">
          <CoverImage src={image} alt="" className="h-52 w-full object-cover" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07111f]/90 via-[#07111f]/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <h1 className="font-display text-2xl font-bold">{group.data.name}</h1>
            <p className="mt-1 line-clamp-2 text-sm text-white/80">
              {group.data.description || "Grow, share and connect together."}
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/70">
              <Users className="h-4 w-4" /> {group.data.member_count ?? 0} members
            </p>
          </div>
        </section>

        {!isMember ? (
          <div className="px-4 pt-5">
            <div className="nuru-card p-5 text-center">
              <h2 className="font-display text-xl font-bold">Join the conversation</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Join this group to see its activity, shared Reels, messages and member community.
              </p>
              <button
                type="button"
                onClick={() => void join()}
                className="mt-5 min-h-12 w-full rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground"
              >
                Join group
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 pt-4">
              <PillTabs tabs={GROUP_TABS} value={tab} onChange={setTab} />
            </div>

            <div className="px-4 pt-4">
              {tab === "Activity" && (
                <GroupActivity posts={posts.data ?? []} loading={posts.isLoading} />
              )}

              {tab === "Reels" && (
                <GroupReels reels={reels.data ?? []} loading={reels.isLoading} />
              )}

              {tab === "Messages" && userId && (
                <RichChatThread
                  target={{ group: groupId }}
                  userId={userId}
                  maxHeight="52dvh"
                />
              )}

              {tab === "Members" && (
                <GroupMembers members={members.data ?? []} loading={members.isLoading} />
              )}

              <button
                type="button"
                onClick={() => void leave()}
                className="mt-7 min-h-11 w-full rounded-full border border-destructive/30 text-sm font-semibold text-destructive"
              >
                Leave group
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function GroupActivity({
  posts,
  loading,
}: {
  posts: Awaited<ReturnType<typeof fetchGroupPosts>>;
  loading: boolean;
}) {
  if (loading) return <CardSkeleton count={4} height="h-32" />;
  if (!posts.length) {
    return (
      <EmptyState
        title="No group activity yet"
        description="Posts shared with this group will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <article key={post.id} className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-3 p-3">
            <Avatar
              url={post.author_avatar_url}
              name={post.author_name || ""}
              seed={post.author_id}
              size="sm"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{post.author_name || "Nuru member"}</p>
              {post.author_handle && (
                <p className="truncate text-[11px] text-muted-foreground">@{post.author_handle}</p>
              )}
            </div>
          </div>
          {post.media_url && (
            <CoverImage
              src={resolveMedia(post.media_url)}
              alt=""
              className="max-h-80 w-full object-cover"
            />
          )}
          <div className="p-4 pt-2">
            {post.body && (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-secondary-foreground">
                {post.body}
              </p>
            )}
            {post.scripture_ref && (
              <p className="mt-2 text-xs font-semibold text-primary">{post.scripture_ref}</p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function GroupReels({
  reels,
  loading,
}: {
  reels: Awaited<ReturnType<typeof fetchGroupReels>>;
  loading: boolean;
}) {
  if (loading) return <CardSkeleton count={6} height="h-40" />;
  if (!reels.length) {
    return (
      <EmptyState
        title="No group Reels yet"
        description="Reels shared with this group will appear here."
      />
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
      {reels.map((reel) => (
        <Link
          key={reel.id}
          to="/reels"
          search={{ reel: reel.id }}
          className="relative aspect-[9/14] overflow-hidden rounded-xl bg-surface-2"
        >
          <CoverImage
            src={resolveMedia(reel.poster_url)}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2 pt-8">
            <p className="line-clamp-2 text-[10px] font-semibold text-white">
              {reel.caption || reel.title || "Nuru Reel"}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function GroupMembers({
  members,
  loading,
}: {
  members: Awaited<ReturnType<typeof fetchGroupMembers>>;
  loading: boolean;
}) {
  if (loading) return <CardSkeleton count={5} height="h-16" />;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {members.map((member) => {
        const profile = member.profile;
        const name = profile?.full_name || profile?.username || "Nuru member";
        return (
          <Link
            key={member.id}
            to="/discovery/$kind/$id"
            params={{ kind: "profile", id: member.user_id }}
            className="flex min-h-16 items-center gap-3 border-b border-border/60 p-3 last:border-b-0 hover:bg-surface-2"
          >
            <Avatar
              url={profile?.avatar_url ?? null}
              name={name}
              seed={member.user_id}
              size="sm"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{name}</span>
              {profile?.username && (
                <span className="block truncate text-xs text-muted-foreground">
                  @{profile.username}
                </span>
              )}
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold capitalize text-primary">
              {member.role}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
