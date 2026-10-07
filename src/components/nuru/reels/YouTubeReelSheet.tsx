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
      toast.success("Comment posted to YouTube");
      void qc.invalidateQueries({ queryKey: ["youtube-reel", videoId, "comments"] });
      void qc.invalidateQueries({ queryKey: ["youtube-reel-details", videoId] });
    },
    onError: (error) => {
      if (error instanceof YouTubeConnectionRequired) setNeedsConnection(true);
      else toast.error(error.message);
    },
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="z-[110] max-h-[85dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {section === "comments"
              ? "YouTube comments"
              : (first?.creator.name ?? "Creator channel")}
          </DialogTitle>
        </DialogHeader>
        {details.isPending && <p role="status">Loading from YouTube…</p>}
        {details.isError && (
          <div role="alert">
            <p>{details.error.message}</p>
            <button className="min-h-11 text-primary" onClick={() => void details.refetch()}>
              Retry
            </button>
          </div>
        )}
        {first && section === "channel" && (
          <>
            <div className="flex items-center gap-3">
              {first.creator.avatar && (
                <img src={first.creator.avatar} alt="" className="h-16 w-16 rounded-full" />
              )}
              <div>
                <h2 className="font-semibold">{first.creator.name}</h2>
                {first.creator.subscribers !== null && (
                  <p className="text-sm text-muted-foreground">
                    {Number(first.creator.subscribers).toLocaleString()} YouTube subscribers
                  </p>
                )}
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm">{first.creator.description}</p>
            <a
              className="text-primary"
              href={`https://www.youtube.com/channel/${first.creator.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open channel on YouTube
            </a>
            <h3 className="font-semibold">YouTube uploads</h3>
            {playing && (
              <InAppMediaPlayer videoId={playing} title="Channel video" autoplay controls />
            )}
            <div className="grid grid-cols-2 gap-3">
              {details.data?.pages
                .flatMap((p) => p.uploads)
                .map((v) => (
                  <button key={v.id} className="text-left" onClick={() => setPlaying(v.id)}>
                    {v.thumbnail && (
                      <img
                        src={v.thumbnail}
                        alt=""
                        loading="lazy"
                        className="aspect-video w-full rounded-xl object-cover"
                      />
                    )}
                    <span className="mt-1 line-clamp-2 text-sm">{v.title}</span>
                  </button>
                ))}
            </div>
          </>
        )}
        {section === "comments" && (
          <>
            {first && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!publish.isPending && comment.trim()) publish.mutate();
                }}
                className="space-y-2"
              >
                <label htmlFor="youtube-comment" className="text-sm font-medium">
                  Comment on YouTube
                </label>
                <textarea
                  id="youtube-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={10000}
                  rows={3}
                  placeholder="Write a comment…"
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm"
                />
                <button
                  type="submit"
                  disabled={publish.isPending || !comment.trim()}
                  className="min-h-11 rounded-xl bg-primary px-4 text-primary-foreground disabled:opacity-50"
                >
                  {publish.isPending ? "Posting…" : "Post to YouTube"}
                </button>
              </form>
            )}
            {needsConnection && (
              <div className="space-y-2 rounded-xl border border-border p-3">
                <p className="text-sm">
                  Choose the Google account you use for YouTube. It can have a different email from
                  Nuru.
                </p>
                <button
                  disabled={connecting}
                  className="min-h-11 text-primary"
                  onClick={() => {
                    setConnecting(true);
                    void connectYouTube(videoId, returnTo).catch((e) => {
                      setConnecting(false);
                      toast.error(e.message);
                    });
                  }}
                >
                  {connecting ? "Connecting…" : "Continue with Google"}
                </button>
              </div>
            )}
            {onNuruComments && (
              <button className="min-h-11 text-primary" onClick={onNuruComments}>
                Nuru discussion
              </button>
            )}
            <a
              className="text-primary"
              href={`https://www.youtube.com/watch?v=${videoId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open on YouTube
            </a>
            {details.data?.pages
              .flatMap((p) => p.comments)
              .map((c) => (
                <article key={c.id} className="flex gap-3 py-3">
                  <img src={c.avatar} alt="" loading="lazy" className="h-9 w-9 rounded-full" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{c.author}</p>
                    <p className="whitespace-pre-wrap break-words text-sm">{c.text}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {c.likes.toLocaleString()} likes · {c.replies.toLocaleString()} replies ·{" "}
                      {new Date(c.publishedAt).toLocaleDateString()}
                    </p>
                    {c.replies > 0 && (
                      <a
                        href={`https://www.youtube.com/watch?v=${videoId}&lc=${c.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary"
                      >
                        Read replies on YouTube
                      </a>
                    )}
                  </div>
                </article>
              ))}
            {details.isSuccess && !first?.comments.length && <p>No public comments available.</p>}
          </>
        )}
        {details.hasNextPage && (
          <button
            className="min-h-11 text-primary"
            disabled={details.isFetchingNextPage}
            onClick={() => void details.fetchNextPage()}
          >
            {details.isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
