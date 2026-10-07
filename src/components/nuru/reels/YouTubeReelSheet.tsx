import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchYouTubeReelDetails } from "@/lib/youtubeReel.functions";
import { InAppMediaPlayer } from "@/components/youtube/InAppMediaPlayer";
import { useState } from "react";
import {
  postYouTubeComment,
  connectYouTube,
  YouTubeConnectionRequired,
} from "@/services/youtubeRatings";
import { toast } from "sonner";
import {
  ExternalLink,
  Heart,
  MessageCircle,
  Play,
  Send,
  Sparkles,
  UsersRound,
} from "lucide-react";

export function YouTubeReelSheet({
  videoId,
  section,
  onClose,
  onNuruComments,
  returnTo = "/reels",
}: {
  videoId: string;
  section: "comments" | "channel";
  onClose: () => void;
  onNuruComments?: (() => void) | undefined;
  returnTo?: "/reels" | "/music";
}) {
  const [playing, setPlaying] = useState<string | null>(null);
  const details = useInfiniteQuery({
    queryKey: ["youtube-reel", videoId, section],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      fetchYouTubeReelDetails({ data: { videoId, section, pageToken: pageParam } }),
    getNextPageParam: (p) => p.nextPageToken ?? undefined,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const first = details.data?.pages[0];
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [needsConnection, setNeedsConnection] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const publish = useMutation({
    mutationFn: () => postYouTubeComment(videoId, first!.creator.id, comment),
    retry: false,
    onSuccess: () => {
      setComment("");
      toast.success("Comment shared");
      void qc.invalidateQueries({ queryKey: ["youtube-reel", videoId, "comments"] });
      void qc.invalidateQueries({ queryKey: ["youtube-reel-details", videoId] });
    },
    onError: (error) => {
      if (error instanceof YouTubeConnectionRequired) setNeedsConnection(true);
      else toast.error(error.message);
    },
  });

  const comments = details.data?.pages.flatMap((p) => p.comments) ?? [];
  const uploads = details.data?.pages.flatMap((p) => p.uploads) ?? [];

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="z-[110] max-h-[88dvh] overflow-y-auto border-border/70 bg-background/98 p-0 sm:max-w-xl sm:rounded-[28px]">
        <div className="px-5 pb-7 pt-5 sm:px-6">
          <DialogHeader className="mb-5 text-left">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              {section === "comments" ? (
                <>
                  <MessageCircle className="h-4 w-4" />
                  Community
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Creator
                </>
              )}
            </div>
            <DialogTitle className="font-display text-2xl font-semibold">
              {section === "comments"
                ? "Conversation"
                : (first?.creator.name ?? "Creator profile")}
            </DialogTitle>
          </DialogHeader>

          {details.isPending && (
            <div className="space-y-3" role="status" aria-label="Loading">
              <div className="h-20 animate-pulse rounded-2xl bg-surface-2" />
              <div className="h-28 animate-pulse rounded-2xl bg-surface-2" />
            </div>
          )}

          {details.isError && (
            <div className="rounded-2xl border border-border bg-card p-4" role="alert">
              <p className="text-sm text-ink-2">This content could not load right now.</p>
              <button
                className="mt-2 min-h-11 text-sm font-semibold text-primary"
                onClick={() => void details.refetch()}
              >
                Try again
              </button>
            </div>
          )}

          {first && section === "channel" && (
            <div className="space-y-5">
              <section className="rounded-[24px] border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-4">
                  {first.creator.avatar ? (
                    <img
                      src={first.creator.avatar}
                      alt=""
                      className="h-16 w-16 rounded-2xl object-cover ring-1 ring-border"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-primary">
                      <UsersRound className="h-7 w-7" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-display text-xl font-semibold">
                      {first.creator.name}
                    </h2>
                    {first.creator.subscribers !== null && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {Number(first.creator.subscribers).toLocaleString()} followers on source
                      </p>
                    )}
                  </div>
                </div>

                {first.creator.description && (
                  <p className="mt-4 whitespace-pre-wrap text-[14px] leading-6 text-ink-2">
                    {first.creator.description}
                  </p>
                )}

                <a
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2"
                  href={`https://www.youtube.com/channel/${first.creator.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View original channel
                  <ExternalLink className="h-4 w-4" />
                </a>
              </section>

              {playing && (
                <section className="overflow-hidden rounded-[24px] border border-border bg-card p-3">
                  <InAppMediaPlayer videoId={playing} title="Creator video" autoplay controls />
                </section>
              )}

              <section>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
                      Discover
                    </p>
                    <h3 className="font-display text-xl font-semibold">Latest videos</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">{uploads.length} loaded</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {uploads.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className="group overflow-hidden rounded-2xl border border-border bg-card text-left transition hover:-translate-y-0.5 hover:border-border-strong"
                      onClick={() => setPlaying(v.id)}
                    >
                      <div className="relative">
                        {v.thumbnail && (
                          <img
                            src={v.thumbnail}
                            alt=""
                            loading="lazy"
                            className="aspect-video w-full object-cover"
                          />
                        )}
                        <span className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition group-hover:opacity-100">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white">
                            <Play className="h-4 w-4 fill-current" />
                          </span>
                        </span>
                      </div>
                      <span className="line-clamp-2 block p-3 text-sm font-semibold leading-snug">
                        {v.title}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}

          {section === "comments" && (
            <div className="space-y-5">
              {onNuruComments && (
                <button
                  type="button"
                  className="flex min-h-12 w-full items-center justify-between rounded-2xl bg-primary px-4 text-left text-primary-foreground shadow-sm"
                  onClick={onNuruComments}
                >
                  <span>
                    <span className="block text-sm font-semibold">Join the Nuru discussion</span>
                    <span className="block text-xs opacity-80">Talk with the Nuru community</span>
                  </span>
                  <MessageCircle className="h-5 w-5" />
                </button>
              )}

              {first && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!publish.isPending && comment.trim()) publish.mutate();
                  }}
                  className="rounded-[24px] border border-border bg-card p-4"
                >
                  <label htmlFor="youtube-comment" className="text-sm font-semibold">
                    Join the source conversation
                  </label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your comment is shared to the original video source.
                  </p>
                  <textarea
                    id="youtube-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={10000}
                    rows={3}
                    placeholder="Write something thoughtful…"
                    className="mt-3 w-full resize-none rounded-2xl border border-border bg-background p-3.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <a
                      className="inline-flex min-h-10 items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                      href={`https://www.youtube.com/watch?v=${videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Original video
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <button
                      type="submit"
                      disabled={publish.isPending || !comment.trim()}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      {publish.isPending ? "Sharing…" : "Share comment"}
                    </button>
                  </div>
                </form>
              )}

              {needsConnection && (
                <div className="rounded-2xl border border-border bg-surface p-4">
                  <p className="text-sm font-medium">Connect your video account to comment</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Choose the Google account connected to the original video platform. It can be
                    different from your Nuru sign-in.
                  </p>
                  <button
                    disabled={connecting}
                    className="mt-2 min-h-11 text-sm font-semibold text-primary"
                    onClick={() => {
                      setConnecting(true);
                      void connectYouTube(videoId, returnTo).catch((e) => {
                        setConnecting(false);
                        toast.error(e.message);
                      });
                    }}
                  >
                    {connecting ? "Connecting…" : "Connect account"}
                  </button>
                </div>
              )}

              <section>
                <div className="mb-2 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
                      From the original video
                    </p>
                    <h3 className="font-display text-xl font-semibold">Comments</h3>
                  </div>
                  <MessageCircle className="h-5 w-5 text-ink-3" />
                </div>

                <div className="divide-y divide-border rounded-[24px] border border-border bg-card px-4">
                  {comments.map((c) => (
                    <article key={c.id} className="flex gap-3 py-4">
                      <img
                        src={c.avatar}
                        alt=""
                        loading="lazy"
                        className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-border"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{c.author}</p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-ink-2">
                          {c.text}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Heart className="h-3.5 w-3.5" />
                            {c.likes.toLocaleString()}
                          </span>
                          {c.replies > 0 && <span>{c.replies.toLocaleString()} replies</span>}
                          <span>{new Date(c.publishedAt).toLocaleDateString()}</span>
                        </div>
                        {c.replies > 0 && (
                          <a
                            href={`https://www.youtube.com/watch?v=${videoId}&lc=${c.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary"
                          >
                            View replies
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </article>
                  ))}
                </div>

                {details.isSuccess && comments.length === 0 && (
                  <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                    No public comments are available yet.
                  </p>
                )}
              </section>
            </div>
          )}

          {details.hasNextPage && (
            <button
              className="mt-5 min-h-11 w-full rounded-full border border-border bg-surface px-4 text-sm font-semibold text-primary"
              disabled={details.isFetchingNextPage}
              onClick={() => void details.fetchNextPage()}
            >
              {details.isFetchingNextPage ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
