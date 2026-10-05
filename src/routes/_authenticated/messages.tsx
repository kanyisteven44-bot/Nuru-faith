import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  MessageCircle,
  Phone,
  Search,
  SquarePen,
  Users,
  Video,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchMentors } from "@/services/content";
import {
  fetchChatProfiles,
  fetchDirectThreads,
  fetchMentorThreads,
  markDirectMessagesDelivered,
  type ChatProfile,
  type ChatTarget,
} from "@/services/messaging";
import {
  endCallSession,
  fetchIncomingCall,
  type CallKind,
} from "@/services/calls";
import { AppShell, Avatar, ScreenHeader } from "@/components/nuru/AppShell";
import { CallPanel } from "@/components/nuru/CallPanel";
import { CoverImage } from "@/components/nuru/CoverImage";
import { RichChatThread } from "@/components/nuru/RichChatThread";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/nuru/Primitives";
import { resolveMedia } from "@/lib/media";
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

type ActiveCall = {
  kind: CallKind;
  peer: ChatProfile;
  incoming?: {
    id: string;
    kind: string;
    offer: unknown;
    caller_id: string;
  };
};

function MessagesScreen() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const search = Route.useSearch();
  const [tab, setTab] = useState<InboxTab>("All");
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);

  const mentors = useQuery({ queryKey: ["mentors"], queryFn: fetchMentors });
  const groups = useQuery({
    queryKey: ["chat-groups", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("group_id, groups(id,name,cover_url)")
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
    refetchInterval: 5000,
  });
  const incoming = useQuery({
    queryKey: ["incoming-call", userId],
    queryFn: () => fetchIncomingCall(userId!),
    enabled: !!userId && !activeCall,
    refetchInterval: activeCall ? false : 2000,
  });

  useEffect(() => {
    if (!userId) return;
    void markDirectMessagesDelivered(userId).then(() => {
      void qc.invalidateQueries({ queryKey: ["direct-threads", userId] });
    });
  }, [qc, userId]);

  const participantIds = useMemo(() => {
    const ids = new Set<string>();
    for (const thread of directThreads.data ?? []) ids.add(thread.peer_id);
    for (const thread of mentorThreads.data ?? []) ids.add(thread.requester_id);
    if (search.user) ids.add(search.user);
    if (incoming.data?.caller_id) ids.add(incoming.data.caller_id);
    return [...ids];
  }, [directThreads.data, incoming.data?.caller_id, mentorThreads.data, search.user]);

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

  const incomingProfile = incoming.data?.caller_id
    ? profiles.data?.[incoming.data.caller_id]
    : undefined;

  function startCall(kind: CallKind) {
    if (!directProfile) return;
    setActiveCall({ kind, peer: directProfile });
  }

  async function declineIncoming() {
    if (!incoming.data) return;
    try {
      await endCallSession(incoming.data.id, "declined");
      await incoming.refetch();
    } catch {
      // The next poll will reconcile call state.
    }
  }

  function acceptIncoming() {
    if (!incoming.data || !incomingProfile) return;
    setActiveCall({
      kind: incoming.data.kind as CallKind,
      peer: incomingProfile,
      incoming: {
        id: incoming.data.id,
        kind: incoming.data.kind,
        offer: incoming.data.offer,
        caller_id: incoming.data.caller_id,
      },
    });
  }

  return (
    <AppShell hideNav={inThread || !!activeCall}>
      <ScreenHeader
        title={title}
        back={inThread}
        right={
          search.user && directProfile ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => startCall("audio")}
                aria-label="Start audio call"
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-2"
              >
                <Phone className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => startCall("video")}
                aria-label="Start video call"
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-2"
              >
                <Video className="h-5 w-5" />
              </button>
            </div>
          ) : !inThread ? (
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

      <div className={cn("px-4", inThread ? "pb-4" : "pb-6")}>
        {incoming.data && incomingProfile && !activeCall && (
          <IncomingCallCard
            profile={incomingProfile}
            kind={incoming.data.kind as CallKind}
            onAccept={acceptIncoming}
            onDecline={() => void declineIncoming()}
          />
        )}

        {inThread ? (
          <ThreadView
            target={target}
            userId={userId}
            searchUser={search.user}
            directProfile={directProfile}
            groupCover={group?.cover_url ?? null}
            groupName={group?.name}
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

      {activeCall && userId && (
        <CallPanel
          userId={userId}
          peer={activeCall.peer}
          kind={activeCall.kind}
          incoming={activeCall.incoming ?? null}
          onClose={() => {
            setActiveCall(null);
            void incoming.refetch();
          }}
        />
      )}
    </AppShell>
  );
}

function IncomingCallCard({
  profile,
  kind,
  onAccept,
  onDecline,
}: {
  profile: ChatProfile;
  kind: CallKind;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const name = profile.full_name || profile.username || "Nuru member";
  return (
    <section className="mb-4 flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/8 p-3 shadow-sm">
      <Avatar
        url={profile.avatar_url}
        name={name}
        seed={profile.id}
        size="md"
        className="h-12 w-12"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{name}</p>
        <p className="text-xs text-muted-foreground">
          Incoming {kind === "video" ? "video" : "audio"} call
        </p>
      </div>
      <button
        type="button"
        onClick={onDecline}
        className="min-h-10 rounded-full border border-destructive/30 px-3 text-xs font-bold text-destructive"
      >
        Decline
      </button>
      <button
        type="button"
        onClick={onAccept}
        className="min-h-10 rounded-full bg-growth px-3 text-xs font-bold text-white"
      >
        Answer
      </button>
    </section>
  );
}

function ThreadView({
  target,
  userId,
  searchUser,
  directProfile,
  groupCover,
  groupName,
  loading,
  failed,
}: {
  target: ChatTarget | undefined;
  userId: string | null;
  searchUser: string | undefined;
  directProfile: ChatProfile | undefined;
  groupCover: string | null;
  groupName: string | undefined;
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
          className="relative flex min-h-24 items-center gap-4 overflow-hidden rounded-2xl border border-border bg-card p-4"
        >
          <CoverImage
            src={resolveMedia("asset:friends-dusk")}
            alt=""
            className="absolute inset-0 h-full w-full opacity-16"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-card via-card/92 to-card/60" />
          <Avatar
            url={directProfile.avatar_url}
            name={directProfile.full_name || directProfile.username || ""}
            seed={searchUser}
            size="md"
            className="relative h-14 w-14"
          />
          <span className="relative min-w-0">
            <span className="block truncate text-base font-bold">
              {directProfile.full_name || directProfile.username || "Nuru member"}
            </span>
            {directProfile.username && (
              <span className="block truncate text-xs text-muted-foreground">
                @{directProfile.username}
              </span>
            )}
            <span className="mt-1 block text-[11px] text-muted-foreground">
              Tap to view profile
            </span>
          </span>
        </Link>
      )}

      {"group" in target && (
        <Link
          to="/groups"
          search={{ group: target.group }}
          className="relative flex min-h-24 items-end overflow-hidden rounded-2xl border border-border bg-card p-4"
        >
          <CoverImage
            src={resolveMedia(groupCover || "asset:topic-prayer")}
            alt=""
            className="absolute inset-0 h-full w-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <span className="relative text-white">
            <span className="block text-base font-bold">{groupName || "Group chat"}</span>
            <span className="block text-xs text-white/75">Open group activity</span>
          </span>
        </Link>
      )}

      <RichChatThread target={target} userId={userId} maxHeight="62dvh" />
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
  groups: { id: string; name: string; cover_url: string | null }[];
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
              const preview =
                thread.message_type === "voice"
                  ? "🎤 Voice note"
                  : thread.message_type === "sticker"
                    ? `Sticker ${thread.body}`
                    : thread.body;
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
                    size="md"
                    className="h-12 w-12"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {thread.sender_id === userId ? "You: " : ""}
                      {preview}
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
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
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
          <div className="grid gap-2">
            {groups.map((group) => (
              <Link
                key={group.id}
                to="/messages"
                search={{ group: group.id }}
                className="flex min-h-20 items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card p-2 hover:bg-surface-2"
              >
                <CoverImage
                  src={resolveMedia(group.cover_url || "asset:topic-prayer")}
                  alt=""
                  className="h-16 w-20 shrink-0 rounded-xl object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{group.name}</span>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" /> Group conversation
                  </span>
                </span>
              </Link>
            ))}
            {!hasGroups && (
              <div className="rounded-2xl border border-border bg-card p-5 text-center">
                <p className="text-sm text-muted-foreground">You have no group chats yet.</p>
                <Link to="/groups" search={{}} className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-primary">
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
