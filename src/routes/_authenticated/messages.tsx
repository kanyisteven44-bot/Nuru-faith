import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle, Send, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchMentors } from "@/services/content";
import {
  CHAT_LIMIT,
  fetchChatMessages,
  fetchChatNames,
  fetchMentorThreads,
  sendChatMessage,
  type ChatMessage,
  type ChatTarget,
} from "@/services/messaging";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/nuru/Primitives";
import { z } from "zod";

const searchSchema = z.object({
  mentor: z.string().uuid().optional(),
  requester: z.string().uuid().optional(),
  group: z.string().uuid().optional(),
});
export const Route = createFileRoute("/_authenticated/messages")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Messages — Nuru Faith" }] }),
  component: MessagesScreen,
});

function MessagesScreen() {
  const { userId } = useAuth();
  const search = Route.useSearch();
  const mentors = useQuery({ queryKey: ["mentors"], queryFn: fetchMentors });
  const groups = useQuery({
    queryKey: ["chat-groups", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("group_id, groups(id,name)")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []).flatMap((r) => (r.groups ? [r.groups] : []));
    },
  });
  const threads = useQuery({
    queryKey: ["mentor-threads", userId],
    queryFn: fetchMentorThreads,
    enabled: !!userId,
    refetchInterval: 10000,
  });
  const names = useQuery({
    queryKey: ["thread-names", threads.data],
    queryFn: () => fetchChatNames((threads.data ?? []).map((t) => t.requester_id)),
    enabled: !!threads.data,
  });
  const mentor = mentors.data?.find((m) => m.id === search.mentor);
  const group = groups.data?.find((g) => g.id === search.group);
  const requester = mentor?.user_id === userId ? search.requester : userId;
  const target: ChatTarget | undefined = group
    ? { group: group.id }
    : mentor?.user_id && requester && requester !== mentor.user_id
      ? { mentor: mentor.id, requester }
      : undefined;
  const title =
    group?.name ??
    (mentor?.user_id === userId
      ? (names.data?.[requester ?? ""] ?? "Mentor conversation")
      : mentor?.display_name) ??
    "Messages";
  const loading = mentors.isLoading || groups.isLoading;
  const failed = mentors.isError || groups.isError || threads.isError;
  return (
    <AppShell>
      <ScreenHeader title={title} back />
      <div className="space-y-4 px-4 pb-6">
        {search.group || search.mentor ? (
          <>
            <Link
              to="/messages"
              search={{}}
              className="inline-flex min-h-10 items-center gap-2 text-sm text-leaf"
            >
              <ArrowLeft className="h-4 w-4" /> All messages
            </Link>
            {loading ? (
              <CardSkeleton count={2} height="h-20" />
            ) : failed ? (
              <ErrorState
                onRetry={() => {
                  void mentors.refetch();
                  void groups.refetch();
                  void threads.refetch();
                }}
              />
            ) : target && userId ? (
              <ChatThread key={JSON.stringify(target)} target={target} userId={userId} />
            ) : (
              <EmptyState
                title="Chat unavailable"
                description="Join this group first, or choose a mentor who has a Nuru account. Mentors can open member conversations from their inbox."
              />
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Talk with your mentors and groups here. In-app messages use your internet connection.
            </p>
            {loading || threads.isLoading ? (
              <CardSkeleton count={3} height="h-16" />
            ) : failed ? (
              <ErrorState
                onRetry={() => {
                  void mentors.refetch();
                  void groups.refetch();
                  void threads.refetch();
                }}
              />
            ) : (
              <>
                <h2 className="font-display font-semibold">Conversations</h2>
                {(threads.data ?? []).map((t) => {
                  const m = mentors.data?.find((v) => v.id === t.mentor_id);
                  return (
                    <Link
                      key={`${t.mentor_id}:${t.requester_id}`}
                      to="/messages"
                      search={{ mentor: t.mentor_id, requester: t.requester_id }}
                      className="nuru-card flex min-h-20 items-center gap-3 p-3"
                    >
                      <MessageCircle className="h-5 w-5 shrink-0 text-leaf" />
                      <span className="min-w-0">
                        <span className="block font-semibold">
                          {m?.user_id === userId
                            ? (names.data?.[t.requester_id] ?? "Nuru member")
                            : (m?.display_name ?? "Mentor")}
                        </span>
                        <span className="block truncate text-sm text-muted-foreground">
                          {t.body}
                        </span>
                      </span>
                    </Link>
                  );
                })}
                {!threads.data?.length && (
                  <p className="text-sm text-muted-foreground">
                    No mentor conversations yet. Choose a mentor below to start one.
                  </p>
                )}
                <h2 className="pt-2 font-display font-semibold">My groups</h2>
                {(groups.data ?? []).map((g) => (
                  <Link
                    key={g.id}
                    to="/messages"
                    search={{ group: g.id }}
                    className="nuru-card flex min-h-14 items-center gap-3 p-3"
                  >
                    <Users className="h-5 w-5 text-leaf" />
                    <span className="font-semibold">{g.name}</span>
                  </Link>
                ))}
                {!groups.data?.length && (
                  <Link
                    to="/groups"
                    className="inline-flex min-h-10 items-center text-sm text-leaf"
                  >
                    Find a group to join →
                  </Link>
                )}
                <h2 className="pt-2 font-display font-semibold">Message a mentor</h2>
                {(mentors.data ?? [])
                  .filter((m) => m.user_id && m.user_id !== userId)
                  .map((m) => (
                    <Link
                      key={m.id}
                      to="/messages"
                      search={{ mentor: m.id }}
                      className="nuru-card flex min-h-14 items-center gap-3 p-3"
                    >
                      <MessageCircle className="h-5 w-5 text-leaf" />
                      <span>
                        <span className="block font-semibold">{m.display_name}</span>
                        <span className="text-xs text-muted-foreground">{m.role_title}</span>
                      </span>
                    </Link>
                  ))}
                <Link to="/mentors" className="inline-flex min-h-10 items-center text-sm text-leaf">
                  Browse all mentors →
                </Link>
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function ChatThread({ target, userId }: { target: ChatTarget; userId: string }) {
  const qc = useQueryClient();
  const key = ["chat-messages", userId, target];
  const messages = useQuery({
    queryKey: key,
    queryFn: () => fetchChatMessages(target),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });
  const [older, setOlder] = useState<ChatMessage[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef<{ body: string; id: string } | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const rows = [
    ...new Map(
      [...(messages.isError ? [] : older), ...(messages.isError ? [] : (messages.data ?? []))].map(
        (m) => [m.id, m],
      ),
    ).values(),
  ].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const names = useQuery({
    queryKey: ["chat-names", rows.map((m) => m.sender_id)],
    queryFn: () => fetchChatNames(rows.map((m) => m.sender_id)),
    enabled: rows.length > 0,
  });
  useEffect(() => {
    if (messages.data)
      setOlder((prev) => [...new Map([...prev, ...messages.data!].map((m) => [m.id, m])).values()]);
  }, [messages.data]);
  const latest = messages.data?.at(-1)?.id;
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "instant", block: "nearest" });
  }, [latest]);
  async function loadOlder() {
    if (!rows.length) return;
    setLoadingOlder(true);
    setError("");
    try {
      const page = await fetchChatMessages(target, rows[0]!);
      setOlder((prev) => [...page, ...prev]);
      setHasOlder(page.length === CHAT_LIMIT);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load earlier messages.");
    } finally {
      setLoadingOlder(false);
    }
  }
  async function send() {
    if (sending || !draft.trim()) return;
    setSending(true);
    setError("");
    if (pending.current?.body !== draft.trim())
      pending.current = { body: draft.trim(), id: crypto.randomUUID() };
    try {
      await sendChatMessage(target, userId, pending.current.body, pending.current.id);
      pending.current = null;
      setDraft("");
      await qc.invalidateQueries({ queryKey: key });
      await qc.invalidateQueries({ queryKey: ["mentor-threads", userId] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send your message.");
    } finally {
      setSending(false);
    }
  }
  return (
    <section className="nuru-card overflow-hidden">
      <p className="border-b border-border px-4 py-3 text-xs text-muted-foreground">
        Only participants can read this conversation. Messages refresh every few seconds.
      </p>
      <div
        className="max-h-[55dvh] min-h-56 space-y-3 overflow-y-auto p-4"
        role="log"
        aria-label="Conversation messages"
        aria-live="polite"
      >
        {messages.isLoading && <CardSkeleton count={2} height="h-12" />}
        {messages.isError && <ErrorState onRetry={() => void messages.refetch()} />}
        {rows.length >= CHAT_LIMIT && hasOlder && (
          <button
            className="min-h-10 w-full text-sm text-leaf"
            disabled={loadingOlder}
            onClick={() => void loadOlder()}
          >
            {loadingOlder ? "Loading…" : "Load earlier messages"}
          </button>
        )}
        {!messages.isLoading && !messages.isError && !rows.length && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Start the conversation with a hello.
          </p>
        )}
        {rows.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.sender_id === userId ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 ${m.sender_id === userId ? "bg-primary text-primary-foreground" : "bg-surface-2 text-secondary-foreground"}`}
            >
              <p className="mb-1 text-[11px] font-semibold opacity-80">
                {m.sender_id === userId ? "You" : (names.data?.[m.sender_id] ?? "Nuru member")}
              </p>
              <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
              <time className="mt-1 block text-[10px] opacity-70" dateTime={m.created_at}>
                {new Date(m.created_at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <form
        className="space-y-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <label htmlFor="chat-message" className="sr-only">
          Your message
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id="chat-message"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
            disabled={sending}
            rows={2}
            placeholder="Write a message…"
            className="min-h-12 min-w-0 flex-1 resize-none rounded-xl border border-border-strong bg-surface-2 p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim() || messages.isError}
            aria-label={sending ? "Sending message" : "Send message"}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        <p className="text-right text-[10px] text-muted-foreground">{draft.length}/2,000</p>
      </form>
    </section>
  );
}
