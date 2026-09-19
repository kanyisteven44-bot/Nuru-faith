import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  Check,
  ChevronRight,
  Crown,
  FileText,
  HandHeart,
  MessageCircle,
  MessagesSquare,
  MoreHorizontal,
  Share2,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { resolveMedia } from "@/lib/media";
import { useShareSheet } from "@/hooks/useShareSheet";
import { AppShell } from "@/components/nuru/AppShell";
import { ScriptureText } from "@/components/nuru/Scripture";
import {
  CardSkeleton,
  Chip,
  ErrorState,
  GhostButton,
  GradientButton,
} from "@/components/nuru/Primitives";

/** The three movements of a session, as the design groups them. */
const STAGES = [
  { key: "Read", hint: "God's Word", icon: BookOpen },
  { key: "Reflect", hint: "Think Deeper", icon: MessagesSquare },
  { key: "Pray", hint: "Talk to God", icon: HandHeart },
] as const;
type Stage = (typeof STAGES)[number]["key"];

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

  const shareSheet = useShareSheet();
  const [stage, setStage] = useState<Stage>("Read");
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
      {/* Hero */}
      <header className="relative overflow-hidden">
        <img
          src={resolveMedia(series.data.cover_image)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/45" />

        <div className="relative px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                to="/series/$slug"
                params={{ slug }}
                aria-label="Back to series"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-2/80 backdrop-blur"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">{series.data.title}</p>
                <p className="text-[13px] font-semibold text-cyan">
                  Session {session.position} of {sessions.data?.length ?? 0}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                aria-label="Save this session's passage"
                onClick={() => {
                  if (!userId) {
                    toast.error("Sign in to save passages");
                    return;
                  }
                  if (!primary[0]) {
                    toast("This session has no passage to save yet");
                    return;
                  }
                  void saveScripture(userId, primary[0].reference)
                    .then(() => toast.success("Saved to your Bible"))
                    .catch(() => toast.error("Couldn't save that"));
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border-strong bg-surface-2/80 backdrop-blur"
              >
                <Bookmark className="h-4.5 w-4.5" />
              </button>
              <button
                type="button"
                aria-label="Share this session"
                onClick={() =>
                  shareSheet.share({
                    title: session.title,
                    text: `${series.data!.title} · Session ${session.position}`,
                    url: `${window.location.origin}/series/${slug}/${session.position}`,
                  })
                }
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border-strong bg-surface-2/80 backdrop-blur"
              >
                <Share2 className="h-4.5 w-4.5" />
              </button>
              <Link
                to="/series/$slug"
                params={{ slug }}
                aria-label="All sessions in this series"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border-strong bg-surface-2/80 backdrop-blur"
              >
                <MoreHorizontal className="h-4.5 w-4.5" />
              </Link>
            </div>
          </div>

          <p className="mt-4 inline-flex rounded-full border border-cyan/60 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-cyan uppercase">
            {series.data.category}
          </p>

          <h1 className="mt-2 max-w-[68%] font-display text-[30px] leading-[1.08] font-bold tracking-tight">
            {titleHead(session.title)} <span className="text-cyan">{titleTail(session.title)}</span>
          </h1>

          {session.introduction && (
            <p className="mt-2 max-w-[68%] text-[13px] leading-relaxed text-secondary-foreground">
              {session.introduction}
            </p>
          )}

          <p className="pointer-events-none absolute right-4 bottom-[4.5rem] text-right">
            <span className="block font-display text-[11px] tracking-[0.32em] text-white/85">
              NURU FAITH
            </span>
            <span className="block text-[8px] tracking-[0.2em] text-white/55">
              FAITH | GROWTH | PURPOSE
            </span>
          </p>

          <div className="mt-4 flex items-center gap-3">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-cyan to-primary"
                style={{
                  width: `${(session.position / Math.max(sessions.data?.length ?? 1, 1)) * 100}%`,
                }}
              />
            </span>
            <span className="shrink-0 text-[13px] font-semibold">
              {session.position} / {sessions.data?.length ?? 0}
            </span>
            {next ? (
              <Link
                to="/series/$slug/$position"
                params={{ slug, position: String(next.position) }}
                aria-label="Next session"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground nuru-glow-sm"
              >
                <ChevronRight className="h-5 w-5" />
              </Link>
            ) : (
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted-foreground"
              >
                <ChevronRight className="h-5 w-5" />
              </span>
            )}
          </div>
        </div>
      </header>

      <article className="space-y-5 px-4 pt-4 pb-5">
        {/* Read / Reflect / Pray */}
        <div className="grid grid-cols-3 gap-2">
          {STAGES.map(({ key, hint, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setStage(key)}
              aria-pressed={stage === key}
              className={cn(
                "flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left transition-colors",
                stage === key
                  ? "border-cyan/70 bg-primary text-primary-foreground nuru-glow-sm"
                  : "border-border bg-surface-2/60 text-secondary-foreground",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.8} />
              <span className="min-w-0">
                <span className="block text-[13px] leading-tight font-bold">{key}</span>
                <span
                  className={cn(
                    "block truncate text-[10px] leading-tight",
                    stage === key ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {hint}
                </span>
              </span>
            </button>
          ))}
        </div>

        {stage === "Read" && primary.length > 0 && (
          <>
            {primary.map((p) => (
              <PassageBlock
                key={p.id}
                reference={p.reference}
                explanation={p.explanation}
                userId={userId}
              />
            ))}
          </>
        )}

        {stage === "Read" && session.context_note && (
          <TeachingCard
            icon={FileText}
            title="Understand the context"
            action="Why it matters"
            to={askSearch(`Why does the context of ${session.title} matter?`)}
          >
            {session.context_note}
          </TeachingCard>
        )}

        {stage === "Read" && session.main_teaching && (
          <TeachingCard
            icon={Users}
            title="What this means"
            action="Go deeper"
            to={askSearch(`Go deeper on what this session means: ${session.title}`)}
          >
            {session.main_teaching}
          </TeachingCard>
        )}

        {stage === "Read" && supporting.length > 0 && (
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

        {stage === "Reflect" && session.reflection_questions?.length > 0 && (
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

        {stage === "Pray" && session.prayer && (
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

        {stage === "Pray" && session.practical_action && (
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

        {stage === "Read" && further.length > 0 && (
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
      {shareSheet.node}
    </AppShell>
  );
}

/** Splits a title so the design can pick the last word out in cyan. */
function titleHead(title: string) {
  const words = title.trim().split(/\s+/);
  return words.length > 1 ? words.slice(0, -1).join(" ") : title;
}
function titleTail(title: string) {
  const words = title.trim().split(/\s+/);
  return words.length > 1 ? words[words.length - 1] : "";
}

function TeachingCard({
  icon: Icon,
  title,
  action,
  to,
  children,
}: {
  icon: LucideIcon;
  title: string;
  action: string;
  to: Record<string, unknown>;
  children: React.ReactNode;
}) {
  return (
    <section className="nuru-card p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold">
          <Icon className="h-5 w-5 shrink-0 text-cyan" strokeWidth={1.8} />
          {title}
        </h2>
        <Link
          to="/ai"
          search={to}
          className="flex shrink-0 items-center gap-0.5 text-[12px] font-semibold text-cyan"
        >
          {action}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed whitespace-pre-line text-secondary-foreground">
        {children}
      </p>
    </section>
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
    <section className="nuru-card relative overflow-hidden p-4 nuru-glow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-2">
          <BookOpen className="h-5 w-5 shrink-0 text-cyan" strokeWidth={1.8} />
          <span className="truncate font-display text-[16px] font-bold">{reference}</span>
        </h2>
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
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-2 text-secondary-foreground"
        >
          <Bookmark className="h-4 w-4" />
        </button>
      </div>

      <ScriptureText
        reference={reference}
        className="mt-3 text-[14px] leading-relaxed text-secondary-foreground"
      />

      {explanation && (
        <p className="mt-3 flex items-start gap-3 rounded-2xl border border-primary/35 bg-primary/10 p-3 text-[13px] leading-relaxed text-secondary-foreground">
          <Crown className="mt-0.5 h-5 w-5 shrink-0 text-cyan" strokeWidth={1.8} />
          {explanation}
        </p>
      )}
    </section>
  );
}
