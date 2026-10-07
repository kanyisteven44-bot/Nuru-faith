import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bookmark,
  ChevronDown,
  ChevronRight,
  ListMusic,
  Pause,
  Play,
  Repeat2,
  Share2,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  fetchMediaCatalog,
  fetchMediaItemBySourceExternalId,
  fetchMySavedMediaIds,
  toggleSavedMedia,
  type MediaItem,
} from "@/services/media";
import { CoverImage } from "@/components/nuru/CoverImage";
import { CardSkeleton, EmptyState, PrimaryButton } from "@/components/nuru/Primitives";
import { resolveMedia } from "@/lib/media";
import { playableAudioUrl, videoArtwork, youtubeVideoId } from "@/lib/mediaPlayback";
import { duration } from "@/lib/format";
import { InAppMediaPlayer as YouTubePlayer } from "./InAppMediaPlayer";
import { useAuth } from "@/hooks/useAuth";
import { useShareSheet } from "@/hooks/useShareSheet";
import { toast } from "sonner";

export function MediaCatalog({
  mediaType,
  query = "",
  onPlay,
  language = "all",
  playback = "all",
  channelId,
  creatorName,
  hideEmptyState = false,
}: {
  mediaType: "music" | "podcast";
  query?: string;
  language?: string;
  playback?: "all" | "audio" | "video";
  channelId?: string | undefined;
  creatorName?: string | undefined;
  hideEmptyState?: boolean;
  onPlay?: (item: MediaItem) => void;
}) {
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const nextPageMarker = useRef<HTMLDivElement>(null);
  const catalog = useInfiniteQuery({
    queryKey: ["media-catalog", mediaType, query, language, playback, channelId, creatorName],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchMediaCatalog({
        mediaType,
        query,
        language,
        playback,
        ...(channelId ? { channelId } : {}),
        ...(creatorName ? { creatorName } : {}),
        page: pageParam,
      }),
    getNextPageParam: (page, pages) => (page.hasMore ? pages.length : undefined),
  });
  // Imports can shift offset pages between requests; render each saved item once.
  const items = Array.from(
    new Map(
      catalog.data?.pages.flatMap((page) => page.items.map((item) => [item.id, item] as const)),
    ).values(),
  );
  const total = Math.max(0, ...(catalog.data?.pages.map((page) => page.total) ?? []));
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = catalog;
  useEffect(() => {
    const marker = nextPageMarker.current;
    if (
      !marker ||
      !hasNextPage ||
      isFetchingNextPage ||
      isFetchNextPageError ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          void fetchNextPage();
        }
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(marker);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);
  return (
    <section
      className="space-y-3 px-4 py-4"
      aria-label={mediaType === "music" ? "Song catalogue" : "Podcast catalogue"}
    >
      {(!hideEmptyState || catalog.isPending || catalog.isError || items.length > 0) && (
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">
            {mediaType === "music"
              ? playback === "audio"
                ? "Audio"
                : playback === "video"
                  ? "Music videos"
                  : "All songs"
              : playback === "video"
                ? "Video episodes"
                : playback === "audio"
                  ? "Audio episodes"
                  : "All episodes"}
          </h2>
          {catalog.data && items.length > 0 && (
            <span className="text-xs text-muted-foreground" role="status" aria-live="polite">
              {items.length.toLocaleString()} of {total.toLocaleString()}{" "}
              {query ? "matches" : "available"}
            </span>
          )}
        </div>
      )}
      {catalog.isPending && <CardSkeleton count={3} height="h-20" />}
      {catalog.isError && (
        <div role="alert" className="nuru-card p-4">
          <p className="mb-3 text-sm">The catalogue could not load. Please try again.</p>
          <PrimaryButton onClick={() => void catalog.refetch()}>Retry catalogue</PrimaryButton>
        </div>
      )}
      {!hideEmptyState && !catalog.isPending && !catalog.isError && !items.length && (
        <EmptyState
          title={query ? "No matching episodes or songs" : "No published media yet"}
          description={
            query
              ? "Try a title or creator name."
              : playback === "audio" && mediaType === "music"
                ? "No audio-only songs are published yet. Choose Video to listen to the available worship songs."
                : "New media will appear here when it is published."
          }
        />
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="group nuru-card overflow-hidden text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => {
              if (onPlay) onPlay(item);
              else setSelected(item);
            }}
            aria-label={`Play ${item.title}`}
          >
            <span className="relative block">
              <CoverImage
                src={videoArtwork(item.source, item.external_id, resolveMedia(item.thumbnail_url))}
                alt=""
                className="aspect-video w-full"
                width={480}
                height={270}
              />
              <span className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Play className="h-4 w-4 fill-current" />
              </span>
            </span>
            <span className="block min-w-0 p-3">
              <span className="block line-clamp-2 text-sm font-semibold">{item.title}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {item.creator_name}
              </span>
              {(item.duration_seconds ?? 0) > 0 && (
                <span className="text-xs text-muted-foreground">
                  {duration(item.duration_seconds)}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
      {catalog.hasNextPage && (
        <div ref={nextPageMarker} className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Keep scrolling to see more {mediaType === "music" ? "songs" : "episodes"}.
          </p>
          <PrimaryButton
            onClick={() => void catalog.fetchNextPage()}
            disabled={catalog.isFetchingNextPage}
          >
            {catalog.isFetchingNextPage ? "Loading…" : "Load more"}
          </PrimaryButton>
        </div>
      )}
      {catalog.data && !catalog.hasNextPage && items.length > 0 && (
        <p className="text-xs text-muted-foreground" role="status">
          {items.length >= total
            ? `All ${items.length.toLocaleString()} ${query ? "matching" : "available"} ${mediaType === "music" ? "songs" : "episodes"} are displayed.`
            : "The catalogue changed while you were browsing. Refresh to see the latest collection."}
        </p>
      )}
      {catalog.isFetchNextPageError && (
        <p role="alert" className="text-sm">
          Could not load the next page. Tap Load more to retry.
        </p>
      )}
      {selected && (
        <MediaPlayback item={selected} onClose={() => setSelected(null)} onSelect={setSelected} />
      )}
    </section>
  );
}

export function MediaPlayback({
  item,
  onClose,
  onSelect,
}: {
  item: MediaItem;
  onClose: () => void;
  onSelect?: (item: MediaItem) => void;
}) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const shareSheet = useShareSheet();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioFailed, setAudioFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [queueOpen, setQueueOpen] = useState(false);

  useEffect(() => {
    setAudioFailed(false);
    setPlaying(true);
    setMuted(false);
    setRepeat(false);
    setCurrentTime(0);
    setAudioDuration(0);
    setQueueOpen(false);
  }, [item.id]);

  const video = item.source === "youtube" ? youtubeVideoId(item.external_id) : null;
  const audio = playableAudioUrl(item.audio_url);
  const artwork = videoArtwork(item.source, item.external_id, resolveMedia(item.thumbnail_url));
  const isVideo = !!video;
  const queueMediaType: "music" | "podcast" = item.media_type === "podcast" ? "podcast" : "music";
  const queuePlayback: "audio" | "video" = isVideo ? "video" : "audio";

  const canonicalItem = useQuery({
    queryKey: ["canonical-media-item", item.source, item.external_id],
    queryFn: () => fetchMediaItemBySourceExternalId(item.source, item.external_id),
    enabled: !!item.external_id && !/^[0-9a-f-]{36}$/i.test(item.id),
    staleTime: 5 * 60 * 1000,
  });
  const canonicalId = /^[0-9a-f-]{36}$/i.test(item.id) ? item.id : (canonicalItem.data?.id ?? null);

  const queueLanguage = item.language_code ?? canonicalItem.data?.language_code;
  const queue = useQuery({
    queryKey: [
      "media-up-next",
      queueMediaType,
      queuePlayback,
      item.id,
      item.external_id,
      queueLanguage,
    ],
    queryFn: async () => {
      const page = await fetchMediaCatalog({
        mediaType: queueMediaType,
        playback: queuePlayback,
        language: queueLanguage && queueLanguage !== "und" ? queueLanguage : "all",
        page: 0,
      });
      const currentIndex = page.items.findIndex(
        (candidate) =>
          candidate.id === item.id ||
          (!!item.external_id && candidate.external_id === item.external_id),
      );
      const ordered =
        currentIndex >= 0
          ? [...page.items.slice(currentIndex + 1), ...page.items.slice(0, currentIndex)]
          : page.items;
      return ordered
        .filter(
          (candidate) =>
            candidate.id !== item.id &&
            (!item.external_id || candidate.external_id !== item.external_id),
        )
        .slice(0, 8);
    },
    enabled: !canonicalItem.isLoading,
    staleTime: 60_000,
  });
  const upNext = queue.data ?? [];
  const nextItem = upNext[0] ?? null;

  function playQueueItem(next: MediaItem) {
    if (!onSelect) return;
    setPlaying(false);
    onSelect(next);
  }

  const savedIds = useQuery({
    queryKey: ["saved-media-ids", userId],
    queryFn: () => fetchMySavedMediaIds(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });
  const saved = !!canonicalId && !!savedIds.data?.has(canonicalId);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!canonicalId) throw new Error("This video is not in the Nuru catalogue yet.");
      return toggleSavedMedia(userId!, canonicalId, saved);
    },
    onSuccess: async (nextSaved) => {
      await qc.invalidateQueries({ queryKey: ["saved-media-ids", userId] });
      toast.success(nextSaved ? "Saved" : "Removed from saved");
    },
    onError: () => toast.error("Couldn't update saved media"),
  });

  async function togglePlayback() {
    if (video) {
      setPlaying((value) => !value);
      return;
    }
    const player = audioRef.current;
    if (!audio || !player) return;
    if (!player.paused) {
      player.pause();
      return;
    }
    try {
      setAudioFailed(false);
      await player.play();
    } catch {
      setPlaying(false);
      setAudioFailed(true);
    }
  }

  function toggleRepeat() {
    setRepeat((value) => {
      const next = !value;
      if (audioRef.current) audioRef.current.loop = next;
      return next;
    });
  }

  function share() {
    const url = video
      ? `https://www.youtube.com/watch?v=${video}`
      : typeof window !== "undefined"
        ? window.location.href
        : "";
    void shareSheet.share({
      title: item.title,
      text: item.creator_name ?? "Nuru Faith",
      url,
    });
  }

  const softButton =
    "flex h-12 w-12 items-center justify-center rounded-full border border-white/75 bg-[#F3F6FB] text-[#5D687A] shadow-[7px_7px_16px_rgba(166,177,195,0.34),-7px_-7px_16px_rgba(255,255,255,0.95)] transition-transform active:scale-95";
  const primaryButton =
    "flex h-20 w-20 items-center justify-center rounded-full border border-[#2F78D8] bg-[#3F83DC] text-white shadow-[8px_10px_24px_rgba(47,120,216,0.34),inset_0_1px_0_rgba(255,255,255,0.5)] transition-transform active:scale-95";

  return (
    <div
      className="fixed inset-0 z-[90] overflow-y-auto bg-[#F3F6FB] text-[#182033]"
      role="dialog"
      aria-modal="true"
      aria-label={`Now playing ${item.title}`}
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
        <header className="grid grid-cols-[3rem_1fr_3rem] items-center gap-3">
          <button type="button" onClick={onClose} className={softButton} aria-label="Close player">
            <ChevronDown className="h-5 w-5" strokeWidth={2.2} />
          </button>
          <div className="min-w-0 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7A8597]">
              Now playing
            </p>
            <p className="mt-1 truncate text-xs font-semibold text-[#667185]">
              {isVideo
                ? "Video music"
                : item.media_type === "podcast"
                  ? "Audio podcast"
                  : "Audio music"}
            </p>
          </div>
          <button type="button" onClick={share} className={softButton} aria-label="Share">
            <Share2 className="h-5 w-5" />
          </button>
        </header>

        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center pt-7 sm:pt-10">
          {isVideo ? (
            <div className="w-full overflow-hidden rounded-[28px] border border-white/80 bg-black shadow-[0_24px_50px_rgba(66,76,95,0.22)]">
              <YouTubePlayer
                key={`${video}:${attempt}`}
                videoId={video}
                title={item.title}
                muted={muted}
                playing={playing}
                loop={repeat}
                controls
                autoplay
                onEnded={() => {
                  if (!repeat && nextItem) playQueueItem(nextItem);
                }}
                onPlaybackChange={setPlaying}
                className="aspect-video min-h-0 rounded-none"
              />
            </div>
          ) : (
            <div className="relative">
              <div className="absolute inset-3 rounded-full bg-[#8FB8EF]/25 blur-3xl" />
              <CoverImage
                src={artwork}
                alt=""
                width={720}
                height={720}
                className="relative aspect-square w-[min(78vw,390px)] rounded-full border-[9px] border-white object-cover shadow-[0_26px_55px_rgba(62,76,101,0.24)]"
              />
            </div>
          )}

          <div className={isVideo ? "mt-7 text-center" : "mt-8 text-center"}>
            <h2 className="font-display text-[30px] font-semibold leading-tight tracking-tight text-[#151D2D] sm:text-4xl">
              {item.title}
            </h2>
            <p className="mt-2 text-[17px] text-[#647084]">{item.creator_name || "Nuru Faith"}</p>
          </div>

          {audio && item.source === "nuru_audio" && item.category === "hymns" && (
            <details className="mt-4 w-full rounded-2xl bg-white/70 p-4 text-sm text-[#647084]">
              <summary className="cursor-pointer font-semibold">
                Instrumental hymn · Track credits
              </summary>
              <p className="mt-2 leading-relaxed">{item.description}</p>
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block underline"
              >
                Creative Commons Attribution 4.0
              </a>
            </details>
          )}

          <div className="mt-6 flex items-center justify-center gap-7">
            <button
              type="button"
              disabled={!userId || canonicalItem.isLoading || saveMutation.isPending}
              onClick={() => {
                if (!userId) {
                  toast.error("Sign in to save media");
                  return;
                }
                if (!canonicalId) {
                  toast.error("This video is not in the Nuru catalogue yet.");
                  return;
                }
                saveMutation.mutate();
              }}
              aria-pressed={saved}
              aria-label={saved ? "Remove from saved" : "Save"}
              className={softButton}
            >
              <Bookmark className={saved ? "h-5 w-5 fill-[#6E8ED6] text-[#6E8ED6]" : "h-5 w-5"} />
            </button>
            <button
              type="button"
              onClick={toggleRepeat}
              aria-pressed={repeat}
              aria-label={repeat ? "Turn repeat off" : "Repeat"}
              className={softButton}
            >
              <Repeat2 className={repeat ? "h-5 w-5 text-[#3F83DC]" : "h-5 w-5"} />
            </button>
            <button
              type="button"
              onClick={() => setMuted((value) => !value)}
              aria-label={muted ? "Turn sound on" : "Mute"}
              className={softButton}
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          </div>

          {audio && (
            <div className="mt-8 w-full">
              <input
                type="range"
                min={0}
                max={Math.max(audioDuration, 1)}
                step={1}
                value={Math.min(currentTime, Math.max(audioDuration, 1))}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setCurrentTime(next);
                  if (audioRef.current) audioRef.current.currentTime = next;
                }}
                aria-label="Audio position"
                className="h-2 w-full cursor-pointer accent-[#3F83DC]"
              />
              <div className="mt-2 flex justify-between text-[13px] font-medium text-[#8A94A6]">
                <span>{duration(Math.floor(currentTime))}</span>
                <span>
                  {audioDuration
                    ? `-${duration(Math.max(0, Math.floor(audioDuration - currentTime)))}`
                    : "Loading…"}
                </span>
              </div>
            </div>
          )}

          <div className="mt-8 grid grid-cols-[3.25rem_5rem_3.25rem] items-center justify-center gap-7">
            <button
              type="button"
              onClick={() => setQueueOpen((value) => !value)}
              className={softButton}
              aria-expanded={queueOpen}
              aria-label="Show Up next"
            >
              <ListMusic className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => void togglePlayback()}
              className={primaryButton}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <Pause className="h-9 w-9 fill-current" />
              ) : (
                <Play className="ml-1 h-9 w-9 fill-current" />
              )}
            </button>
            <button
              type="button"
              disabled={!nextItem || !onSelect}
              onClick={() => nextItem && playQueueItem(nextItem)}
              className={`${softButton} disabled:cursor-not-allowed disabled:opacity-35`}
              aria-label={nextItem ? `Play next: ${nextItem.title}` : "No next song available"}
            >
              <SkipForward className="h-5 w-5 fill-current" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMuted((value) => !value)}
            className="mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-[#7A8597]"
          >
            {muted ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
            {muted ? "Sound off" : "Sound on"}
          </button>

          {nextItem && onSelect && (
            <section className="mt-7 w-full" aria-label="Up next">
              <button
                type="button"
                onClick={() => setQueueOpen((value) => !value)}
                className="flex w-full items-center gap-3 rounded-[22px] border border-white/80 bg-[#F3F6FB] p-3 text-left shadow-[7px_7px_18px_rgba(166,177,195,0.26),-7px_-7px_18px_rgba(255,255,255,0.95)]"
              >
                <CoverImage
                  src={videoArtwork(
                    nextItem.source,
                    nextItem.external_id,
                    resolveMedia(nextItem.thumbnail_url),
                  )}
                  alt=""
                  width={112}
                  height={72}
                  className="h-14 w-20 shrink-0 rounded-xl object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#3F83DC]">
                    Up next
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-semibold text-[#182033]">
                    {nextItem.title}
                  </span>
                  <span className="block truncate text-xs text-[#7A8597]">
                    {nextItem.creator_name || "Nuru Faith"}
                  </span>
                </span>
                <ChevronRight
                  className={`h-5 w-5 shrink-0 text-[#7A8597] transition-transform ${queueOpen ? "rotate-90" : ""}`}
                />
              </button>

              {queueOpen && (
                <div className="mt-3 overflow-hidden rounded-[22px] border border-white/80 bg-white/55 shadow-[0_14px_35px_rgba(79,91,112,0.12)] backdrop-blur-xl">
                  <div className="flex items-center justify-between border-b border-[#DDE4EE] px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-[#182033]">Up next</p>
                      <p className="text-[11px] text-[#7A8597]">
                        {upNext.length} {queueMediaType === "music" ? "songs" : "episodes"} ready
                      </p>
                    </div>
                    <ListMusic className="h-4.5 w-4.5 text-[#3F83DC]" />
                  </div>
                  <div className="max-h-72 overflow-y-auto p-2">
                    {upNext.map((candidate, index) => (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => playQueueItem(candidate)}
                        className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors hover:bg-white/80"
                      >
                        <span className="w-5 shrink-0 text-center text-[11px] font-semibold text-[#98A2B2]">
                          {index + 1}
                        </span>
                        <CoverImage
                          src={videoArtwork(
                            candidate.source,
                            candidate.external_id,
                            resolveMedia(candidate.thumbnail_url),
                          )}
                          alt=""
                          width={96}
                          height={64}
                          className="h-12 w-16 shrink-0 rounded-xl object-cover"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-[#182033]">
                            {candidate.title}
                          </span>
                          <span className="block truncate text-[11px] text-[#7A8597]">
                            {candidate.creator_name || "Nuru Faith"}
                          </span>
                        </span>
                        <Play className="h-4 w-4 shrink-0 text-[#3F83DC]" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {!isVideo && (
            <audio
              ref={audioRef}
              key={`${item.id}:${attempt}`}
              src={audio ?? undefined}
              preload="metadata"
              muted={muted}
              loop={repeat}
              className="hidden"
              onLoadedMetadata={(event) => setAudioDuration(event.currentTarget.duration || 0)}
              onDurationChange={(event) => setAudioDuration(event.currentTarget.duration || 0)}
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              autoPlay
              onEnded={() => {
                setPlaying(false);
                if (!repeat && nextItem) playQueueItem(nextItem);
              }}
              onError={() => setAudioFailed(true)}
            />
          )}

          {audioFailed && (
            <div
              role="alert"
              className="mt-5 w-full rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
            >
              <p>The publisher's audio could not load.</p>
              <button
                type="button"
                onClick={() => {
                  setAudioFailed(false);
                  setAttempt((value) => value + 1);
                }}
                className="mt-2 font-semibold underline"
              >
                Retry playback
              </button>
            </div>
          )}

          <p className="mt-auto max-w-lg pt-9 text-center text-[12px] leading-relaxed text-[#919AAA]">
            {isVideo
              ? "Played through YouTube's official player. Nothing is hosted or downloadable in Nuru Faith."
              : "Streamed from the approved publisher. Nothing is hosted or downloadable in Nuru Faith."}
          </p>
        </main>
      </div>
      {shareSheet.node}
    </div>
  );
}
