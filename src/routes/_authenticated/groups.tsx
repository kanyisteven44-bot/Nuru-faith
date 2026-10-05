import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, MessageCircle, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { createChatGroup } from "@/services/messaging";
import { useAuth } from "@/hooks/useAuth";
import { fetchGroups, fetchMyGroupIds, joinGroup, leaveGroup } from "@/services/content";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState, PillTabs } from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/groups")({
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

function GroupsScreen() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createError, setCreateError] = useState("");
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
      await navigate({ to: "/messages", search: { group } });
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Couldn't create group.");
    } finally {
      setCreating(false);
    }
  }
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
    <AppShell>
      <ScreenHeader
        title="Groups"
        right={
          <Link
            to="/explore"
            search={{ q: "", kind: "groups" }}
            aria-label="Search groups"
            className="p-1 text-secondary-foreground"
          >
            <Search className="h-5 w-5" />
          </Link>
        }
      />

      <div className="px-4 pb-1">
        <PillTabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      <div className="space-y-2 px-4 pt-2">
        <button
          type="button"
          onClick={() => setShowCreate(!showCreate)}
          aria-expanded={showCreate}
          className="mb-2 flex min-h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
        >
          {showCreate ? "Close group form" : "Create a group"}
        </button>
        {showCreate && (
          <form
            className="nuru-card space-y-3 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
          >
            <label className="block text-sm font-semibold" htmlFor="group-name">
              Group name
            </label>
            <input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              onChange={(e) => setDescription(e.target.value)}
              maxLength={400}
              disabled={creating}
              className="min-h-20 w-full rounded-lg border border-border-strong bg-surface-2 p-3 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              This is a public group. Signed-in users can find it, join, and read the group chat.
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
              {creating ? "Creating…" : "Create and open chat"}
            </button>
          </form>
        )}
        {groups.isLoading && <CardSkeleton count={5} height="h-16" />}
        {!groups.isLoading && rows.length === 0 && (
          <EmptyState
            title={tab === "My Groups" ? "You haven't joined a group yet" : "No groups yet"}
            description={
              tab === "My Groups"
                ? "Browse Discover to find a group for you."
                : "Groups from your church will appear here."
            }
          />
        )}
        {rows.map((g) => {
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
              {isMember && (
                <Link
                  to="/messages"
                  search={{ group: g.id }}
                  aria-label={`Chat with ${g.name}`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
                >
                  <MessageCircle className="h-4 w-4" />
                </Link>
              )}
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
    </AppShell>
  );
}
