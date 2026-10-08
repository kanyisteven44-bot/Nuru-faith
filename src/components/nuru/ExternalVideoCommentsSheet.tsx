import { useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  addExternalReelComment,
  deleteExternalReelComment,
  fetchExternalReelComments,
} from "@/services/externalReelInteractions";

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { fetchYouTubeReelDetails } from "@/lib/youtubeReel.functions";

export function ExternalVideoCommentsSheet({
  externalId,
  userId,
  onClose,
  onOpenSourceComments,
}: {
  externalId: string;
  userId: string | null;
  onClose: () => void;
  onOpenSourceComments?: (() => void) | undefined;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [tab, setTab] = useState<"original" | "nuru">("original");
  const original = useInfiniteQuery({
    queryKey: ["youtube-reel", externalId, "comments"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      fetchYouTubeReelDetails({
        data: { videoId: externalId, section: "comments", pageToken: pageParam },
      }),
    getNextPageParam: (page) => page.nextPageToken ?? undefined,
    enabled: !!userId && /^[A-Za-z0-9_-]{11}$/.test(externalId),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const publicComments = original.data?.pages.flatMap((page) => page.comments) ?? [];
  const key = ["external-reel-comments", externalId];

  const comments = useQuery({
    queryKey: key,
    queryFn: () => fetchExternalReelComments(externalId),
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sign in to comment");
      const body = text.trim();
      if (!body) return;
      await addExternalReelComment(userId, externalId, body);
    },
    onSuccess: async () => {
      setText("");
      setTab("nuru");
      await Promise.all([
        qc.invalidateQueries({ queryKey: key }),
        qc.invalidateQueries({ queryKey: ["external-reel-state", userId, externalId] }),
      ]);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Couldn't post comment"),
  });

  async function remove(commentId: string) {
    if (!userId) return;
    try {
      await deleteExternalReelComment(userId, commentId);
      await Promise.all([
        qc.invalidateQueries({ queryKey: key }),
        qc.invalidateQueries({ queryKey: ["external-reel-state", userId, externalId] }),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete comment");
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="top-auto bottom-0 z-[120] flex max-h-[85dvh] w-full max-w-xl translate-y-0 flex-col gap-0 overflow-hidden rounded-t-[28px] border border-white/10 bg-background p-0 shadow-2xl sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 sm:rounded-[28px]">
        <header className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-4">
          <div>
            <DialogTitle className="font-display text-lg font-semibold">Comments</DialogTitle>
            <DialogDescription className="mt-0.5 text-[11px] leading-5 text-muted-foreground">
              Join the conversation in Nuru.
            </DialogDescription>
          </div>
        </header>

        <div
          className="flex shrink-0 gap-2 border-b border-border/70 px-4 py-3"
          role="tablist"
          aria-label="Comment source"
        >
          {(["original", "nuru"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`min-h-10 rounded-full px-4 text-xs font-semibold ${tab === value ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"}`}
            >
              {value === "original" ? "Original video" : "Nuru community"}
            </button>
          ))}
          {onOpenSourceComments && import.meta.env["VITE_YOUTUBE_WRITE_ENABLED"] === "true" && (
            <button type="button" onClick={onOpenSourceComments} className="text-xs text-primary">
              Post to original video
            </button>
          )}
        </div>

        {tab === "original" && (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4" role="tabpanel">
            <a
              href={`https://www.youtube.com/watch?v=${externalId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-muted-foreground"
            >
              From YouTube
            </a>
            {original.data?.pages[0]?.stats && (
              <p className="text-xs text-muted-foreground">
                {original.data.pages[0].stats.likes !== null && (
                  <span>
                    {BigInt(original.data.pages[0].stats.likes).toLocaleString()} likes ·{" "}
                  </span>
                )}
                {original.data.pages[0].stats.comments !== null && (
                  <span>
                    {BigInt(original.data.pages[0].stats.comments).toLocaleString()} comments
                  </span>
                )}
              </p>
            )}
            {original.isPending && (
              <p className="text-sm text-muted-foreground">
                {userId ? "Loading comments…" : "Sign in to view comments"}
              </p>
            )}
            {original.isError && (
              <div role="alert">
                <p className="text-sm text-muted-foreground">{original.error.message}</p>
                <button
                  type="button"
                  className="min-h-10 text-sm text-primary"
                  onClick={() => void original.refetch()}
                >
                  Try again
                </button>
              </div>
            )}
            {original.isSuccess && publicComments.length === 0 && (
              <p className="text-sm text-muted-foreground">No public comments yet.</p>
            )}
            {publicComments.map((comment) => (
              <article key={comment.id} className="flex gap-3">
                <img
                  src={comment.avatar}
                  alt=""
                  loading="lazy"
                  className="h-9 w-9 shrink-0 rounded-full"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">{comment.author}</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm">{comment.text}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {comment.likes.toLocaleString()} likes
                    {comment.replies > 0 ? ` · ${comment.replies.toLocaleString()} replies` : ""}
                  </p>
                </div>
              </article>
            ))}
            {original.hasNextPage && (
              <button
                type="button"
                disabled={original.isFetchingNextPage}
                onClick={() => void original.fetchNextPage()}
                className="min-h-11 w-full text-sm text-primary"
              >
                {original.isFetchingNextPage ? "Loading…" : "Load more"}
              </button>
            )}
          </div>
        )}

        {tab === "nuru" && (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4" role="tabpanel">
            {comments.isLoading && (
              <p className="text-sm text-muted-foreground">Loading comments…</p>
            )}
            {comments.isError && (
              <p role="alert" className="text-sm text-muted-foreground">
                Couldn't load comments. Please try again.
              </p>
            )}
            {comments.isSuccess && (comments.data?.length ?? 0) === 0 && (
              <div className="py-8 text-center">
                <p className="font-semibold">No Nuru comments yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Be the first to join the conversation.
                </p>
              </div>
            )}
            {(comments.data ?? []).map((comment) => (
              <article key={comment.id} className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-leaf">
                  {comment.user_id === userId ? "You" : "N"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold">
                      {comment.user_id === userId ? "You" : "Nuru member"}
                    </span>
                    {comment.user_id === userId && (
                      <button
                        type="button"
                        onClick={() => void remove(comment.id)}
                        aria-label="Delete comment"
                        className="rounded-full p-1.5 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-0.5 break-words text-sm text-secondary-foreground">
                    {comment.content}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (text.trim() && !send.isPending) send.mutate();
          }}
          className="flex shrink-0 items-center gap-2 border-t border-border/70 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={800}
            disabled={!userId || send.isPending}
            placeholder={userId ? "Add a Nuru comment…" : "Sign in to comment"}
            aria-label="Add a comment in Nuru"
            className="input-nuru min-w-0 flex-1"
          />
          <button
            type="submit"
            disabled={!userId || !text.trim() || send.isPending}
            className="flex h-11 w-11 items-center justify-center rounded-full nuru-gradient-bg disabled:opacity-50"
            aria-label="Post comment"
          >
            <Send className="h-4.5 w-4.5 text-primary-foreground" />
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
