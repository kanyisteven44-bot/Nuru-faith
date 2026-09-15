import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, ChevronRight, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import { resolveMedia } from "@/lib/media";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchMentors,
  fetchMyMentorshipRequests,
  fetchProfile,
  requestMentorship,
} from "@/services/content";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState, PillTabs } from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/mentors")({
  head: () => ({
    meta: [
      { title: "Mentors — Nuru Faith" },
      {
        name: "description",
        content: "Connect with trusted Christian mentors from your church and beyond.",
      },
    ],
  }),
  component: MentorsScreen,
});

const TABS = ["All", "My Church", "By Topic"] as const;
type Tab = (typeof TABS)[number];

function MentorsScreen() {
  const { userId } = useAuth();
  const [tab, setTab] = useState<Tab>("All");
  const [busyId, setBusyId] = useState<string | null>(null);

  const mentors = useQuery({ queryKey: ["mentors"], queryFn: fetchMentors });
  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
  const requests = useQuery({
    queryKey: ["mentorship-requests", userId],
    queryFn: () => fetchMyMentorshipRequests(userId!),
    enabled: !!userId,
  });

  const requested = new Set((requests.data ?? []).map((r) => r.mentor_id));
  const all = mentors.data ?? [];
  const rows =
    tab === "My Church" && profile.data?.church_id
      ? all.filter((m) => m.church_id === profile.data?.church_id)
      : all;

  async function ask(mentorId: string) {
    if (!userId) {
      toast.error("Sign in to request mentorship");
      return;
    }
    setBusyId(mentorId);
    try {
      await requestMentorship({
        mentor_id: mentorId,
        requester_id: userId,
        reason: "Mentorship request from Nuru Faith",
        message: "",
      });
      await requests.refetch();
      toast.success("Request sent");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send that request");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell>
      <ScreenHeader
        title="Mentors"
        right={
          <span className="p-1 text-secondary-foreground">
            <Search className="h-5 w-5" />
          </span>
        }
      />

      <div className="px-4 pb-1">
        <PillTabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      <div className="space-y-2 px-4 pt-2">
        {mentors.isLoading && <CardSkeleton count={5} height="h-16" />}
        {!mentors.isLoading && rows.length === 0 && (
          <EmptyState
            title="No mentors yet"
            description="Verified mentors from your church will appear here."
          />
        )}
        {rows.map((m) => {
          const pending = requested.has(m.id);
          return (
            <div key={m.id} className="nuru-card flex items-center gap-3 p-3">
              {m.photo_url ? (
                <img
                  src={resolveMedia(m.photo_url)}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-2 text-cyan">
                  <UserRound className="h-5 w-5" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold">{m.display_name}</span>
                  {m.verified && (
                    <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-cyan" aria-label="Verified" />
                  )}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {m.role_title ?? (m.specialties ?? []).slice(0, 2).join(" · ") ?? "Mentor"}
                </span>
              </span>
              <button
                type="button"
                disabled={pending || busyId === m.id}
                onClick={() => void ask(m.id)}
                className="shrink-0 rounded-lg bg-primary px-3.5 py-1.5 text-[11px] font-semibold text-primary-foreground disabled:opacity-60"
              >
                {pending ? "Requested" : "Connect"}
              </button>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
