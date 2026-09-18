import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, ChevronRight, MessageCircle, Search, UserRound } from "lucide-react";
import { resolveMedia } from "@/lib/media";
import { useAuth } from "@/hooks/useAuth";
import { fetchMentors, fetchMyMentorshipRequests, fetchProfile } from "@/services/content";
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

const TABS = ["All", "My Mentors", "Topics"] as const;
type Tab = (typeof TABS)[number];

function MentorsScreen() {
  const { userId } = useAuth();
  const [tab, setTab] = useState<Tab>("All");
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
    tab === "My Mentors"
      ? all.filter((m) => requested.has(m.id))
      : tab === "Topics" && profile.data?.church_id
        ? all.filter((m) => m.church_id === profile.data?.church_id)
        : all;

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
            <Link
              key={m.id}
              to="/mentors/$id"
              params={{ id: m.id }}
              className="nuru-card block p-3.5 active:opacity-90"
            >
              <span className="flex items-start gap-3">
                {m.photo_url ? (
                  <img
                    src={resolveMedia(m.photo_url)}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-2 text-cyan">
                    <UserRound className="h-6 w-6" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[15px] font-semibold">{m.display_name}</span>
                    {m.verified && (
                      <BadgeCheck
                        className="h-3.5 w-3.5 shrink-0 text-cyan"
                        aria-label="Verified"
                      />
                    )}
                  </span>
                  {m.role_title && (
                    <span className="block truncate text-[12px] text-cyan">{m.role_title}</span>
                  )}
                  {(m.specialties ?? []).length > 0 && (
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {(m.specialties ?? []).slice(0, 3).join(" • ")}
                    </span>
                  )}
                </span>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              </span>

              <span className="mt-3 flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary text-[13px] font-semibold text-primary-foreground">
                <MessageCircle className="h-4 w-4" />
                {pending ? "Requested" : "Message"}
              </span>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
