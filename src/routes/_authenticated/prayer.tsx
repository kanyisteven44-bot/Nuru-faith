import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HandHeart, Lock, NotebookPen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  addPrayerSupport,
  createPrayerRequest,
  deletePrayerRequest,
  fetchMyPrayerSupport,
  fetchPrayerRequests,
  removePrayerSupport,
} from "@/services/content";
import { addPrayerJournalEntry, fetchPrayerJournal } from "@/services/ai";
import { AppShell, BoardHeader } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState, ErrorState, PillTabs } from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/prayer")({
  head: () => ({
    meta: [
      { title: "Prayer — Nuru Faith" },
      {
        name: "description",
        content: "Share a prayer request, pray for others, and keep your own prayer journal.",
      },
    ],
  }),
  component: PrayerScreen,
});

const TABS = ["requests", "journal"] as const;
type Tab = (typeof TABS)[number];

function PrayerScreen() {
  const [tab, setTab] = useState<Tab>("requests");

  return (
    <AppShell>
      <BoardHeader back />

      <div className="px-5 pb-8">
        <h1 className="font-display text-[30px] leading-tight font-semibold">Prayer</h1>
        <p className="mt-1 text-[14px] leading-snug text-ink-2">
          Carry one another. Ask, and keep a record of what you have prayed.
        </p>

        <div className="mt-4">
          <PillTabs
            tabs={TABS}
            value={tab}
            onChange={setTab}
            labels={{ requests: "Requests", journal: "My journal" }}
          />
        </div>

        {tab === "requests" ? <RequestsTab /> : <JournalTab />}
      </div>
    </AppShell>
  );
}

/* ---------- requests ---------- */

