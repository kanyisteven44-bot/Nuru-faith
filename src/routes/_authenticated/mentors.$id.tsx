import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, MessageCircle, Phone, UserRound } from "lucide-react";
import { toast } from "sonner";
import { resolveMedia } from "@/lib/media";
import { useAuth } from "@/hooks/useAuth";
import { fetchMentorById, fetchMyMentorshipRequests, requestMentorship } from "@/services/content";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { CardSkeleton, Chip, EmptyState, ErrorState } from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/mentors/$id")({
  head: () => ({
    meta: [{ title: "Mentor — Nuru Faith" }],
  }),
  component: MentorDetail,
});

function MentorDetail() {
  const { id } = Route.useParams();
  const { userId } = useAuth();
  const [busy, setBusy] = useState(false);

  const mentor = useQuery({
    queryKey: ["mentor", id],
    queryFn: () => fetchMentorById(id),
  });
  const requests = useQuery({
    queryKey: ["mentorship-requests", userId],
    queryFn: () => fetchMyMentorshipRequests(userId!),
    enabled: !!userId,
  });
  const requested = (requests.data ?? []).some((r) => r.mentor_id === id);

  async function ask() {
    if (!userId) {
      toast.error("Sign in to request mentorship");
      return;
    }
    setBusy(true);
    try {
      await requestMentorship({
        mentor_id: id,
        requester_id: userId,
        reason: "Mentorship request from Nuru Faith",
        message: "",
      });
      await requests.refetch();
      toast.success("Request sent");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send that request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <ScreenHeader title="Mentor" back />

      {mentor.isLoading && (
        <div className="p-4">
          <CardSkeleton count={1} height="h-64" />
        </div>
      )}
      {mentor.isError && (
        <div className="p-4">
          <ErrorState onRetry={() => void mentor.refetch()} />
        </div>
      )}
      {!mentor.isLoading && !mentor.isError && !mentor.data && (
        <div className="p-4">
          <EmptyState title="Mentor not found" description="This mentor may no longer be listed." />
        </div>
      )}

      {mentor.data && (
        <div className="space-y-6 px-4 pb-8">
          <section className="flex flex-col items-center pt-2 text-center">
            {mentor.data.photo_url ? (
              <img
                src={resolveMedia(mentor.data.photo_url)}
                alt=""
                className="h-28 w-28 rounded-full object-cover ring-2 ring-border-strong"
              />
            ) : (
              <span className="flex h-28 w-28 items-center justify-center rounded-full border border-border-strong bg-surface-2 text-cyan">
                <UserRound className="h-10 w-10" />
              </span>
            )}
            <span className="mt-3 flex items-center gap-1.5">
              <h1 className="font-display text-xl font-bold">{mentor.data.display_name}</h1>
              {mentor.data.verified && (
                <BadgeCheck className="h-4.5 w-4.5 text-cyan" aria-label="Verified mentor" />
              )}
            </span>
            {mentor.data.role_title && (
              <p className="text-sm text-muted-foreground">{mentor.data.role_title}</p>
            )}
            {mentor.data.church_name && (
              <p className="text-xs text-cyan">{mentor.data.church_name}</p>
            )}

            {(mentor.data.specialties ?? []).length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {(mentor.data.specialties ?? []).map((s) => (
                  <Chip key={s} tone="brand">
                    {s}
                  </Chip>
                ))}
              </div>
            )}
          </section>

          {mentor.data.phone_number && (
            <section className="grid grid-cols-2 gap-3">
              <a
                href={`sms:${mentor.data.phone_number}`}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground nuru-glow-sm"
              >
                <MessageCircle className="h-4.5 w-4.5" />
                Text {mentor.data.display_name.split(" ")[0]}
              </a>
              <a
                href={`tel:${mentor.data.phone_number}`}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface-2 text-sm font-semibold text-secondary-foreground"
              >
                <Phone className="h-4.5 w-4.5" />
                Call
              </a>
            </section>
          )}

          {mentor.data.bio && (
            <section>
              <h2 className="mb-2 font-display text-[15px] font-semibold">About</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line text-secondary-foreground">
                {mentor.data.bio}
              </p>
            </section>
          )}

          <button
            type="button"
            disabled={requested || busy}
            onClick={() => void ask()}
            className="flex min-h-12 w-full items-center justify-center rounded-xl border border-border-strong bg-surface-2 text-sm font-semibold text-secondary-foreground disabled:opacity-60"
          >
            {requested ? "Mentorship requested" : "Request ongoing mentorship"}
          </button>
        </div>
      )}
    </AppShell>
  );
}
