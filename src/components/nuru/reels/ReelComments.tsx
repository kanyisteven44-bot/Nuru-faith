import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Pin, RotateCcw, Send, Trash2 } from "lucide-react";
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
  type ReelComment as ReelCommentRow,
} from "@/services/reels";
import { CardSkeleton, EmptyState } from "@/components/nuru/Primitives";
import { Sheet } from "./Sheet";

type Row = ReelCommentRow & { pending?: boolean; failed?: boolean };

const SORTS = ["Top", "Newest"] as const;
type Sort = (typeof SORTS)[number];

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
  const key = ["reel-comments", reelId];
  const [text, setText] = useState("");
  const [sort, setSort] = useState<Sort>("Top");
  const [replyTo, setReplyTo] = useState<ReelCommentRow | null>(null);

  const comments = useQuery({ queryKey: key, queryFn: () => fetchReelComments(reelId) });
  const likes = useQuery({
    queryKey: ["reel-comment-likes", userId],
    queryFn: () => fetchMyCommentLikes(userId!),
    enabled: !!userId,
  });

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: key });
    await qc.invalidateQueries({ queryKey: ["reel-comment-likes", userId] });
  };

  const send = useMutation({
    mutationFn: async (body: string) => {
      if (!userId) throw new Error("Sign in to join the conversation");
      await addReelComment({ reelId, userId, content: body, parentId: replyTo?.id ?? null });
    },
    onMutate: async (body: string) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Row[]>(key) ?? [];
      const optimistic: Row = {
        id: `pending-${Date.now()}`,
        reel_id: reelId,
        user_id: userId ?? "",
        parent_comment_id: replyTo?.id ?? null,
        content: body,
        pinned: false,
        like_count: 0,
        created_at: new Date().toISOString(),
        profiles: null,
        pending: true,
      };
      qc.setQueryData<Row[]>(key, [...previous, optimistic]);
      return { previous, optimisticId: optimistic.id };
    },
    onError: (e, _body, ctx) => {
      if (ctx) {
        qc.setQueryData<Row[]>(
          key,
          (qc.getQueryData<Row[]>(key) ?? []).map((c) =>
            c.id === ctx.optimisticId ? { ...c, pending: false, failed: true } : c,
          ),
        );
      }
      toast.error(e instanceof Error ? e.message : "Couldn't post that — tap retry");
    },
    onSuccess: async () => {
      setReplyTo(null);
      await refresh();
    },
  });

  const all = useMemo(() => (comments.data ?? []) as Row[], [comments.data]);
  const roots = useMemo(() => {
    const list = all.filter((c) => !c.parent_comment_id);
    const replies = (id: string) => all.filter((c) => c.parent_comment_id === id).length;
    if (sort === "Newest")
      return [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
    return [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const score = (c: Row) => c.like_count * 2 + replies(c.id);
      const diff = score(b) - score(a);
      return diff !== 0 ? diff : b.created_at.localeCompare(a.created_at);
    });
  }, [all, sort]);
  const repliesOf = (id: string) => all.filter((c) => c.parent_comment_id === id);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (body.length < 2) return;
    setText("");
    send.mutate(body);
  }

  return (
    <Sheet
      label="Comments"
      onClose={onClose}
      height="h-[72dvh]"
      title={
        <div className="flex items-center gap-3">
          <h2 className="font-display text-base font-semibold">
            Comments{" "}
            {all.length > 0 && <span className="text-muted-foreground">· {all.length}</span>}
          </h2>
          <div className="flex gap-1" role="tablist" aria-label="Sort comments">
            {SORTS.map((s) => (
              <button
                key={s}
                role="tab"
                aria-selected={sort === s}
                onClick={() => setSort(s)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  sort === s ? "bg-surface-2 text-cyan" : "text-muted-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      }
      footer={
        <form
          onSubmit={submit}
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
              placeholder={userId ? "Add a comment..." : "Sign in to comment"}
              disabled={!userId}
              className="input-nuru flex-1"
              aria-label="Add a comment"
            />
            <button
              type="submit"
              disabled={!userId}
              aria-label="Post comment"
              className="flex h-11 w-11 items-center justify-center rounded-full nuru-gradient-bg disabled:opacity-50"
            >
              <Send className="h-4.5 w-4.5 text-primary-foreground" />
            </button>
          </div>
        </form>
      }
    >
      <p className="px-4 pt-3 text-[11px] text-muted-foreground">
        Keep it kind. Comments here are moderated — disagree with grace.
      </p>

      <div className="space-y-4 px-4 py-3">
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
              onRetry={() => send.mutate(c.content)}
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
                    onRetry={() => send.mutate(r.content)}
                    onChanged={refresh}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Sheet>
  );
}

function CommentRow({
  comment,
  liked,
  userId,
  isCreator,
  onReply,
  onRetry,
  onChanged,
}: {
  comment: Row;
  liked: boolean;
  userId: string | null;
  isCreator: boolean;
  onReply?: () => void;
  onRetry: () => void;
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
    <div className={cn("flex gap-3", comment.pending && "opacity-60")}>
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
          <span className="font-semibold">{mine && comment.pending ? "You" : name}</span>
          {comment.profiles?.verified && <span className="text-cyan">✓</span>}
          {comment.pinned && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-cyan">
              Pinned
            </span>
          )}
          <span className="text-muted-foreground">
            {comment.pending
              ? "Posting…"
              : comment.failed
                ? "Not sent"
                : timeAgo(comment.created_at)}
          </span>
        </p>
        <p className="mt-0.5 text-sm text-secondary-foreground">{comment.content}</p>

        {comment.failed ? (
          <button
            onClick={onRetry}
            className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-cyan"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Retry
          </button>
        ) : (
          !comment.pending && (
            <div className="mt-1 flex items-center gap-4 text-[11px] text-muted-foreground">
              <button
                onClick={() => run(() => toggleCommentLike(userId!, comment.id, liked))}
                className="flex items-center gap-1"
                aria-label="Like comment"
              >
                <Heart
                  className={cn("h-3.5 w-3.5", liked && "fill-destructive text-destructive")}
                />
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
          )
        )}
      </div>
    </div>
  );
}
