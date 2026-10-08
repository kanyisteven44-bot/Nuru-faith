import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useShareSheet } from "@/hooks/useShareSheet";
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
  fetchViewedExternalReelIds,
  recordExternalReelView,
  recordReelView,
  toggleFollow,
  type Reel,
  type ReelFeed,
} from "@/services/reels";
import { addPrayerJournalEntry } from "@/services/ai";
import { youtubeReelsInfiniteQuery } from "@/services/youtubeService";
import { reelContentKey, unseenReelQueue, nextReelId } from "@/lib/reelQueue";
import {
  currentLocalDay,
  readWatchedExternalReelIds,
  rememberWatchedExternalReel,
} from "@/lib/reelWatchHistory";
import { AppShell } from "@/components/nuru/AppShell";
import { CardSkeleton } from "@/components/nuru/Primitives";
import { ReelFeedTabs } from "@/components/nuru/reels/ReelFeedTabs";
import { ReelGrid } from "@/components/nuru/reels/ReelGrid";
import { ReelPane } from "@/components/nuru/reels/ReelPane";
import { ReelComments } from "@/components/nuru/reels/ReelComments";
import { ReelMoreMenu, ReelWhySheet } from "@/components/nuru/reels/ReelMoreMenu";
import { ReadSheet, ReportSheet } from "@/components/nuru/reels/ReelSheets";
import { fetchYouTubeReelDetails } from "@/lib/youtubeReel.functions";

