import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Search, Users } from "lucide-react";
import { toast } from "sonner";
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
    </AppShell>
  );
}
