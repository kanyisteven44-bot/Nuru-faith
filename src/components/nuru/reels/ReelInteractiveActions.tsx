import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import type { Reel } from "@/services/reels";
import {
  addExternalReelComment,
  deleteExternalReelComment,
  fetchExternalReelComments,
  fetchExternalReelState,
  toggleExternalReelLike,
  toggleExternalReelSave,
} from "@/services/externalReelInteractions";
import { ReelActions } from "./ReelActions";

export function ReelInteractiveActions({
  reel,
  near,
  liked,
  saved,
  onProfile,
  onLike,
  onComments,
  onShare,
  onSave,
  onMore,
}: {
  reel: Reel;
  near: boolean;
  liked: boolean;
  saved: boolean;
  onProfile: () => void;
  onLike: () => void;
  onComments: () => void;
  onShare: () => void;
  onSave: () => void;
  onMore: () => void;
}) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const isExternal = reel.source_type === "youtube" && !!reel.external_id;
  const externalId = reel.external_id ?? "";

  const state = useQuery({
    queryKey: ["external-reel-state", userId, externalId],
    queryFn: () => fetchExternalReelState(userId!, externalId),
    // A long feed can contain hundreds of external videos. Only hydrate
    // interaction state for the active Reel and its immediate neighbours.
    enabled: isExternal && !!userId && near,
    staleTime: 30_000,
  });

  const likeExternal = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error("Sign in to like Reels");
      return toggleExternalReelLike(userId, externalId, !!state.data?.liked);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["external-reel-state", userId, externalId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't update like"),
  });

  const saveExternal = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error("Sign in to save Reels");
      return toggleExternalReelSave(userId, externalId, !!state.data?.saved);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["external-reel-state", userId, externalId] });
      toast.success(state.data?.saved ? "Removed from saved" : "Saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save Reel"),
  });

  async function shareExternal() {
    const url = reel.external_url ?? `https://www.youtube.com/watch?v=${externalId}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: reel.title ?? "Nuru Faith Reel",
          text: reel.caption ?? "",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      // share sheet dismissed
    }
  }

  return (
    <>
      <ReelActions
        avatarUrl={reel.creator_avatar_url}
        creatorName={reel.creator_name}
        likeCount={isExternal ? reel.like_count + (state.data?.liked ? 1 : 0) : reel.like_count}
        commentCount={isExternal ? (state.data?.commentCount ?? 0) : reel.comment_count}
        liked={isExternal ? !!state.data?.liked : liked}
        saved={isExternal ? !!state.data?.saved : saved}
        onProfile={onProfile}
        onLike={() => {
          if (!isExternal) return onLike();
          if (!userId) return toast.error("Sign in to like Reels");
          likeExternal.mutate();
        }}
        onComments={() => {
          if (!isExternal) return onComments();
          setCommentsOpen(true);
        }}
        onShare={() => {
          if (!isExternal) return onShare();
          void shareExternal();
        }}
        onSave={() => {
          if (!isExternal) return onSave();
          if (!userId) return toast.error("Sign in to save Reels");
          saveExternal.mutate();
        }}
        onMore={onMore}
      />

      {isExternal && commentsOpen && (
        <ExternalCommentsSheet
          externalReelId={externalId}
          userId={userId}
          onClose={() => setCommentsOpen(false)}
        />
      )}
    </>
  );
}

function ExternalCommentsSheet({
  externalReelId,
  userId,
  onClose,
}: {
  externalReelId: string;
  userId: string | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const key = ["external-reel-comments", externalReelId];

  const comments = useQuery({
    queryKey: key,
    queryFn: () => fetchExternalReelComments(externalReelId),
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sign in to comment");
      const body = text.trim();
      if (!body) return;
      await addExternalReelComment(userId, externalReelId, body);
    },
    onSuccess: async () => {
      setText("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: key }),
        qc.invalidateQueries({ queryKey: ["external-reel-state", userId, externalReelId] }),
      ]);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't post comment"),
  });

  async function remove(commentId: string) {
    if (!userId) return;
    try {
      await deleteExternalReelComment(userId, commentId);
      await Promise.all([
        qc.invalidateQueries({ queryKey: key }),
        qc.invalidateQueries({ queryKey: ["external-reel-state", userId, externalReelId] }),
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete comment");
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-black/45" onClick={onClose}>
      <section
        className="max-h-[72dvh] w-full overflow-hidden rounded-t-[28px] border border-white/10 bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <div>
            <h2 className="font-display text-base font-semibold">Comments</h2>
            <p className="text-[11px] text-muted-foreground">
              {comments.data?.length ?? 0} on this Reel
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2"
            aria-label="Close comments"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="max-h-[50dvh] space-y-4 overflow-y-auto px-4 py-4">
          {comments.isLoading && <p className="text-sm text-muted-foreground">Loading comments…</p>}
          {!comments.isLoading && (comments.data?.length ?? 0) === 0 && (
            <div className="py-8 text-center">
              <p className="font-semibold">No comments yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Be the first to join the conversation.
              </p>
            </div>
          )}
          {(comments.data ?? []).map((comment) => (
            <article key={comment.id} className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-cyan">
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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) send.mutate();
          }}
          className="flex items-center gap-2 border-t border-border/70 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={800}
            disabled={!userId || send.isPending}
            placeholder={userId ? "Add a comment…" : "Sign in to comment"}
            className="input-nuru flex-1"
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
      </section>
    </div>
  );
}
