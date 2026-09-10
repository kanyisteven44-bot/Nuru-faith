import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchInterests,
  fetchMyChurchIds,
  fetchMyReelLikes,
  fetchMySavedReels,
  toggleReelLike,
  toggleSavedReel,
} from "@/services/content";
import {
  addReelFeedback,
  fetchFollowingIds,
  fetchMyReelFeedback,
  fetchReelPage,
  fetchReelById,
  recordReelView,
  REELS_PAGE_SIZE,
  toggleFollow,
  type Reel,
  type ReelFeed,
} from "@/services/reels";
import { addPrayerJournalEntry } from "@/services/ai";
import { AppShell } from "@/components/nuru/AppShell";
import { CardSkeleton } from "@/components/nuru/Primitives";
import { ReelFeedTabs } from "@/components/nuru/reels/ReelFeedTabs";
import { ReelPane } from "@/components/nuru/reels/ReelPane";
import { ReelComments } from "@/components/nuru/reels/ReelComments";
import { ReelMoreMenu, ReelWhySheet } from "@/components/nuru/reels/ReelMoreMenu";
import { ReadSheet, ReportSheet } from "@/components/nuru/reels/ReelSheets";

export const Route = createFileRoute("/_authenticated/reels")({
  validateSearch: (value: Record<string, unknown>): { reel?: string | undefined } => ({
    reel:
      typeof value["reel"] === "string" && /^[0-9a-f-]{36}$/i.test(value["reel"])
        ? value["reel"]
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Reels — Nuru Faith" },
      {
        name: "description",
        content:
          "Short Christian teachings, testimonies and worship moments you can read, pray and discuss.",
      },
      { property: "og:title", content: "Reels — Nuru Faith" },
      { property: "og:description", content: "Watch, think, ask, pray, discuss, apply." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReelsScreen,
});

const MUTED_KEY = "nuru_reels_muted";
const DATA_SAVER_KEY = "nuru_data_saver";

function readMuted() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(MUTED_KEY) !== "false";
}

function dataSaverOn() {
  if (typeof window === "undefined") return false;
  if (window.localStorage.getItem(DATA_SAVER_KEY) === "on") return true;
  const conn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
  return conn?.saveData === true;
}

function ReelsScreen() {
  const { userId } = useAuth();
  const { reel: linkedId } = Route.useSearch();
  const linkedReel = useQuery({
    queryKey: ["linked-reel", userId, linkedId],
    queryFn: () => fetchReelById(linkedId!),
    enabled: !!userId && !!linkedId,
  });
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [feed, setFeed] = useState<ReelFeed>("For You");
  const [muted, setMuted] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [commentsFor, setCommentsFor] = useState<Reel | null>(null);
  const [readFor, setReadFor] = useState<Reel | null>(null);
  const [reportFor, setReportFor] = useState<Reel | null>(null);
  const [moreFor, setMoreFor] = useState<Reel | null>(null);
  const [whyFor, setWhyFor] = useState<Reel | null>(null);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMuted(readMuted());
    setDataSaver(dataSaverOn());
  }, []);

  const interests = useQuery({
    queryKey: ["interests", userId],
    queryFn: () => fetchInterests(userId!),
    enabled: !!userId,
  });
  const churchIds = useQuery({
    queryKey: ["my-churches", userId],
    queryFn: () => fetchMyChurchIds(userId!),
    enabled: !!userId,
  });
  const following = useQuery({
    queryKey: ["following", userId],
    queryFn: () => fetchFollowingIds(userId!),
    enabled: !!userId,
  });
  const feedback = useQuery({
    queryKey: ["reel-feedback", userId],
    queryFn: () => fetchMyReelFeedback(userId!),
    enabled: !!userId,
  });
  const likes = useQuery({
    queryKey: ["reel-likes", userId],
    queryFn: () => fetchMyReelLikes(userId!),
    enabled: !!userId,
  });
  const saves = useQuery({
    queryKey: ["saved-reels", userId],
    queryFn: () => fetchMySavedReels(userId!),
    enabled: !!userId,
  });

  const churchId = churchIds.data?.[0] ?? null;
  const followingIds = useMemo(() => following.data ?? [], [following.data]);
  const feedKey = useMemo(
    () => ["reel-feed", userId, feed, churchId, followingIds, interests.data] as const,
    [userId, feed, churchId, followingIds, interests.data],
  );

  const reels = useInfiniteQuery({
    queryKey: feedKey,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchReelPage({
        feed,
        page: pageParam as number,
        userId,
        interests: (interests.data ?? []) as string[],
        churchId,
        followingIds,
      }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === REELS_PAGE_SIZE ? allPages.length : undefined,
  });

  /* de-duplicate across pages and drop anything the person muted */
  const items = useMemo(() => {
    const seen = new Set<string>();
    const hidden = new Set([...(feedback.data ?? []), ...hiddenIds]);
    const out: Reel[] = [];
    if (feed === "For You" && linkedReel.data) {
      out.push(linkedReel.data);
      seen.add(linkedReel.data.id);
    }
    for (const page of reels.data?.pages ?? []) {
      for (const r of page) {
        if (seen.has(r.id) || hidden.has(r.id)) continue;
        seen.add(r.id);
        out.push(r);
      }
    }
    return out;
  }, [reels.data, feedback.data, hiddenIds, feed, linkedReel.data]);

  /* auto-load the next page as the end approaches */
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !reels.hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !reels.isFetchingNextPage)
          void reels.fetchNextPage();
      },
      { root: scrollerRef.current, rootMargin: "600px 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [reels, items.length]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 0 });
    setActiveIndex(0);
  }, [feed]);

  const onActive = useCallback((index: number) => setActiveIndex(index), []);
  const onView = useCallback(
    (reel: Reel) => {
      if (userId) void recordReelView(userId, reel.id, 2, false);
    },
    [userId],
  );

  function toggleMuted() {
    setMuted((m) => {
      const next = !m;
      window.localStorage.setItem(MUTED_KEY, String(next));
      return next;
    });
  }

  /* ---------- optimistic like ---------- */
  const bumpLikeCount = (reelId: string, delta: number) => {
    qc.setQueryData<{ pages: Reel[][]; pageParams: unknown[] }>(feedKey, (old) =>
      old
        ? {
            ...old,
            pages: old.pages.map((p) =>
              p.map((r) =>
                r.id === reelId ? { ...r, like_count: Math.max(0, r.like_count + delta) } : r,
              ),
            ),
          }
        : old,
    );
  };

  const likeMutation = useMutation({
    mutationFn: ({ reelId, liked }: { reelId: string; liked: boolean }) =>
      toggleReelLike(userId!, reelId, liked),
    onMutate: async ({ reelId, liked }) => {
      await qc.cancelQueries({ queryKey: ["reel-likes", userId] });
      const previous = qc.getQueryData<string[]>(["reel-likes", userId]) ?? [];
      qc.setQueryData<string[]>(
        ["reel-likes", userId],
        liked ? previous.filter((id) => id !== reelId) : [...new Set([...previous, reelId])],
      );
      bumpLikeCount(reelId, liked ? -1 : 1);
      return { previous, reelId, liked };
    },
    onError: (_e, _v, ctx) => {
      if (!ctx) return;
      qc.setQueryData(["reel-likes", userId], ctx.previous);
      bumpLikeCount(ctx.reelId, ctx.liked ? 1 : -1);
      toast.error("Couldn't save that like");
    },
  });

  const saveMutation = useMutation({
    mutationFn: ({ reelId, saved }: { reelId: string; saved: boolean }) =>
      toggleSavedReel(userId!, reelId, saved),
    onMutate: async ({ reelId, saved }) => {
      await qc.cancelQueries({ queryKey: ["saved-reels", userId] });
      const previous = qc.getQueryData<string[]>(["saved-reels", userId]) ?? [];
      qc.setQueryData<string[]>(
        ["saved-reels", userId],
        saved ? previous.filter((id) => id !== reelId) : [...new Set([...previous, reelId])],
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(["saved-reels", userId], ctx.previous);
      toast.error("Couldn't save that");
    },
    onSuccess: (_d, v) => toast.success(v.saved ? "Removed from saved" : "Saved"),
  });

  function requireAuth(fn: () => void) {
    if (!userId) {
      toast.error("Sign in to join in");
      return;
    }
    fn();
  }

  async function share(reel: Reel) {
    const url = `${window.location.origin}/reels?reel=${reel.id}`;
    const text = reel.caption ? reel.caption.slice(0, 120) : "A short teaching on Nuru Faith";
    try {
      if (navigator.share) await navigator.share({ title: "Nuru Faith", text, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      /* dismissed */
    }
  }

  async function copyLink(reel: Reel) {
    await navigator.clipboard.writeText(`${window.location.origin}/reels?reel=${reel.id}`);
    toast.success("Link copied");
  }

  function notInterested(reel: Reel) {
    setHiddenIds((h) => [...h, reel.id]);
    setMoreFor(null);
    toast.success("You'll see fewer Reels like this");
    if (userId) void addReelFeedback(userId, reel.id).catch(() => undefined);
  }

  function whyReasons(reel: Reel): string[] {
    const out: string[] = [];
    const topics = (interests.data ?? []) as string[];
    if (
      reel.topic &&
      topics.some((t) => t.toLowerCase().includes(reel.topic!.toLowerCase().split(" ")[0]!))
    )
      out.push(`Because you follow ${reel.topic}.`);
    if (churchId && reel.church_id === churchId)
      out.push("Because you joined this church community.");
    if (reel.author_id && followingIds.includes(reel.author_id))
      out.push(`Because you follow ${reel.creator_name}.`);
    if (reel.is_bible_teaching && out.length === 0)
      out.push("Because this is Bible teaching content.");
    if (out.length === 0) out.push("We're showing you this as part of content discovery.");
    return out;
  }

  const likeSet = likes.data ?? [];
  const saveSet = saves.data ?? [];
  const initialLoading = reels.isLoading || linkedReel.isLoading;

  return (
    <AppShell flush>
      <div className="relative h-[calc(100dvh-4.5rem-env(safe-area-inset-bottom))] w-full bg-black">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="pointer-events-auto">
            <ReelFeedTabs value={feed} onChange={setFeed} />
          </div>
        </div>

        {initialLoading && (
          <div className="flex h-full items-center justify-center p-6">
            <div className="w-full max-w-sm">
              <CardSkeleton count={1} height="h-[60dvh]" />
            </div>
          </div>
        )}

        {!initialLoading && items.length === 0 && (
          <EmptyFeed feed={feed} isError={reels.isError} onRetry={() => void reels.refetch()} />
        )}

        {items.length > 0 && (
          <div
            ref={scrollerRef}
            className="no-scrollbar h-full snap-y snap-mandatory overflow-y-auto overscroll-contain"
          >
            {items.map((reel, i) => (
              <ReelPane
                key={reel.id}
                reel={reel}
                index={i}
                active={activeIndex === i}
                near={Math.abs(activeIndex - i) <= 1}
                muted={muted}
                autoplayAllowed={!dataSaver}
                liked={likeSet.includes(reel.id)}
                saved={saveSet.includes(reel.id)}
                isFollowing={!!reel.author_id && followingIds.includes(reel.author_id)}
                isMine={!!userId && reel.author_id === userId}
                commentsOpen={commentsFor?.id === reel.id}
                onActive={onActive}
                onView={onView}
                onToggleMuted={toggleMuted}
                onLike={() =>
                  requireAuth(() =>
                    likeMutation.mutate({ reelId: reel.id, liked: likeSet.includes(reel.id) }),
                  )
                }
                onSave={() =>
                  requireAuth(() =>
                    saveMutation.mutate({ reelId: reel.id, saved: saveSet.includes(reel.id) }),
                  )
                }
                onFollow={() =>
                  requireAuth(() => {
                    void toggleFollow(
                      userId!,
                      reel.author_id!,
                      followingIds.includes(reel.author_id!),
                    )
                      .then(() => qc.invalidateQueries({ queryKey: ["following", userId] }))
                      .catch(() => toast.error("Couldn't update follow"));
                  })
                }
                onComments={() => setCommentsFor(reel)}
                onShare={() => void share(reel)}
                onMore={() => setMoreFor(reel)}
                onProfile={() => navigate({ to: "/profile" })}
                onRead={() => setReadFor(reel)}
                onPray={() =>
                  requireAuth(() => {
                    void addPrayerJournalEntry({
                      userId: userId!,
                      title: reel.caption?.slice(0, 60) ?? "Prayer from a Reel",
                      content: `Lord, take what I just heard and make it real in my life.\n\n"${reel.caption ?? ""}"`,
                      scriptureRef: reel.scripture_ref,
                      source: "reel",
                      sourceId: reel.id,
                    })
                      .then(() => toast.success("Saved to your prayer journal"))
                      .catch(() => toast.error("Couldn't save that"));
                  })
                }
                onAskAi={() =>
                  navigate({
                    to: "/ai",
                    search: {
                      contextType: "reel",
                      contextId: reel.id,
                      contextLabel: `Reel by ${reel.creator_name}${reel.topic ? ` · ${reel.topic}` : ""}${
                        reel.churches?.name ? ` · ${reel.churches.name}` : ""
                      }${reel.caption ? ` — "${reel.caption.slice(0, 140)}"` : ""}`,
                      q: reel.scripture_ref
                        ? `Explain ${reel.scripture_ref} and what this teaching means.`
                        : "Explain what this teaching means and where it comes from in the Bible.",
                    },
                  })
                }
                onDiscuss={() => navigate({ to: "/community" })}
              />
            ))}

            <div ref={sentinelRef} aria-hidden="true" className="h-1" />

            {reels.isFetchingNextPage && (
              <div className="flex snap-start items-center justify-center gap-2 py-4 text-xs text-white/70">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading more
              </div>
            )}

            {reels.isError && !reels.isLoading && (
              <div className="flex snap-start flex-col items-center gap-2 py-6 text-center">
                <p className="text-sm text-white/80">Couldn't load more.</p>
                <button
                  onClick={() => void reels.fetchNextPage()}
                  className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white"
                >
                  Retry
                </button>
              </div>
            )}

            {!reels.hasNextPage && !reels.isFetchingNextPage && <EndOfFeed />}
          </div>
        )}
      </div>

      {commentsFor && (
        <ReelComments
          reelId={commentsFor.id}
          userId={userId}
          isCreator={!!userId && commentsFor.author_id === userId}
          onClose={() => setCommentsFor(null)}
        />
      )}
      {readFor && <ReadSheet reel={readFor} onClose={() => setReadFor(null)} />}
      {reportFor && (
        <ReportSheet reel={reportFor} userId={userId} onClose={() => setReportFor(null)} />
      )}
      {moreFor && (
        <ReelMoreMenu
          reel={moreFor}
          isMine={!!userId && moreFor.author_id === userId}
          onClose={() => setMoreFor(null)}
          onNotInterested={() => notInterested(moreFor)}
          onReport={() => {
            setReportFor(moreFor);
            setMoreFor(null);
          }}
          onCopyLink={() => {
            void copyLink(moreFor);
            setMoreFor(null);
          }}
          onWhy={() => {
            setWhyFor(moreFor);
            setMoreFor(null);
          }}
        />
      )}
      {whyFor && <ReelWhySheet reasons={whyReasons(whyFor)} onClose={() => setWhyFor(null)} />}
    </AppShell>
  );
}

function EndOfFeed() {
  return (
    <section className="flex h-full snap-start flex-col items-center justify-center gap-3 px-8 text-center">
      <p className="font-display text-lg font-semibold text-white">You're all caught up ✨</p>
      <p className="text-sm text-white/70">Explore something meaningful.</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Link
          to="/explore"
          search={{ q: "", kind: "all" }}
          className="rounded-full nuru-gradient-bg px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          Explore
        </Link>
        <Link
          to="/series"
          className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white"
        >
          Scripture Series
        </Link>
        <Link
          to="/church"
          className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white"
        >
          My Church
        </Link>
      </div>
    </section>
  );
}

function EmptyFeed({
  feed,
  isError,
  onRetry,
}: {
  feed: ReelFeed;
  isError: boolean;
  onRetry: () => void;
}) {
  const copy =
    feed === "Following"
      ? {
          title: "Follow Christian creators to see their Reels here.",
          to: "/explore",
          cta: "Explore creators",
        }
      : feed === "My Church"
        ? {
            title: "Choose your church to see content from your community.",
            to: "/church",
            cta: "Find your church",
          }
        : { title: "No Reels yet.", to: "/explore", cta: "Explore creators" };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
      <p className="font-display text-base font-semibold text-white">
        {isError ? "Couldn't load Reels." : copy.title}
      </p>
      <p className="text-sm text-white/70">
        {isError
          ? "Check your connection and try again."
          : "Follow topics, join a church, and your feed fills up."}
      </p>
      {isError ? (
        <button
          onClick={onRetry}
          className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white"
        >
          Try again
        </button>
      ) : (
        <Link
          to={copy.to}
          className="rounded-full nuru-gradient-bg px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          {copy.cta}
        </Link>
      )}
    </div>
  );
}
