import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Flag, Heart, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { resolveMedia } from "@/lib/media";
import { compactNumber, initials, timeAgo } from "@/lib/format";
import {
  addComment,
  fetchComments,
  reportContent,
  togglePostLike,
  toggleSavedPost,
} from "@/services/content";
import { Chip } from "./Primitives";

export type PostRow = {
  id: string;
  kind: string;
  body: string | null;
  media_url: string | null;
  scripture_ref: string | null;
  hashtags: string[] | null;
  like_count: number;
  comment_count: number;
  created_at: string;
  author_name: string | null;
  author_handle: string | null;
  author_avatar_url: string | null;
};

const KIND_LABEL: Record<string, string> = {
  prayer: "Prayer request",
  testimony: "Testimony",
  reflection: "Bible reflection",
  announcement: "Announcement",
  event: "Event",
};

export function PostCard({
  post,
  userId,
  liked,
  saved,
}: {
  post: PostRow;
  userId: string | null;
  liked: boolean;
  saved: boolean;
}) {
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState("");
  const [optimisticLike, setOptimisticLike] = useState<boolean | null>(null);
  const isLiked = optimisticLike ?? liked;

  const name = post.author_name ?? "Nuru member";
  const handle = post.author_handle ?? "";
  const avatar = post.author_avatar_url;

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", post.id],
    queryFn: () => fetchComments(post.id),
    enabled: showComments,
  });

  async function requireAuth(action: () => Promise<void>) {
    if (!userId) {
      toast.error("Sign in to join in");
      return;
    }
    try {
      await action();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't work");
    }
  }

  return (
    <article className="border-b border-border pb-4 last:border-b-0">
      <div className="flex items-center gap-3 px-1 pb-3">
        <Avatar src={avatar} name={name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {handle} · {timeAgo(post.created_at)}
          </p>
        </div>
        {KIND_LABEL[post.kind] && <Chip tone="brand">{KIND_LABEL[post.kind]}</Chip>}
      </div>

      {post.body && (
        <p className="px-1 pb-3 text-sm leading-relaxed text-secondary-foreground">{post.body}</p>
      )}

      {post.scripture_ref && (
        <p className="px-1 pb-3 text-xs font-semibold text-cyan">{post.scripture_ref}</p>
      )}

      {post.media_url && (
        <img
          src={resolveMedia(post.media_url)}
          alt=""
          loading="lazy"
          width={1024}
          height={640}
          className="aspect-[16/10] w-full rounded-2xl border border-border object-cover"
        />
      )}

      {post.hashtags?.length ? (
        <p className="px-1 pt-3 text-xs text-cyan">{post.hashtags.join(" ")}</p>
      ) : null}

      <div className="flex items-center gap-1 pt-1">
        <ActionButton
          label={compactNumber(post.like_count + (isLiked && !liked ? 1 : 0))}
          active={isLiked}
          onClick={() =>
            requireAuth(async () => {
              setOptimisticLike(!isLiked);
              await togglePostLike(userId!, post.id, isLiked);
              await queryClient.invalidateQueries({ queryKey: ["post-likes", userId] });
            })
          }
        >
          <Heart className={cn("h-4.5 w-4.5", isLiked && "fill-destructive text-destructive")} />
        </ActionButton>

        <ActionButton
          label={compactNumber(comments.length || post.comment_count)}
          onClick={() => setShowComments((v) => !v)}
        >
          <MessageCircle className="h-4.5 w-4.5" />
        </ActionButton>

        <ActionButton
          label="Share"
          onClick={async () => {
            const url = `${window.location.origin}/community`;
            if (navigator.share)
              await navigator.share({ title: "Nuru Faith", url }).catch(() => {});
            else {
              await navigator.clipboard.writeText(url);
              toast.success("Link copied");
            }
          }}
        >
          <Share2 className="h-4.5 w-4.5" />
        </ActionButton>

        <div className="flex-1" />

        <ActionButton
          label=""
          active={saved}
          onClick={() =>
            requireAuth(async () => {
              await toggleSavedPost(userId!, post.id, saved);
              await queryClient.invalidateQueries({ queryKey: ["saved-posts", userId] });
              toast.success(saved ? "Removed from saved" : "Saved");
            })
          }
        >
          <Bookmark className={cn("h-4.5 w-4.5", saved && "fill-cyan text-cyan")} />
        </ActionButton>

        <ActionButton
          label=""
          onClick={() =>
            requireAuth(async () => {
              await reportContent(userId!, "post", post.id, "Reported from feed");
              toast.success("Reported to moderators");
            })
          }
        >
          <Flag className="h-4 w-4" />
        </ActionButton>
      </div>

      {showComments && (
        <div className="mt-3 rounded-2xl border border-border bg-surface/50 p-4">
          <ul className="mb-3 space-y-3">
            {comments.length === 0 && (
              <li className="text-xs text-muted-foreground">Be the first to reply.</li>
            )}
            {comments.map((c) => (
              <li key={c.id} className="flex gap-2">
                <Avatar name="Nuru member" size="sm" />
                <p className="text-sm text-secondary-foreground">{c.body}</p>
              </li>
            ))}
          </ul>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim().length < 2) return;
              void requireAuth(async () => {
                await addComment(post.id, userId!, draft.trim());
                setDraft("");
                await queryClient.invalidateQueries({ queryKey: ["comments", post.id] });
              });
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a reply…"
              aria-label="Write a reply"
              className="min-h-11 flex-1 rounded-full border border-input bg-surface-2 px-4 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="min-h-11 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground nuru-glow-sm"
            >
              Reply
            </button>
          </form>
        </div>
      )}
    </article>
  );
}

export function Avatar({
  src,
  name,
  size = "md",
}: {
  src?: string | null | undefined;
  name?: string | null | undefined;
  size?: "sm" | "md" | "lg" | undefined;
}) {
  const dim =
    size === "sm"
      ? "h-7 w-7 text-[10px]"
      : size === "lg"
        ? "h-16 w-16 text-lg"
        : "h-10 w-10 text-xs";
  if (src) {
    return (
      <img
        src={resolveMedia(src)}
        alt=""
        loading="lazy"
        className={cn("shrink-0 rounded-full object-cover ring-1 ring-border-strong", dim)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full nuru-gradient-bg font-semibold text-primary-foreground",
        dim,
      )}
    >
      {initials(name)}
    </span>
  );
}

function ActionButton({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors hover:bg-surface-2",
        active ? "text-cyan" : "text-muted-foreground",
      )}
    >
      {children}
      {label && <span>{label}</span>}
    </button>
  );
}
