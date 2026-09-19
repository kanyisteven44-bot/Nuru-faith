import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bookmark, Check, HandHeart, MessageCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { addPrayerJournalEntry } from "@/services/ai";
import {
  completeSession,
  fetchMyCompletedSessions,
  fetchReflection,
  fetchSeriesBySlug,
  fetchSessionScriptures,
  fetchSessions,
  markActionDone,
  saveReflection,
  saveScripture,
} from "@/services/series";
import { AppShell } from "@/components/nuru/AppShell";
import { ScriptureText } from "@/components/nuru/Scripture";
import {
  CardSkeleton,
  Chip,
  ErrorState,
  GhostButton,
  GradientButton,
} from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/series/$slug/$position")({
  head: () => ({
    meta: [
      { title: "Session — Scripture Series — Nuru Faith" },
      {
        name: "description",
        content:
          "Read the passages, understand the context, reflect, pray and take one practical step.",
      },
      { property: "og:title", content: "Session — Scripture Series — Nuru Faith" },
      { property: "og:description", content: "A guided Bible study session on Nuru Faith." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SessionScreen,
});

function SessionScreen() {
  const { slug, position } = Route.useParams();
  const pos = Number(position);
  const { userId } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const series = useQuery({ queryKey: ["series", slug], queryFn: () => fetchSeriesBySlug(slug) });
  const seriesId = series.data?.id;

  const sessions = useQuery({
    queryKey: ["series-sessions", seriesId],
    queryFn: () => fetchSessions(seriesId!),
    enabled: !!seriesId,
  });
  const session = (sessions.data ?? []).find((s) => s.position === pos) ?? null;
  const next = (sessions.data ?? []).find((s) => s.position === pos + 1) ?? null;

  const passages = useQuery({
    queryKey: ["session-scriptures", session?.id],
    queryFn: () => fetchSessionScriptures(session!.id),
    enabled: !!session,
  });
  const done = useQuery({
    queryKey: ["series-done", userId, seriesId],
    queryFn: () => fetchMyCompletedSessions(userId!, seriesId!),
    enabled: !!userId && !!seriesId,
  });
  const reflection = useQuery({
    queryKey: ["reflection", userId, session?.id],
    queryFn: () => fetchReflection(userId!, session!.id),
    enabled: !!userId && !!session,
  });

  const [note, setNote] = useState("");
  useEffect(() => {
    if (reflection.data !== undefined) setNote(reflection.data);
  }, [reflection.data]);

  const saveNote = useMutation({
    mutationFn: async () => {
      if (!userId || !session || !seriesId) throw new Error("Sign in to save your reflection");
      await saveReflection({ userId, seriesId, sessionId: session.id, content: note.trim() });
    },
    onSuccess: () => toast.success("Saved privately — only you can see this"),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save"),
  });

  const finish = useMutation({
    mutationFn: async () => {
      if (!userId || !session || !seriesId) throw new Error("Sign in to track your progress");
      await completeSession({
        userId,
        seriesId,
        sessionId: session.id,
        nextSessionId: next?.id ?? null,
        totalSessions: sessions.data?.length ?? 0,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["series-done", userId, seriesId] });
      await qc.invalidateQueries({ queryKey: ["series-progress", userId] });
      if (next)
        void navigate({
          to: "/series/$slug/$position",
          params: { slug, position: String(next.position) },
        });
      else {
        toast.success("Series complete — well done.");
        void navigate({ to: "/series/$slug", params: { slug } });
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save your progress"),
  });

  if (sessions.isLoading || series.isLoading) {
    return (
      <AppShell>
        <div className="p-4">
          <CardSkeleton count={5} height="h-20" />
        </div>
      </AppShell>
    );
  }
  if (!series.data || !session) {
    return (
      <AppShell>
        <div className="p-4">
          <ErrorState message="That session isn't available." />
        </div>
      </AppShell>
    );
  }

  const isDone = (done.data ?? []).includes(session.id);
  const primary = (passages.data ?? []).filter((p) => p.scripture_role === "primary");
  const supporting = (passages.data ?? []).filter((p) => p.scripture_role === "supporting");
  const further = (passages.data ?? []).filter((p) => p.scripture_role === "further_reading");

  const askSearch = (q: string) => ({
    contextType: "series_session",
    contextId: session.id,
    contextLabel: `${series.data!.title} · Session ${session.position}: ${session.title}`,
    q,
  });

  return (
    <AppShell>
      <header className="flex items-center gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link
          to="/series/$slug"
          params={{ slug }}
          aria-label="Back to series"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{series.data.title}</p>
          <p className="text-xs font-medium text-cyan">
            Session {session.position} of {sessions.data?.length ?? 0}
          </p>
        </div>
      </header>

      <article className="space-y-6 px-4 py-5">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">{session.title}</h1>
          {session.introduction && (
            <p className="mt-2 text-sm text-secondary-foreground">{session.introduction}</p>
          )}
        </div>

        {primary.length > 0 && (
          <section className="nuru-card space-y-4 p-4">
            <h2 className="font-display text-[15px] font-semibold">Read</h2>
            {primary.map((p) => (
              <PassageBlock
                key={p.id}
                reference={p.reference}
                explanation={p.explanation}
                userId={userId}
              />
            ))}
          </section>
        )}

        {session.context_note && (
          <section className="space-y-2">
            <h2 className="font-display text-[15px] font-semibold">Understand the context</h2>
            <p className="text-sm text-secondary-foreground">{session.context_note}</p>
          </section>
        )}

        {session.main_teaching && (
          <section className="space-y-2">
            <h2 className="font-display text-[15px] font-semibold">What this means</h2>
            <p className="text-sm whitespace-pre-line text-secondary-foreground">
              {session.main_teaching}
            </p>
          </section>
        )}

        {supporting.length > 0 && (
          <section className="nuru-card space-y-4 p-4">
            <h2 className="font-display text-[15px] font-semibold">Connect the passages</h2>
            {session.connections && (
              <p className="text-sm text-secondary-foreground">{session.connections}</p>
            )}
            {supporting.map((p) => (
              <PassageBlock
                key={p.id}
                reference={p.reference}
                explanation={p.explanation}
                userId={userId}
              />
            ))}
          </section>
        )}

        {session.reflection_questions?.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-[15px] font-semibold">Reflect</h2>
            <ul className="space-y-2">
              {session.reflection_questions.map((q) => (
                <li key={q} className="nuru-card px-4 py-3 text-sm text-secondary-foreground">
                  {q}
                </li>
              ))}
            </ul>
            <div>
              <label htmlFor="reflection" className="text-xs text-muted-foreground">
                Your private journal — only you can see this.
              </label>
              <textarea
                id="reflection"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={5}
                placeholder="What is God showing you here?"
                className="mt-1 w-full rounded-2xl border border-input bg-surface-2 p-3 text-sm outline-none focus:border-primary"
              />
              <GhostButton
                onClick={() => saveNote.mutate()}
                disabled={saveNote.isPending}
                className="mt-2"
              >
                Save reflection
              </GhostButton>
            </div>
          </section>
        )}

        {session.prayer && (
          <section className="nuru-card space-y-3 p-4">
            <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold">
              <HandHeart className="h-4 w-4 text-cyan" /> Pray
            </h2>
            <p className="text-sm whitespace-pre-line text-secondary-foreground italic">
              {session.prayer}
            </p>
            <GhostButton
              onClick={() => {
                if (!userId) {
                  toast.error("Sign in to save prayers");
                  return;
                }
                void addPrayerJournalEntry({
                  userId,
                  title: `${series.data!.title} · ${session.title}`,
                  content: session.prayer!,
                  scriptureRef: primary[0]?.reference ?? null,
                  source: "series_session",
                  sourceId: session.id,
                })
                  .then(() => toast.success("Added to your prayer journal"))
                  .catch(() => toast.error("Couldn't save that"));
              }}
            >
              Save to prayer journal
            </GhostButton>
          </section>
        )}

        {session.practical_action && (
          <section className="space-y-2">
            <h2 className="font-display text-[15px] font-semibold">Apply</h2>
            <p className="text-sm text-secondary-foreground">{session.practical_action}</p>
            <GhostButton
              onClick={() => {
                if (!userId || !seriesId) {
                  toast.error("Sign in to track this");
                  return;
                }
                void markActionDone(userId, session.id, seriesId, true)
                  .then(() => toast.success("Marked as done"))
                  .catch(() => toast.error("Couldn't save that"));
              }}
            >
              <Check className="h-4 w-4" /> I'll do this
            </GhostButton>
          </section>
        )}

        {further.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-display text-[15px] font-semibold">Go further</h2>
            <div className="flex flex-wrap gap-2">
              {further.map((p) => (
                <Chip key={p.id}>{p.reference}</Chip>
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-wrap gap-2">
          <Link
            to="/ai"
            search={askSearch(
              primary[0]
                ? `Explain ${primary[0].reference} in its context and how it applies to this session.`
                : `Help me understand this session: ${session.title}`,
            )}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface-2 px-5 text-sm font-medium"
          >
            <Sparkles className="h-4 w-4 text-cyan" /> Ask Nuru AI
          </Link>
          <Link
            to="/community"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface-2 px-5 text-sm font-medium"
          >
            <MessageCircle className="h-4 w-4 text-cyan" /> Discuss
          </Link>
        </section>

        {session.discussion_prompt && (
          <p className="rounded-2xl bg-surface-2 px-4 py-3 text-xs text-muted-foreground">
            Discussion prompt: {session.discussion_prompt}
          </p>
        )}

        <GradientButton
          onClick={() => finish.mutate()}
          disabled={finish.isPending}
          className="w-full"
        >
          {isDone
            ? next
              ? "Next session"
              : "Back to series"
            : next
              ? "Complete & continue"
              : "Complete series"}
        </GradientButton>
      </article>
    </AppShell>
  );
}

function PassageBlock({
  reference,
  explanation,
  userId,
}: {
  reference: string;
  explanation: string | null;
  userId: string | null;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-cyan">{reference}</p>
        <button
          onClick={() => {
            if (!userId) {
              toast.error("Sign in to save passages");
              return;
            }
            void saveScripture(userId, reference)
              .then(() => toast.success("Saved to your Bible"))
              .catch(() => toast.error("Couldn't save that"));
          }}
          aria-label={`Save ${reference}`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted-foreground"
        >
          <Bookmark className="h-4 w-4" />
        </button>
      </div>
      <ScriptureText reference={reference} className="text-sm text-secondary-foreground" />
      {explanation && <p className="text-xs text-muted-foreground">{explanation}</p>}
    </div>
  );
}
