import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  MessageCircle,
  Search,
  Send,
  SquarePen,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchMentors } from "@/services/content";
import {
  CHAT_LIMIT,
  fetchChatMessages,
  fetchChatNames,
  fetchChatProfiles,
  fetchDirectThreads,
  fetchMentorThreads,
  sendChatMessage,
  type ChatMessage,
  type ChatProfile,
  type ChatTarget,
} from "@/services/messaging";
import { AppShell, Avatar, ScreenHeader } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/nuru/Primitives";
import { cn } from "@/lib/utils";
import { z } from "zod";

const searchSchema = z.object({
  user: z.string().uuid().optional(),
  mentor: z.string().uuid().optional(),
  requester: z.string().uuid().optional(),
  group: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/messages")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Messages — Nuru Faith" }] }),
  component: MessagesScreen,
});

const INBOX_TABS = ["All", "People", "Groups"] as const;
type InboxTab = (typeof INBOX_TABS)[number];

function MessagesScreen() {
  const { userId } = useAuth();
  const search = Route.useSearch();
  const [tab, setTab] = useState<InboxTab>("All");

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
      return (data ?? []).flatMap((row) => (row.groups ? [row.groups] : []));
    },
  });
  const mentorThreads = useQuery({
    queryKey: ["mentor-threads", userId],
    queryFn: fetchMentorThreads,
    enabled: !!userId,
    refetchInterval: 10000,
  });
  const directThreads = useQuery({
    queryKey: ["direct-threads", userId],
    queryFn: () => fetchDirectThreads(userId!),
    enabled: !!userId,
    refetchInterval: 10000,
  });

  const participantIds = useMemo(() => {
    const ids = new Set<string>();
    for (const thread of directThreads.data ?? []) ids.add(thread.peer_id);
    for (const thread of mentorThreads.data ?? []) ids.add(thread.requester_id);
    if (search.user) ids.add(search.user);
    return [...ids];
  }, [directThreads.data, mentorThreads.data, search.user]);

  const profiles = useQuery({
    queryKey: ["message-profiles", participantIds],
    queryFn: () => fetchChatProfiles(participantIds),
    enabled: participantIds.length > 0,
  });

  const mentor = mentors.data?.find((item) => item.id === search.mentor);
  const group = groups.data?.find((item) => item.id === search.group);
  const directProfile = search.user ? profiles.data?.[search.user] : undefined;
  const requester = mentor?.user_id === userId ? search.requester : userId;

  const target: ChatTarget | undefined =
    search.user && userId && search.user !== userId
      ? { user: search.user, self: userId }
      : group
        ? { group: group.id }
        : mentor?.user_id && requester && requester !== mentor.user_id
          ? { mentor: mentor.id, requester }
          : undefined;

  const directName =
    directProfile?.full_name?.trim() ||
    directProfile?.username?.trim() ||
    "Nuru member";
  const title =
    search.user
      ? directName
      : group?.name ??
        (mentor?.user_id === userId
          ? profiles.data?.[requester ?? ""]?.full_name ||
            profiles.data?.[requester ?? ""]?.username ||
            "Mentor conversation"
          : mentor?.display_name) ??
        "Messages";

  const inThread = !!(search.user || search.group || search.mentor);
  const loading =
    mentors.isLoading ||
    groups.isLoading ||
    mentorThreads.isLoading ||
    directThreads.isLoading;
  const failed =
    mentors.isError ||
    groups.isError ||
    mentorThreads.isError ||
    directThreads.isError;

  return (
    <AppShell>
      <ScreenHeader
        title={title}
        back={inThread}
        right={
          !inThread ? (
            <div className="flex items-center gap-1">
              <Link
                to="/explore"
                search={{ q: "", kind: "profile" }}
                aria-label="Search people"
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-2"
              >
                <Search className="h-5 w-5" />
              </Link>
              <Link
                to="/explore"
                search={{ q: "", kind: "profile" }}
                aria-label="Start a new conversation"
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-2"
              >
                <SquarePen className="h-5 w-5" />
              </Link>
            </div>
          ) : undefined
        }
      />

      <div className="px-4 pb-6">
        {inThread ? (
          <ThreadView
            target={target}
            userId={userId}
            searchUser={search.user}
            directProfile={directProfile}
            loading={loading || profiles.isLoading}
            failed={failed || profiles.isError}
          />
        ) : (
          <>
            <div className="mb-4 flex gap-2 overflow-x-auto">
              {INBOX_TABS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTab(item)}
                  aria-pressed={tab === item}
                  className={cn(
                    "min-h-10 shrink-0 rounded-full px-5 text-sm font-semibold transition-colors",
                    tab === item
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card text-secondary-foreground",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>

            {loading ? (
              <CardSkeleton count={5} height="h-16" />
            ) : failed ? (
              <ErrorState
                onRetry={() => {
                  void mentors.refetch();
                  void groups.refetch();
                  void mentorThreads.refetch();
                  void directThreads.refetch();
                }}
              />
            ) : (
              <Inbox
                tab={tab}
                userId={userId}
                directThreads={directThreads.data ?? []}
                mentorThreads={mentorThreads.data ?? []}
                profiles={profiles.data ?? {}}
                mentors={mentors.data ?? []}
                groups={groups.data ?? []}
              />
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function ThreadView({
  target,
  userId,
  searchUser,
  directProfile,
  loading,
  failed,
}: {
  target: ChatTarget | undefined;
  userId: string | null;
  searchUser: string | undefined;
  directProfile: ChatProfile | undefined;
  loading: boolean;
  failed: boolean;
}) {
  if (loading) return <CardSkeleton count={3} height="h-16" />;
  if (failed) return <ErrorState />;
  if (!target || !userId) {
    return (
      <EmptyState
        title="Chat unavailable"
        description="Choose another Nuru member, group or mentor to start a conversation."
      />
    );
  }

  return (
    <div className="space-y-3">
      <Link
        to="/messages"
        search={{}}
        className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> All messages
      </Link>

      {searchUser && directProfile && (
        <Link
          to="/discovery/$kind/$id"
          params={{ kind: "profile", id: searchUser }}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
        >
          <Avatar
            url={directProfile.avatar_url}
            name={directProfile.full_name || directProfile.username || ""}
            seed={searchUser}
            size="sm"
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">
              {directProfile.full_name || directProfile.username || "Nuru member"}
            </span>
            {directProfile.username && (
              <span className="block truncate text-xs text-muted-foreground">
                @{directProfile.username}
              </span>
            )}
          </span>
        </Link>
      )}

      <ChatThread key={JSON.stringify(target)} target={target} userId={userId} />
    </div>
  );
}

function Inbox({
  tab,
  userId,
  directThreads,
  mentorThreads,
  profiles,
  mentors,
  groups,
}: {
  tab: InboxTab;
  userId: string | null;
  directThreads: Awaited<ReturnType<typeof fetchDirectThreads>>;
  mentorThreads: Awaited<ReturnType<typeof fetchMentorThreads>>;
  profiles: Awaited<ReturnType<typeof fetchChatProfiles>>;
  mentors: Awaited<ReturnType<typeof fetchMentors>>;
  groups: { id: string; name: string }[];
}) {
  const showPeople = tab === "All" || tab === "People";
  const showGroups = tab === "All" || tab === "Groups";
  const hasPeople = directThreads.length > 0 || mentorThreads.length > 0;
  const hasGroups = groups.length > 0;

  return (
    <div className="space-y-5">
      {showPeople && (
        <section>
          <h2 className="mb-2 px-1 font-display text-lg font-semibold">
            {tab === "All" ? "People" : "Conversations"}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {directThreads.map((thread) => {
              const person = profiles[thread.peer_id];
              const name = person?.full_name || person?.username || "Nuru member";
              return (
                <Link
                  key={thread.peer_id}
                  to="/messages"
                  search={{ user: thread.peer_id }}
                  className="flex min-h-18 items-center gap-3 border-b border-border/60 p-3 last:border-b-0 hover:bg-surface-2"
                >
                  <Avatar
                    url={person?.avatar_url ?? null}
                    name={name}
                    seed={thread.peer_id}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {thread.sender_id === userId ? "You: " : ""}
                      {thread.body}
                    </span>
                  </span>
                  <time className="shrink-0 text-[10px] text-muted-foreground" dateTime={thread.created_at}>
                    {formatInboxTime(thread.created_at)}
                  </time>
                </Link>
              );
            })}

            {mentorThreads.map((thread) => {
              const mentor = mentors.find((item) => item.id === thread.mentor_id);
              const otherId = mentor?.user_id === userId ? thread.requester_id : mentor?.user_id;
              const person = otherId ? profiles[otherId] : undefined;
              const name =
                mentor?.user_id === userId
                  ? person?.full_name || person?.username || "Nuru member"
                  : mentor?.display_name || "Mentor";
              return (
                <Link
                  key={`mentor:${thread.mentor_id}:${thread.requester_id}`}
                  to="/messages"
                  search={{ mentor: thread.mentor_id, requester: thread.requester_id }}
                  className="flex min-h-18 items-center gap-3 border-b border-border/60 p-3 last:border-b-0 hover:bg-surface-2"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MessageCircle className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {thread.body}
                    </span>
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                    Mentor
                  </span>
                </Link>
              );
            })}

            {!hasPeople && (
              <div className="p-6 text-center">
                <MessageCircle className="mx-auto h-7 w-7 text-muted-foreground" />
                <p className="mt-2 text-sm font-semibold">No conversations yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Find a person and open their profile to send a message.
                </p>
                <Link
                  to="/explore"
                  search={{ q: "", kind: "profile" }}
                  className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-primary"
                >
                  Find people →
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {showGroups && (
        <section>
          <h2 className="mb-2 px-1 font-display text-lg font-semibold">Groups</h2>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {groups.map((group) => (
              <Link
                key={group.id}
                to="/messages"
                search={{ group: group.id }}
                className="flex min-h-16 items-center gap-3 border-b border-border/60 p-3 last:border-b-0 hover:bg-surface-2"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-growth/10 text-growth">
                  <Users className="h-5 w-5" />
                </span>
                <span className="font-semibold">{group.name}</span>
              </Link>
            ))}
            {!hasGroups && (
              <div className="p-5 text-center">
                <p className="text-sm text-muted-foreground">You have no group chats yet.</p>
                <Link to="/groups" className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-primary">
                  Find a group →
                </Link>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function formatInboxTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
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
        (message) => [message.id, message],
      ),
    ).values(),
  ].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const names = useQuery({
    queryKey: ["chat-names", rows.map((message) => message.sender_id)],
    queryFn: () => fetchChatNames(rows.map((message) => message.sender_id)),
    enabled: rows.length > 0,
  });

  useEffect(() => {
    if (messages.data)
      setOlder((previous) => [
        ...new Map([...previous, ...messages.data!].map((message) => [message.id, message])).values(),
      ]);
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
      setOlder((previous) => [...page, ...previous]);
      setHasOlder(page.length === CHAT_LIMIT);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Couldn't load earlier messages.");
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
      await Promise.all([
        qc.invalidateQueries({ queryKey: key }),
        qc.invalidateQueries({ queryKey: ["mentor-threads", userId] }),
        qc.invalidateQueries({ queryKey: ["direct-threads", userId] }),
      ]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Couldn't send your message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <p className="border-b border-border px-4 py-3 text-xs text-muted-foreground">
        Only conversation participants can read these messages.
      </p>
      <div
        className="max-h-[58dvh] min-h-64 space-y-3 overflow-y-auto bg-surface/40 p-4"
        role="log"
        aria-label="Conversation messages"
        aria-live="polite"
      >
        {messages.isLoading && <CardSkeleton count={2} height="h-12" />}
        {messages.isError && <ErrorState onRetry={() => void messages.refetch()} />}
        {rows.length >= CHAT_LIMIT && hasOlder && (
          <button
            className="min-h-10 w-full text-sm font-semibold text-primary"
            disabled={loadingOlder}
            onClick={() => void loadOlder()}
          >
            {loadingOlder ? "Loading…" : "Load earlier messages"}
          </button>
        )}
        {!messages.isLoading && !messages.isError && !rows.length && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Start the conversation with a hello 👋
          </p>
        )}
        {rows.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_id === userId ? "justify-end" : "justify-start"}`}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2",
                message.sender_id === userId
                  ? "rounded-br-md bg-primary text-primary-foreground"
                  : "rounded-bl-md bg-card text-secondary-foreground shadow-sm",
              )}
            >
              <p className="mb-1 text-[11px] font-semibold opacity-75">
                {message.sender_id === userId
                  ? "You"
                  : names.data?.[message.sender_id] ?? "Nuru member"}
              </p>
              <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
              <time className="mt-1 block text-[10px] opacity-65" dateTime={message.created_at}>
                {new Date(message.created_at).toLocaleString(undefined, {
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
        className="border-t border-border bg-card p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        {error && (
          <p role="alert" className="mb-2 text-sm text-destructive">
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
            onChange={(event) => setDraft(event.target.value)}
            maxLength={2000}
            disabled={sending}
            rows={1}
            placeholder="Message…"
            className="min-h-12 min-w-0 flex-1 resize-none rounded-2xl border border-border-strong bg-surface-2 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim() || messages.isError}
            aria-label={sending ? "Sending message" : "Send message"}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </section>
  );
}
