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
import { generatedAvatar } from "@/lib/avatar";

export function ExternalVideoCommentsSheet({
  externalId,
  userId,
  onClose,
}: {
  externalId: string;
  userId: string | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
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
  const key = ["external-reel-comments", externalId];
  const comments = useQuery({
    queryKey: key,
    queryFn: () => fetchExternalReelComments(externalId),
    enabled: !!userId,
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
      await Promise.all([
        qc.invalidateQueries({ queryKey: key }),
        qc.invalidateQueries({ queryKey: ["external-reel-state", userId, externalId] }),
      ]);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Couldn't post comment"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => {
      if (!userId) throw new Error("Sign in to manage comments");
      return deleteExternalReelComment(userId, id);
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: key }),
        qc.invalidateQueries({ queryKey: ["external-reel-state", userId, externalId] }),
      ]);
    },
    onError: (error) => toast.error(error.message),
  });

  // Provenance stays in the data model; only owned local comments can be deleted.
  const ownRows = (comments.data ?? []).map((comment) => ({
    key: `local:${comment.id}`,
    id: comment.id,
    text: comment.content,
    author: comment.user_id === userId ? "You" : comment.author_name || "Member",
    avatar: comment.avatar_url || generatedAvatar(comment.author_name || "Member", comment.user_id),
    owned: comment.user_id === userId,
    likes: null as number | null,
    replies: 0,
    publishedAt: comment.created_at,
  }));
  const seen = new Set<string>();
  const sourceRows = (original.data?.pages.flatMap((page) => page.comments) ?? [])
    .filter((comment) => {
      if (seen.has(comment.id)) return false;
      seen.add(comment.id);
      return true;
    })
    .map((comment) => ({
      key: `source:${comment.id}`,
      id: comment.id,
      text: comment.text,
      author: comment.author,
      avatar: comment.avatar,
      owned: false,
      likes: comment.likes,
      replies: comment.replies,
      publishedAt: comment.publishedAt,
    }));
  const rows = [...ownRows, ...sourceRows];
  const count = original.data?.pages[0]?.stats.comments;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="top-auto bottom-0 z-[120] flex max-h-[85dvh] w-full max-w-xl translate-y-0 flex-col gap-0 overflow-hidden rounded-t-[28px] border border-white/10 bg-background p-0 shadow-2xl sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 sm:rounded-[28px]">
        <header className="shrink-0 border-b border-border/70 px-5 py-4 pr-12">
          <DialogTitle className="font-display text-lg font-semibold">
            Comments{count != null ? ` · ${BigInt(count).toLocaleString()}` : ""}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Read comments and join the conversation.
          </DialogDescription>
        </header>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {!userId && <p className="text-sm text-muted-foreground">Sign in to view comments.</p>}
          {userId && (original.isLoading || comments.isLoading) && (
            <p role="status" className="text-sm text-muted-foreground">
              Loading comments…
            </p>
          )}
          {(original.isError || comments.isError) && (
            <div role="alert">
              <p className="text-xs text-muted-foreground">
                Some comments couldn't load right now.
              </p>
              <button
                type="button"
                className="min-h-10 text-sm text-primary"
                onClick={() => {
                  void original.refetch();
                  void comments.refetch();
                }}
              >
                Try again
              </button>
            </div>
          )}
          {original.isSuccess && comments.isSuccess && rows.length === 0 && (
            <div className="py-8 text-center">
              <p className="font-semibold">No comments yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Be the first to join the conversation.
              </p>
            </div>
          )}
          {rows.map((comment) => (
            <article key={comment.key} className="flex gap-3">
              <img
                src={comment.avatar}
                alt=""
                loading="lazy"
                className="h-9 w-9 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold">{comment.author}</p>
                  {comment.owned && (
                    <button
                      type="button"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(comment.id)}
                      aria-label="Delete comment"
                      className="rounded-full p-1.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
                  {comment.text}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  {comment.likes !== null && <span>{comment.likes.toLocaleString()} likes</span>}
                  {comment.replies > 0 && (
                    <a
                      href={`https://www.youtube.com/watch?v=${externalId}&lc=${comment.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary"
                    >
                      {comment.replies.toLocaleString()} replies
                    </a>
                  )}
                  <span>{new Date(comment.publishedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </article>
          ))}
          {original.hasNextPage && (
            <button
              type="button"
              disabled={original.isFetchingNextPage}
              onClick={() => void original.fetchNextPage()}
              className="min-h-11 w-full text-sm font-semibold text-primary"
            >
              {original.isFetchingNextPage ? "Loading…" : "Load more comments"}
            </button>
          )}
          {sourceRows.length > 0 && (
            <a
              href={`https://www.youtube.com/watch?v=${externalId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[10px] text-muted-foreground"
            >
              YouTube
            </a>
          )}
        </div>
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
            placeholder={userId ? "Add a comment…" : "Sign in to comment"}
            aria-label="Add a comment"
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