function RequestsTab() {
  const qc = useQueryClient();
  const { userId } = useAuth();
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  const requests = useQuery({
    queryKey: ["prayer-requests", userId],
    queryFn: () => fetchPrayerRequests(userId ?? null),
  });
  const supported = useQuery({
    queryKey: ["prayer-support", userId],
    queryFn: () => fetchMyPrayerSupport(userId!),
    enabled: !!userId,
  });

  const create = useMutation({
    mutationFn: () => createPrayerRequest(userId!, body.trim(), anonymous),
    onSuccess: () => {
      setBody("");
      setAnonymous(false);
      toast.success("Shared. The community can pray with you.");
      void qc.invalidateQueries({ queryKey: ["prayer-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deletePrayerRequest(id),
    onSuccess: () => {
      toast.success("Request removed.");
      void qc.invalidateQueries({ queryKey: ["prayer-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleSupport = useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) =>
      on ? addPrayerSupport(userId!, id) : removePrayerSupport(userId!, id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["prayer-support"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      {/* Compose */}
      <section className="mt-5 rounded-2xl border border-border bg-card p-4">
        <label htmlFor="prayer-body" className="block text-[15px] font-semibold">
          Ask for prayer
        </label>
        <textarea
          id="prayer-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="What would you like prayer for?"
          className="mt-2 w-full resize-none rounded-xl border border-border bg-surface px-3.5 py-3 text-[14.5px] leading-relaxed text-foreground placeholder:text-ink-3 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-[13.5px] text-ink-2">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="h-4 w-4 rounded border-border-strong accent-[var(--primary)]"
            />
            Post anonymously
          </label>
          <button
            type="button"
            disabled={!body.trim() || !userId || create.isPending}
            onClick={() => create.mutate()}
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-[14px] font-semibold text-primary-foreground transition-colors hover:brightness-105 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {create.isPending ? "Sharing…" : "Share request"}
          </button>
        </div>
        <p className="mt-2.5 flex items-start gap-1.5 text-[12px] leading-snug text-ink-3">
          <Lock className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />
          Requests are shown to the community without a name attached.
        </p>
      </section>

      {/* List */}
      {requests.isLoading && (
        <div className="mt-5">
          <CardSkeleton count={3} height="h-[108px]" />
        </div>
      )}

      {requests.isError && (
        <div className="mt-5">
          <ErrorState
            message="Prayer requests didn't load."
            onRetry={() => void requests.refetch()}
          />
        </div>
      )}

      {requests.isSuccess && requests.data.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title="No requests yet"
            description="When someone asks for prayer it will appear here."
          />
        </div>
      )}

      {requests.isSuccess && requests.data.length > 0 && (
        <ul className="mt-5 space-y-2.5">
          {requests.data.map((req) => {
            const praying = supported.data?.has(req.id) ?? false;
            return (
              <li key={req.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
                    {req.is_mine ? "Your request" : "A request"}
                  </p>
                  <time
                    dateTime={req.created_at}
                    className="shrink-0 text-[12px] text-ink-3"
                    title={new Date(req.created_at).toLocaleString()}
                  >
                    {relativeDate(req.created_at)}
                  </time>
                </div>
                {req.title && (
                  <h3 className="mt-1.5 font-display text-[17px] leading-tight font-semibold">
                    {req.title}
                  </h3>
                )}
                <p className="mt-1.5 text-[14.5px] leading-relaxed whitespace-pre-wrap text-foreground">
                  {req.body}
                </p>
                <div className="mt-3.5 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!userId || toggleSupport.isPending}
                    onClick={() => toggleSupport.mutate({ id: req.id, on: !praying })}
                    aria-pressed={praying}
                    className={cn(
                      "inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-[13.5px] font-semibold transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      praying
                        ? "bg-accent text-primary"
                        : "border border-border text-ink-2 hover:bg-surface-2",
                    )}
                  >
                    <HandHeart className="h-4 w-4" strokeWidth={2} />
                    {praying ? "You prayed" : "I'll pray"}
                  </button>
                  {req.is_mine && (
                    <button
                      type="button"
                      onClick={() => remove.mutate(req.id)}
                      disabled={remove.isPending}
                      className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-[13.5px] font-semibold text-ink-3 transition-colors hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2} />
                      Remove
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

/* ---------- journal ---------- */

function JournalTab() {
  const qc = useQueryClient();
  const { userId } = useAuth();
  const [content, setContent] = useState("");

  const journal = useQuery({
    queryKey: ["prayer-journal", userId],
    queryFn: () => fetchPrayerJournal(userId!),
    enabled: !!userId,
  });

  const add = useMutation({
    mutationFn: () =>
      addPrayerJournalEntry({ userId: userId!, title: null, content: content.trim() }),
    onSuccess: () => {
      setContent("");
      toast.success("Saved to your journal.");
      void qc.invalidateQueries({ queryKey: ["prayer-journal"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <section className="mt-5 rounded-2xl border border-border bg-card p-4">
        <label htmlFor="journal-body" className="block text-[15px] font-semibold">
          Write a prayer
        </label>
        <textarea
          id="journal-body"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          maxLength={4000}
          placeholder="Speak freely. Only you can read this."
          className="mt-2 w-full resize-none rounded-xl border border-border bg-surface px-3.5 py-3 text-[14.5px] leading-relaxed text-foreground placeholder:text-ink-3 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-[12px] text-ink-3">
            <Lock className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />
            Private to you
          </p>
          <button
            type="button"
            disabled={!content.trim() || !userId || add.isPending}
            onClick={() => add.mutate()}
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-[14px] font-semibold text-primary-foreground transition-colors hover:brightness-105 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {add.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </section>

      {journal.isLoading && (
        <div className="mt-5">
          <CardSkeleton count={2} height="h-[92px]" />
        </div>
      )}

      {journal.isError && (
        <div className="mt-5">
          <ErrorState message="Your journal didn't load." onRetry={() => void journal.refetch()} />
        </div>
      )}

      {journal.isSuccess && journal.data.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title="Your journal is empty"
            description="Prayers you write here — and ones you save from Ask Nuru or a lesson — collect in this place."
          />
        </div>
      )}

      {journal.isSuccess && journal.data.length > 0 && (
        <ul className="mt-5 space-y-2.5">
          {journal.data.map((entry) => (
            <li key={entry.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
                  <NotebookPen className="h-3.5 w-3.5" strokeWidth={2} />
                  {entry.source ? entry.source : "Journal"}
                </span>
                <time
                  dateTime={entry.created_at}
                  className="shrink-0 text-[12px] text-ink-3"
                  title={new Date(entry.created_at).toLocaleString()}
                >
                  {relativeDate(entry.created_at)}
                </time>
              </div>
              {entry.title && (
                <h3 className="mt-1.5 font-display text-[17px] leading-tight font-semibold">
                  {entry.title}
                </h3>
              )}
              <p className="mt-1.5 text-[14.5px] leading-relaxed whitespace-pre-wrap text-foreground">
                {entry.content}
              </p>
              {entry.scripture_ref && (
                <p className="mt-2 text-[12.5px] font-semibold text-primary">
                  {entry.scripture_ref}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function relativeDate(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