export const Route = createFileRoute("/_authenticated/reels")({
  validateSearch: (
    value: Record<string, unknown>,
  ): { reel?: string | undefined; youtube?: string | undefined } => ({
    reel:
      typeof value["reel"] === "string" && /^[0-9a-f-]{36}$/i.test(value["reel"])
        ? value["reel"]
        : undefined,
    youtube:
      typeof value["youtube"] === "string" && /^[A-Za-z0-9_-]{11}$/.test(value["youtube"])
        ? value["youtube"]
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
const YOUTUBE_BATCH_SIZE = 12;

function readMuted() {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(MUTED_KEY) !== "false";
  } catch {
    return true;
  }
}

function dataSaverOn() {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(DATA_SAVER_KEY) === "on") return true;
  } catch {
    /* use device preference */
  }
  const conn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
  return conn?.saveData === true;
}

function ReelsScreen() {
  const { userId, loading: authLoading } = useAuth();
  const shareSheet = useShareSheet();
  const { reel: linkedId, youtube: linkedYoutubeId } = Route.useSearch();
  const linkedTargetId = linkedId ?? (linkedYoutubeId ? `yt:${linkedYoutubeId}` : null);
  const linkedReel = useQuery({
    queryKey: ["linked-reel", userId, linkedId],
    queryFn: () => fetchReelById(linkedId!),
    enabled: !!userId && !!linkedId,
  });
  const linkedYouTube = useQuery({
    queryKey: ["linked-youtube-reel", linkedYoutubeId],
    queryFn: () => fetchYouTubeReelDetails({ data: { videoId: linkedYoutubeId! } }),
    enabled: !!linkedYoutubeId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const linkedYouTubeReel = useMemo<Reel | null>(() => {
    if (!linkedYoutubeId || !linkedYouTube.data?.video) return null;
    const details = linkedYouTube.data;
    return {
      id: `yt:${linkedYoutubeId}`,
      author_id: null,
      creator_name: details.creator.name,
      creator_handle: details.creator.name.replace(/\s+/g, "").toLowerCase(),
      creator_avatar_url: details.creator.avatar,
      caption: details.video.title,
      hashtags: null,
      video_url: null,
      poster_url: details.video.thumbnail,
      audio_title: "Original audio",
      scripture_ref: null,
      topic: null,
      is_bible_teaching: false,
      church_id: null,
      series_id: null,
      like_count: 0,
      comment_count: 0,
      view_count: details.stats.views ? Number(details.stats.views) : 0,
      created_at: details.video.publishedAt || new Date().toISOString(),
      source_type: "youtube",
      rights_status: "external_embed",
      external_id: linkedYoutubeId,
      external_url: `https://www.youtube.com/watch?v=${linkedYoutubeId}`,
      title: details.video.title,
      churches: null,
    };
  }, [linkedYoutubeId, linkedYouTube.data]);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [feed, setFeed] = useState<ReelFeed>("For You");
  const [muted, setMuted] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [retainedId, setRetainedId] = useState<string | null>(linkedTargetId);
  const [advanceAfter, setAdvanceAfter] = useState<string | null>(null);
  // A shared reel link should open straight into the full-screen player;
  // otherwise Reels opens on the browsable grid.
  const [view, setView] = useState<"grid" | "feed">(linkedTargetId ? "feed" : "grid");
  const [youtubeVisibleCount, setYoutubeVisibleCount] = useState(YOUTUBE_BATCH_SIZE);
  const [watchedExternalIds, setWatchedExternalIds] = useState<Set<string>>(new Set());
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

  useEffect(() => {
    let day = currentLocalDay();
    const refresh = () => setWatchedExternalIds(readWatchedExternalReelIds(userId));
    const rollover = window.setInterval(() => {
      if (currentLocalDay() !== day) {
        day = currentLocalDay();
        refresh();
      }
    }, 30_000);
    refresh();
    window.addEventListener("storage", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(rollover);
      window.removeEventListener("storage", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [userId]);

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
    enabled: !!userId && !authLoading,
    queryFn: ({ pageParam }) =>
      fetchReelPage({
        feed,
        page: pageParam as number,
        userId,
        interests: (interests.data ?? []) as string[],
        churchId,
        followingIds,
      }),
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length : undefined),
  });

  /*
   * YouTube discovery is intentionally paged. The trusted catalogue is much
   * larger than a phone should download or render at once, so only the next
   * server page is requested when the viewer approaches the end of what is
   * already buffered.
   */
  const youtubeFallback = useInfiniteQuery(youtubeReelsInfiniteQuery(userId));

  const loadedYoutubeVideos = useMemo(
    () => (youtubeFallback.data?.pages ?? []).flatMap((page) => page.videos),
    [youtubeFallback.data],
  );
  const loadedYoutubeIds = useMemo(
    () => [...new Set(loadedYoutubeVideos.map((video) => video.youtubeVideoId))].slice(-240),
    [loadedYoutubeVideos],
  );
  const persistedExternalViews = useQuery({
    queryKey: ["external-reel-views", userId, loadedYoutubeIds],
    queryFn: () => fetchViewedExternalReelIds(userId!, loadedYoutubeIds),
    enabled: !!userId && loadedYoutubeIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!persistedExternalViews.data?.size) return;
    setWatchedExternalIds((current) => new Set([...current, ...persistedExternalViews.data]));
  }, [persistedExternalViews.data]);

  const unseenYoutubeVideos = useMemo(() => {
    const seen = new Set<string>();
    return loadedYoutubeVideos.filter((video) => {
      if (
        (watchedExternalIds.has(video.youtubeVideoId) &&
          retainedId !== `yt:${video.youtubeVideoId}`) ||
        seen.has(video.youtubeVideoId)
      )
        return false;
      seen.add(video.youtubeVideoId);
      return true;
    });
  }, [loadedYoutubeVideos, watchedExternalIds, retainedId]);

  const youtubeReels = useMemo<Reel[]>(() => {
    return unseenYoutubeVideos.slice(0, youtubeVisibleCount).map((v) => ({
      id: `yt:${v.youtubeVideoId}`,
      author_id: null,
      creator_name: v.channelName,
      creator_handle: v.channelName.replace(/\s+/g, "").toLowerCase(),
      creator_avatar_url: null,
      caption: v.title,
      hashtags: null,
      video_url: null,
      poster_url: v.thumbnail || null,
      audio_title: "Original audio",
      scripture_ref: null,
      topic: null,
      is_bible_teaching: false,
      church_id: null,
      series_id: null,
      like_count: 0,
      comment_count: 0,
      view_count: 0,
      created_at: v.publishedAt || new Date().toISOString(),
      source_type: "youtube",
      rights_status: "external_embed",
      external_id: v.youtubeVideoId,
      external_url: `https://www.youtube.com/watch?v=${v.youtubeVideoId}`,
      title: v.title,
      churches: null,
    }));
  }, [unseenYoutubeVideos, youtubeVisibleCount]);

  const youtubeTotal = unseenYoutubeVideos.length;
  const hasBufferedYouTube = youtubeVisibleCount < youtubeTotal;
  const hasMoreYouTube =
    feed === "For You" && (hasBufferedYouTube || youtubeFallback.hasNextPage === true);

  /* de-duplicate across pages and drop anything the person muted */
  const items = useMemo(() => {
    const seen = new Set<string>();
    const hidden = new Set([...(feedback.data ?? []), ...hiddenIds]);
    const out: Reel[] = [];
    if (feed === "For You" && linkedReel.data) {
      out.push(linkedReel.data);
      seen.add(linkedReel.data.id);
    }
    if (feed === "For You" && linkedYouTubeReel && !seen.has(linkedYouTubeReel.id)) {
      out.push(linkedYouTubeReel);
      seen.add(linkedYouTubeReel.id);
    }
    for (const page of reels.data?.pages ?? []) {
      for (const r of page.items) {
        if (seen.has(r.id) || hidden.has(r.id)) continue;
        seen.add(r.id);
        out.push(r);
      }
    }
    // Discovery content belongs only in For You. Following and My Church must
    // never be padded with unrelated videos just to avoid an empty state.
    if (feed === "For You") {
      for (const r of youtubeReels) {
        if (seen.has(r.id) || hidden.has(r.id)) continue;
        seen.add(r.id);
        out.push(r);
      }
    }
    return unseenReelQueue(out, watchedExternalIds, retainedId);
  }, [
    reels.data,
    feedback.data,
    hiddenIds,
    feed,
    linkedReel.data,
    linkedYouTubeReel,
    youtubeReels,
    watchedExternalIds,
    retainedId,
  ]);

  /* auto-load the next DB/YouTube page only as the viewer approaches the end */
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || (!reels.hasNextPage && !hasMoreYouTube)) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        if (reels.hasNextPage && !reels.isFetchingNextPage) void reels.fetchNextPage();

        if (feed === "For You") {
          if (hasBufferedYouTube) {
            setYoutubeVisibleCount((count) => Math.min(count + YOUTUBE_BATCH_SIZE, youtubeTotal));
          } else if (youtubeFallback.hasNextPage && !youtubeFallback.isFetchingNextPage) {
            void youtubeFallback.fetchNextPage();
          }
        }
      },
      { root: scrollerRef.current, rootMargin: "600px 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
    // Re-observe when the grid/feed swap replaces the sentinel/scroller nodes.
  }, [
    reels,
    items.length,
    view,
    feed,
    hasMoreYouTube,
    hasBufferedYouTube,
    youtubeTotal,
    youtubeFallback.hasNextPage,
    youtubeFallback.isFetchingNextPage,
    youtubeFallback.fetchNextPage,
  ]);

  /* Once a new YouTube page lands, make its first small batch available. */
  useEffect(() => {
    if (feed !== "For You" || youtubeFallback.isFetchingNextPage) return;
    if (youtubeVisibleCount < youtubeTotal) {
      setYoutubeVisibleCount((count) =>
        Math.min(Math.max(count, YOUTUBE_BATCH_SIZE), youtubeTotal),
      );
    }
  }, [feed, youtubeFallback.isFetchingNextPage, youtubeTotal, youtubeVisibleCount]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 0 });
    setActiveIndex(0);
    setRetainedId(linkedTargetId);
    setAdvanceAfter(null);
    setView(linkedTargetId ? "feed" : "grid");
    setYoutubeVisibleCount(YOUTUBE_BATCH_SIZE);
    // Only react to the person switching feeds, not to linkedId itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed]);

  /* jump the scroller straight to the tapped tile the instant the grid hands off to the feed */
  useLayoutEffect(() => {
    const node = scrollerRef.current;
    if (view !== "feed" || !node) return;
    node.scrollTop = activeIndex * node.clientHeight;
    // Only run this jump when switching into feed mode, not on every activeIndex change
    // while already scrolling through it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useLayoutEffect(() => {
    if (view !== "feed" || !retainedId) return;
    const index = items.findIndex((r) => r.id === retainedId);
    if (index >= 0 && index !== activeIndex) {
      setActiveIndex(index);
      if (scrollerRef.current)
        scrollerRef.current.scrollTop = index * scrollerRef.current.clientHeight;
    }
  }, [items, retainedId, view, activeIndex]);
  const onActive = useCallback(
    (index: number) => {
      const item = items[index];
      if (!item) return;
      setRetainedId(item.id);
      setActiveIndex(index);
    },
    [items],
  );
  function openReel(index: number) {
    setRetainedId(items[index]?.id ?? null);
    setActiveIndex(index);
    setView("feed");
  }
  const onView = useCallback(
    (reel: Reel) => {
      const key = reelContentKey(reel);
      const alreadyWatched = watchedExternalIds.has(key);
      rememberWatchedExternalReel(userId, key);
      setWatchedExternalIds((previous) => new Set([...previous, key]));
      if (!alreadyWatched && userId && /^[0-9a-f-]{36}$/i.test(reel.id)) {
        void recordReelView(userId, reel.id, 2, false).catch(() => undefined);
      } else if (!alreadyWatched && userId && reel.source_type === "youtube" && reel.external_id) {
        void recordExternalReelView(userId, {
          externalId: reel.external_id,
          title: reel.title ?? reel.caption ?? "YouTube Reel",
          thumbnailUrl: reel.poster_url,
        }).catch(() => undefined);
      }
    },
    [userId, watchedExternalIds],
  );

  function advanceReel(reel: Reel) {
    onView(reel);
    setAdvanceAfter(reel.id);
  }
  useEffect(() => {
    if (!advanceAfter || view !== "feed") return;
    const next = nextReelId(items, advanceAfter);
    if (next) {
      setRetainedId(next);
      setAdvanceAfter(null);
      const index = items.findIndex((r) => r.id === next);
      setActiveIndex(index);
      scrollerRef.current?.scrollTo({
        top: index * scrollerRef.current.clientHeight,
        behavior: "instant",
      });
    } else if (reels.hasNextPage && !reels.isFetchingNextPage) void reels.fetchNextPage();
    else if (hasBufferedYouTube)
      setYoutubeVisibleCount((count) => Math.min(count + YOUTUBE_BATCH_SIZE, youtubeTotal));
    else if (
      feed === "For You" &&
      youtubeFallback.hasNextPage &&
      !youtubeFallback.isFetchingNextPage
    )
      void youtubeFallback.fetchNextPage();
    else if (!reels.isFetchingNextPage && !youtubeFallback.isFetchingNextPage)
      setAdvanceAfter(null);
  }, [
    advanceAfter,
    items,
    view,
    reels.hasNextPage,
    reels.isFetchingNextPage,
    hasBufferedYouTube,
    youtubeTotal,
    feed,
    youtubeFallback.hasNextPage,
    youtubeFallback.isFetchingNextPage,
  ]);
  // Entire watched pages still have a cursor. Continue until an unseen page or
  // genuine exhaustion, rather than treating an empty filtered page as the end.
  useEffect(() => {
    if (items.length) return;
    if (reels.hasNextPage && !reels.isFetchingNextPage) void reels.fetchNextPage();
    if (feed === "For You" && youtubeFallback.hasNextPage && !youtubeFallback.isFetchingNextPage)
      void youtubeFallback.fetchNextPage();
  }, [
    items.length,
    feed,
    reels.hasNextPage,
    reels.isFetchingNextPage,
    youtubeFallback.hasNextPage,
    youtubeFallback.isFetchingNextPage,
  ]);

  function toggleMuted() {
    setMuted((m) => {
      const next = !m;
      try {
        window.localStorage.setItem(MUTED_KEY, String(next));
      } catch {
        /* playback still works without storage */
      }
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

  function share(reel: Reel) {
    const url = reel.external_url ?? `${window.location.origin}/reels?reel=${reel.id}`;
    const text = reel.caption ? reel.caption.slice(0, 120) : "A short teaching on Nuru Faith";
    void shareSheet.share({ title: "Nuru Faith", text, url });
  }

  async function copyLink(reel: Reel) {
    const url = reel.external_url ?? `${window.location.origin}/reels?reel=${reel.id}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  function notInterested(reel: Reel) {
    setHiddenIds((h) => [...h, reel.id]);
    setMoreFor(null);
    toast.success("You'll see fewer Reels like this");

    if (reel.external_id) {
      rememberWatchedExternalReel(userId, reel.external_id);
      return;
    }
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
  const initialLoading =
    authLoading ||
    reels.isLoading ||
    linkedReel.isLoading ||
    (feed === "For You" && items.length === 0 && youtubeFallback.isLoading);
  const feedError =
    reels.isError || (feed === "For You" && youtubeFallback.isError && items.length === 0);

  return (
    <AppShell flush>
      <div className="relative h-[calc(100dvh-4.5rem-env(safe-area-inset-bottom))] w-full overflow-hidden bg-[#F3F6FB] md:rounded-3xl">
        <header className="absolute inset-x-0 top-0 z-30 border-b border-white/70 bg-[#F3F6FB]/96 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-[#182033] backdrop-blur-xl">
          <div className="mx-auto flex max-w-[440px] items-center justify-between">
            <div className="flex min-w-0 items-center gap-2">
              {view === "feed" && (
                <button
                  type="button"
                  onClick={() => setView("grid")}
                  aria-label="Back to Reels grid"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-[#F3F6FB] shadow-[5px_5px_12px_rgba(171,181,197,0.28),-5px_-5px_12px_rgba(255,255,255,0.95)]"
                >
                  <ArrowLeft className="h-4.5 w-4.5" />
                </button>
              )}
              <div className="min-w-0">
                <p className="truncate font-display text-[22px] font-semibold leading-none">
                  Nuru Faith
                </p>
                <p className="mt-1 text-[11px] text-[#7A8597]">Faith-filled short videos</p>
              </div>
            </div>
          </div>
          <div className="pointer-events-auto mx-auto mt-3 flex max-w-[440px] justify-center">
            <ReelFeedTabs value={feed} onChange={setFeed} />
          </div>
        </header>

        {initialLoading && (
          <div className="flex h-full items-center justify-center p-6">
            <div className="w-full max-w-sm">
              <CardSkeleton count={1} height="h-[60dvh]" />
            </div>
          </div>
        )}

        {!initialLoading && items.length === 0 && (
          <EmptyFeed
            feed={feed}
            isError={feedError}
            onRetry={() => {
              void reels.refetch();
              if (feed === "For You") void youtubeFallback.refetch();
            }}
          />
        )}

        {items.length > 0 && view === "grid" && (
          <div ref={scrollerRef} className="no-scrollbar h-full overflow-y-auto pt-28">
            <ReelGrid items={items} onOpen={openReel} />
            <div ref={sentinelRef} aria-hidden="true" className="h-1" />
            {reels.isFetchingNextPage && (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-[#7A8597]">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading more
              </div>
            )}
          </div>
        )}

        {items.length > 0 && view === "feed" && (
          <div
            ref={scrollerRef}
            onScroll={(event) => {
              const node = event.currentTarget;
              const index = Math.max(
                0,
                Math.min(
                  items.length - 1,
                  Math.round(node.scrollTop / Math.max(node.clientHeight, 1)),
                ),
              );
              if (index !== activeIndex) onActive(index);
            }}
            className="no-scrollbar mx-auto mt-28 h-[calc(100%_-_7rem)] w-full max-w-[440px] snap-y snap-mandatory overflow-y-auto overscroll-contain md:rounded-t-2xl"
          >
            {items.map((reel, i) =>
              i < activeIndex - 1 || i > activeIndex + 2 ? (
                <article
                  key={reel.id}
                  className="h-full w-full shrink-0 snap-start snap-always bg-black"
                  aria-label={`Reel by ${reel.creator_name}`}
                />
              ) : (
                <ReelPane
                  key={reel.id}
                  reel={reel}
                  index={i}
                  active={activeIndex === i}
                  near={i >= activeIndex - 1 && i <= activeIndex + 2}
                  muted={muted}
                  autoplayAllowed={!dataSaver}
                  liked={likeSet.includes(reel.id)}
                  saved={saveSet.includes(reel.id)}
                  isFollowing={!!reel.author_id && followingIds.includes(reel.author_id)}
                  isMine={!!userId && reel.author_id === userId}
                  commentsOpen={commentsFor?.id === reel.id}
                  onActive={onActive}
                  onView={onView}
                  onEnded={() => advanceReel(reel)}
                  onToggleMuted={toggleMuted}
                  onLike={() =>
                    requireAuth(() =>
                      likeMutation.mutate({ reelId: reel.id, liked: likeSet.includes(reel.id) }),
                    )
                  }
                  onDoubleLike={() => {
                    if (reel.external_id) {
                      window.dispatchEvent(
                        new CustomEvent("nuru:youtube-like", { detail: reel.external_id }),
                      );
                    } else if (!likeSet.includes(reel.id)) {
                      requireAuth(() => likeMutation.mutate({ reelId: reel.id, liked: false }));
                    }
                  }}
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
                  onProfile={() => {
                    if (reel.source_type === "youtube" && reel.external_id) {
                      void navigate({
                        to: "/creator/$videoId",
                        params: { videoId: reel.external_id },
                        search: { from: "reels" },
                      });
                    } else if (reel.author_id) {
                      void navigate({
                        to: "/discovery/$kind/$id",
                        params: { kind: "profile", id: reel.author_id },
                      });
                    } else if (reel.external_url) {
                      window.open(reel.external_url, "_blank", "noopener,noreferrer");
                    }
                  }}
                  onRead={() => setReadFor(reel)}
                  onPray={() =>
                    requireAuth(() => {
                      void addPrayerJournalEntry({
                        userId: userId!,
                        title: reel.caption?.slice(0, 60) ?? "Prayer from a Reel",
                        content: `Lord, take what I just heard and make it real in my life.\n\n"${reel.caption ?? ""}"${reel.external_url ? `\n\nSource: ${reel.external_url}` : ""}`,
                        scriptureRef: reel.scripture_ref,
                        source: reel.external_id ? "external_reel" : "reel",
                        sourceId: /^[0-9a-f-]{36}$/i.test(reel.id) ? reel.id : null,
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
              ),
            )}

            <div ref={sentinelRef} aria-hidden="true" className="h-1" />

            {(reels.isFetchingNextPage || youtubeFallback.isFetchingNextPage) && (
              <div className="flex snap-start items-center justify-center gap-2 bg-[#F3F6FB] py-4 text-xs text-[#7A8597]">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading more
              </div>
            )}

            {(reels.isError || youtubeFallback.isFetchNextPageError) && !initialLoading && (
              <div className="flex snap-start flex-col items-center gap-2 bg-[#F3F6FB] py-6 text-center">
                <p className="text-sm text-[#4F5B70]">Couldn't load more.</p>
                <button
                  onClick={() => {
                    if (reels.isError) void reels.fetchNextPage();
                    if (youtubeFallback.isFetchNextPageError) void youtubeFallback.fetchNextPage();
                  }}
                  className="rounded-full border border-white/80 bg-white px-4 py-2 text-xs font-semibold text-[#182033] shadow-sm"
                >
                  Retry
                </button>
              </div>
            )}

            {!reels.hasNextPage &&
              !reels.isFetchingNextPage &&
              !youtubeFallback.isFetchingNextPage &&
              !hasMoreYouTube && <EndOfFeed />}
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
      {shareSheet.node}
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
          className="rounded-lg nuru-gradient-bg px-4 py-2 text-xs font-semibold text-primary-foreground"
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
          className="rounded-lg nuru-gradient-bg px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          {copy.cta}
        </Link>
      )}
    </div>
  );
}
