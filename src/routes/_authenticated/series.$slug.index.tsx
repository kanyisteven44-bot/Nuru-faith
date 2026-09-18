import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Check, MessageCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { resolveMedia } from "@/lib/media";
import {
  fetchMyCompletedSessions,
  fetchMyProgress,
  fetchSeriesBySlug,
  fetchSessions,
  startSeries,
} from "@/services/series";
import { AppShell } from "@/components/nuru/AppShell";
import {
  CardSkeleton,
  Chip,
  EmptyState,
  ErrorState,
  GradientButton,
  PillTabs,
} from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/series/$slug/")({
  head: () => ({
    meta: [
      { title: "Scripture Series — Nuru Faith" },
      {
        name: "description",
        content: "A guided Bible study: read, understand the context, reflect, pray and apply.",
      },
      { property: "og:title", content: "Scripture Series — Nuru Faith" },
      { property: "og:description", content: "A guided, multi-session Bible study on Nuru Faith." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SeriesDetail,
});

const DETAIL_TABS = ["Sessions", "About", "Discussion"] as const;
type DetailTab = (typeof DETAIL_TABS)[number];

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="nuru-card px-3.5 py-2.5">
      <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold capitalize">{value}</dd>
    </div>
  );
}

function SeriesDetail() {
  const { slug } = Route.useParams();
  const [tab, setTab] = useState<DetailTab>("Sessions");
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
  const done = useQuery({
    queryKey: ["series-done", userId, seriesId],
    queryFn: () => fetchMyCompletedSessions(userId!, seriesId!),
    enabled: !!userId && !!seriesId,
  });
  const progress = useQuery({
    queryKey: ["series-progress", userId],
    queryFn: () => fetchMyProgress(userId!),
    enabled: !!userId,
  });

  const start = useMutation({
    mutationFn: async () => {
      if (!userId || !seriesId) throw new Error("Sign in to start");
      await startSeries(userId, seriesId, sessions.data?.[0]?.id ?? null);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["series-progress", userId] });
      const next = nextPosition();
      void navigate({ to: "/series/$slug/$position", params: { slug, position: String(next) } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't start"),
  });

  const completed = done.data ?? [];
  const list = sessions.data ?? [];
  const percent = list.length ? Math.round((completed.length / list.length) * 100) : 0;

  function nextPosition() {
    const next = list.find((s) => !completed.includes(s.id));
    return next?.position ?? list[0]?.position ?? 1;
  }

  if (series.isLoading) {
    return (
      <AppShell>
        <div className="p-4">
          <CardSkeleton count={4} height="h-24" />
        </div>
      </AppShell>
    );
  }
  if (series.isError || !series.data) {
    return (
      <AppShell>
        <div className="p-4">
          <ErrorState
            message="That series isn't available."
            onRetry={() => void series.refetch()}
          />
        </div>
      </AppShell>
    );
  }

  const s = series.data;
  const started = (progress.data ?? []).some((p) => p.series_id === s.id);

  return (
    <AppShell>
      <div className="relative">
        <img src={resolveMedia(s.cover_image)} alt="" className="h-52 w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/10" />
        <Link
          to="/series"
          aria-label="Back to Scripture Series"
          className="absolute top-[max(0.75rem,env(safe-area-inset-top))] left-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      <div className="-mt-10 space-y-5 px-4 pb-8">
        <div>
          <div className="flex flex-wrap gap-2">
            <Chip tone="brand">{s.category}</Chip>
            <Chip>{s.difficulty}</Chip>
          </div>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">{s.title}</h1>
          {s.description && <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>}
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-cyan">
            <BookOpen className="h-3.5 w-3.5" />
            {s.session_count} sessions
            <span className="text-muted-foreground">· {s.estimated_duration} min</span>
          </p>
        </div>

        {started && (
          <div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan to-primary"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {completed.length} of {list.length} sessions · take it at your own pace
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <GradientButton
            onClick={() => start.mutate()}
            disabled={start.isPending || list.length === 0}
          >
            {started ? "Continue series" : "Start series"}
          </GradientButton>
          <Link
            to="/ai"
            search={{
              contextType: "series",
              contextId: s.id,
              contextLabel: `Scripture Series: ${s.title}`,
              q: `What is the Bible's overall message about ${s.title.toLowerCase()}?`,
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface-2 px-5 text-sm font-medium"
          >
            <Sparkles className="h-4 w-4 text-cyan" /> Ask Nuru AI
          </Link>
        </div>

        <PillTabs tabs={DETAIL_TABS} value={tab} onChange={setTab} />

        <section className={tab === "Sessions" ? undefined : "hidden"}>
          {sessions.isLoading && <CardSkeleton count={4} height="h-16" />}
          {!sessions.isLoading && list.length === 0 && (
            <EmptyState
              title="Sessions coming soon"
              description="This series is still being prepared."
            />
          )}
          <ol className="space-y-2">
            {list.map((session) => {
              const isDone = completed.includes(session.id);
              return (
                <li key={session.id}>
                  <Link
                    to="/series/$slug/$position"
                    params={{ slug, position: String(session.position) }}
                    className="nuru-card flex items-center gap-3 px-4 py-3 active:opacity-90"
                  >
                    <span
                      className={
                        isDone
                          ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-growth/20 text-growth"
                          : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-muted-foreground"
                      }
                    >
                      {isDone ? <Check className="h-4 w-4" /> : session.position}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{session.title}</span>
                      {session.introduction && (
                        <span className="line-clamp-1 block text-xs text-muted-foreground">
                          {session.introduction}
                        </span>
                      )}
                    </span>
                    <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>

        {tab === "About" && (
          <section className="space-y-3">
            <p className="text-sm leading-relaxed text-secondary-foreground">
              {s.description ?? "This series is still being prepared."}
            </p>
            <dl className="grid grid-cols-2 gap-2">
              <Meta label="Sessions" value={String(s.session_count)} />
              <Meta label="Time" value={`${s.estimated_duration} min`} />
              <Meta label="Level" value={s.difficulty} />
              <Meta label="Topic" value={s.category} />
            </dl>
          </section>
        )}

        {tab === "Discussion" && (
          <div className="nuru-card flex items-start gap-3 px-4 py-4">
            <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
            <p className="text-xs text-muted-foreground">
              Studying with others? Share a session in Community or with your group and use the
              discussion prompt at the end of each session.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
