import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Pin, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";
import { resolveMedia } from "@/lib/media";
import {
  addReelComment,
  deleteReelComment,
  fetchMyCommentLikes,
  fetchReelComments,
  pinReelComment,
  toggleCommentLike,
  type ReelComment,
} from "@/services/reels";
import { CardSkeleton, EmptyState } from "./Primitives";

export function ReelComments({
  reelId,
  userId,
  isCreator,
  onClose,
}: {
  reelId: string;
  userId: string | null;
  isCreator: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ReelComment | null>(null);

  const comments = useQuery({
    queryKey: ["reel-comments", reelId],
    queryFn: () => fetchReelComments(reelId),
  });
  const likes = useQuery({
    queryKey: ["reel-comment-likes", userId],
    queryFn: () => fetchMyCommentLikes(userId!),
    enabled: !!userId,
  });

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["reel-comments", reelId] });
    await qc.invalidateQueries({ queryKey: ["reel-comment-likes", userId] });
    await qc.invalidateQueries({ queryKey: ["reels"] });
  };

  const send = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sign in to join the conversation");
      const body = text.trim();
      if (body.length < 2) throw new Error("Write a little more");
      await addReelComment({ reelId, userId, content: body, parentId: replyTo?.id ?? null });
    },
    onSuccess: async () => {
      setText("");
      setReplyTo(null);
      await refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't post that"),
  });

  const all = comments.data ?? [];
  const roots = all.filter((c) => !c.parent_comment_id);
  const repliesOf = (id: string) => all.filter((c) => c.parent_comment_id === id);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60"
      role="dialog"
      aria-label="Comments"
    >
      <button type="button" aria-label="Close comments" className="flex-1" onClick={onClose} />
      <div className="max-h-[78dvh] rounded-t-3xl border-t border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <h2 className="font-display text-base font-semibold">
            Comments{" "}
            {all.length > 0 && <span className="text-muted-foreground">· {all.length}</span>}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="px-4 pt-3 text-[11px] text-muted-foreground">
          Keep it kind. Comments here are moderated — disagree with grace.
        </p>

        <div className="max-h-[46dvh] space-y-4 overflow-y-auto px-4 py-3">
          {comments.isLoading && <CardSkeleton count={3} height="h-14" />}
          {!comments.isLoading && roots.length === 0 && (
            <EmptyState
              title="No comments yet"
              description="Be the first to share what stood out to you."
            />
          )}
          {roots.map((c) => (
            <div key={c.id} className="space-y-3">
              <CommentRow
                comment={c}
                liked={(likes.data ?? []).includes(c.id)}
                userId={userId}
                isCreator={isCreator}
                onReply={() => setReplyTo(c)}
                onChanged={refresh}
              />
              {repliesOf(c.id).length > 0 && (
                <div className="space-y-3 border-l border-border pl-4">
                  {repliesOf(c.id).map((r) => (
                    <CommentRow
                      key={r.id}
                      comment={r}
                      liked={(likes.data ?? []).includes(r.id)}
                      userId={userId}
                      isCreator={isCreator}
                      onChanged={refresh}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send.mutate();
          }}
          className="border-t border-border/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          {replyTo && (
            <div className="mb-2 flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2 text-xs">
              <span className="text-muted-foreground">
                Replying to {replyTo.profiles?.full_name ?? replyTo.profiles?.username ?? "member"}
              </span>
              <button type="button" onClick={() => setReplyTo(null)} className="text-cyan">
                Cancel
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={800}
              placeholder={userId ? "Add a comment…" : "Sign in to comment"}
              disabled={!userId || send.isPending}
              className="input-nuru flex-1"
              aria-label="Add a comment"
            />
            <button
              type="submit"
              disabled={!userId || send.isPending}
              aria-label="Post comment"
              className="flex h-11 w-11 items-center justify-center rounded-full nuru-gradient-bg disabled:opacity-50"
            >
              <Send className="h-4.5 w-4.5 text-primary-foreground" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CommentRow({
  comment,
  liked,
  userId,
  isCreator,
  onReply,
  onChanged,
}: {
  comment: ReelComment;
  liked: boolean;
  userId: string | null;
  isCreator: boolean;
  onReply?: () => void;
  onChanged: () => Promise<void>;
}) {
  const name = comment.profiles?.full_name ?? comment.profiles?.username ?? "Nuru member";
  const mine = userId === comment.user_id;

  async function run(fn: () => Promise<void>) {
    if (!userId) {
      toast.error("Sign in first");
      return;
    }
    try {
      await fn();
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't work");
    }
  }

  return (
    <div className="flex gap-3">
      <img
        src={resolveMedia(comment.profiles?.avatar_url ?? null)}
        alt=""
        width={36}
        height={36}
        loading="lazy"
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-semibold">{name}</span>
          {comment.profiles?.verified && <span className="text-cyan">✓</span>}
          {comment.pinned && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-cyan">
              Pinned
            </span>
          )}
          <span className="text-muted-foreground">{timeAgo(comment.created_at)}</span>
        </p>
        <p className="mt-0.5 text-sm text-secondary-foreground">{comment.content}</p>
        <div className="mt-1 flex items-center gap-4 text-[11px] text-muted-foreground">
          <button
            onClick={() => run(() => toggleCommentLike(userId!, comment.id, liked))}
            className="flex items-center gap-1"
            aria-label="Like comment"
          >
            <Heart className={cn("h-3.5 w-3.5", liked && "fill-destructive text-destructive")} />
            {comment.like_count > 0 ? comment.like_count : "Like"}
          </button>
          {onReply && <button onClick={onReply}>Reply</button>}
          {isCreator && (
            <button
              onClick={() => run(() => pinReelComment(comment.id, !comment.pinned))}
              className="flex items-center gap-1"
            >
              <Pin className="h-3.5 w-3.5" />
              {comment.pinned ? "Unpin" : "Pin"}
            </button>
          )}
          {(mine || isCreator) && (
            <button
              onClick={() => run(() => deleteReelComment(comment.id))}
              className="flex items-center gap-1 text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
