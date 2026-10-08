import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  addExternalReelComment,
  deleteExternalReelComment,
  fetchExternalReelComments,
} from "@/services/externalReelInteractions";

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
    <div className="fixed inset-0 z-[120] flex items-end bg-black/45" onClick={onClose}>
      <section
        className="max-h-[78dvh] w-full overflow-hidden rounded-t-[28px] border border-white/10 bg-background shadow-2xl sm:mx-auto sm:max-w-xl sm:rounded-[28px]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Nuru conversation</h2>
            <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">
              Like and comment inside Nuru without connecting a Google account.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2" aria-label="Close comments">
            <X className="h-5 w-5" />
          </button>
        </header>

        {onOpenSourceComments && (
          <div className="border-b border-border/70 bg-surface/60 px-4 py-3">
            <button
              type="button"
              onClick={onOpenSourceComments}
              className="inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-primary"
            >
              View YouTube comments
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
            <p className="text-[10px] leading-4 text-muted-foreground">
              Posting directly to YouTube requires a connected YouTube account. Nuru comments do not.
            </p>
          </div>
        )}

        <div className="max-h-[50dvh] space-y-4 overflow-y-auto px-4 py-4">
          {comments.isLoading && <p className="text-sm text-muted-foreground">Loading comments…</p>}
          {!comments.isLoading && (comments.data?.length ?? 0) === 0 && (
            <div className="py-8 text-center">
              <p className="font-semibold">No Nuru comments yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Be the first to join the conversation.</p>
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
                <p className="mt-0.5 break-words text-sm text-secondary-foreground">{comment.content}</p>
              </div>
            </article>
          ))}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (text.trim()) send.mutate();
          }}
          className="flex items-center gap-2 border-t border-border/70 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={800}
            disabled={!userId || send.isPending}
            placeholder={userId ? "Add a Nuru comment…" : "Sign in to comment"}
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
