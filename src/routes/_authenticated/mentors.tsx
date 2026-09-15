import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { resolveMedia } from "@/lib/media";
import { timeAgo } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { MENTOR_SPECIALTIES } from "@/constants/nuru";
import { fetchMentors, fetchMyMentorshipRequests, requestMentorship } from "@/services/content";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import {
  CardSkeleton,
  Chip,
  EmptyState,
  GradientButton,
  PillTabs,
  ScreenHero,
  SectionHeader,
} from "@/components/nuru/Primitives";
import heroBg from "@/assets/walk-purpose.jpg";

export const Route = createFileRoute("/_authenticated/mentors")({
  head: () => ({
    meta: [
      { title: "Mentorship — Nuru Faith" },
      {
        name: "description",
        content: "Connect with trusted Christian mentors for guidance and discipleship.",
      },
      { property: "og:title", content: "Mentorship — Nuru Faith" },
      { property: "og:description", content: "Trusted Christian mentors for your journey." },
    ],
  }),
  component: MentorsScreen,
});

const TABS = ["Find a mentor", "My requests"] as const;
type Tab = (typeof TABS)[number];

function MentorsScreen() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("Find a mentor");
  const [active, setActive] = useState<string | null>(null);
  const [reason, setReason] = useState(MENTOR_SPECIALTIES[0] ?? "Faith growth");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const mentors = useQuery({ queryKey: ["mentors"], queryFn: fetchMentors });
  const requests = useQuery({
    queryKey: ["mentorship", userId],
    queryFn: () => fetchMyMentorshipRequests(userId!),
    enabled: !!userId,
  });

  async function send(mentorId: string) {
    if (!userId || message.trim().length < 10) {
      toast.error("Tell your mentor a little more (10+ characters)");
      return;
    }
    setSending(true);
    try {
      await requestMentorship({
        mentor_id: mentorId,
        requester_id: userId,
        reason,
        message: message.trim(),
      });
      await queryClient.invalidateQueries({ queryKey: ["mentorship", userId] });
      setActive(null);
      setMessage("");
      toast.success("Request sent — you'll hear back soon");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send your request");
    } finally {
      setSending(false);
    }
  }

  return (
    <AppShell>
      <ScreenHeader title="Mentorship" subtitle="Walk with someone further along" />
      <ScreenHero image={heroBg} />

      <div className="px-4 py-3">
        <PillTabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      {tab === "Find a mentor" && (
        <div className="space-y-3 px-4">
          {mentors.isLoading && <CardSkeleton count={3} height="h-28" />}
          {mentors.data?.length === 0 && (
            <EmptyState title="No mentors yet" description="Churches are onboarding mentors." />
          )}
          {(mentors.data ?? []).map((m) => (
            <article key={m.id} className="nuru-card p-4">
              <div className="flex gap-3">
                <img
                  src={resolveMedia(m.photo_url)}
                  alt=""
                  width={112}
                  height={112}
                  loading="lazy"
                  className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-border-strong"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    {m.display_name} {m.verified && <BadgeCheck className="h-4 w-4 text-cyan" />}
                  </p>
                  <p className="text-xs text-muted-foreground">{m.role_title}</p>
                  {m.bio && (
                    <p className="mt-1 line-clamp-2 text-xs text-secondary-foreground">{m.bio}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(m.specialties ?? []).slice(0, 3).map((s: string) => (
                      <Chip key={s} tone="brand">
                        {s}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>

              {active === m.id ? (
                <div className="mt-3 space-y-2">
                  <label
                    className="block text-xs font-medium text-muted-foreground"
                    htmlFor={`reason-${m.id}`}
                  >
                    What do you need help with?
                  </label>
                  <select
                    id={`reason-${m.id}`}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="input-nuru"
                  >
                    {MENTOR_SPECIALTIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    maxLength={500}
                    aria-label="Message to mentor"
                    placeholder="Share a little about where you are…"
                    className="w-full rounded-lg border border-input bg-surface-2 p-4 text-sm outline-none focus:border-cyan"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActive(null)}
                      className="min-h-11 rounded-lg border border-border-strong px-4 text-sm"
                    >
                      Cancel
                    </button>
                    <GradientButton
                      className="flex-1"
                      onClick={() => send(m.id)}
                      disabled={sending}
                    >
                      Send request
                    </GradientButton>
                  </div>
                </div>
              ) : (
                <GradientButton className="mt-3 w-full" onClick={() => setActive(m.id)}>
                  Request mentorship
                </GradientButton>
              )}
            </article>
          ))}
        </div>
      )}

      {tab === "My requests" && (
        <div className="space-y-2 px-4">
          {requests.isLoading && <CardSkeleton count={2} height="h-20" />}
          {requests.data?.length === 0 && (
            <EmptyState
              title="No requests yet"
              description="Find a mentor and send your first request."
            />
          )}
          {(requests.data ?? []).map((r) => (
            <article key={r.id} className="nuru-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{r.mentors?.display_name ?? "Mentor"}</p>
                <Chip tone={r.status === "accepted" ? "growth" : "muted"}>{r.status}</Chip>
              </div>
              <p className="text-xs text-muted-foreground">{r.reason}</p>
              <p className="mt-2 text-sm text-secondary-foreground">{r.message}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">{timeAgo(r.created_at)}</p>
            </article>
          ))}
        </div>
      )}

      <div className="px-4 pt-6">
        <SectionHeader title="Safeguarding" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Mentors are verified by their churches. Conversations stay inside Nuru Faith, and you can
          report or end a mentorship at any time.
        </p>
      </div>
    </AppShell>
  );
}
