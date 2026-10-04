import { Bookmark, Heart, MessageCircle, MoreHorizontal, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { compactNumber } from "@/lib/format";
import { generatedAvatar } from "@/lib/avatar";

function RailButton({
  icon,
  label,
  onClick,
  aria,
  tint,
}: {
  icon: React.ReactNode;
  label?: string;
  onClick: () => void;
  aria: string;
  /** Tints the icon's backdrop once the action is "on" (liked, saved). */
  tint?: "destructive" | "cyan" | undefined;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={aria}
      className="flex min-h-11 w-12 flex-col items-center gap-1 text-[11px] font-semibold text-white transition-transform duration-150 active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100"
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full bg-black/25 backdrop-blur-sm",
          tint === "destructive" && "bg-destructive/25",
          tint === "cyan" && "bg-leaf/20",
        )}
      >
        {icon}
      </span>
      {label ? <span className="drop-shadow-md">{label}</span> : null}
    </button>
  );
}

/** The familiar vertical rail: creator, like, comments, share, save, more. */
export function ReelActions({
  horizontal = false,
  avatarUrl,
  creatorName,
  likeCount,
  commentCount,
  liked,
  saved,
  onProfile,
  onLike,
  onComments,
  onShare,
  onSave,
  onMore,
}: {
  horizontal?: boolean;
  avatarUrl: string | null;
  creatorName: string;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  saved: boolean;
  onProfile: () => void;
  onLike: () => void;
  onComments: () => void;
  onShare: () => void;
  onSave: () => void;
  onMore: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center",
        horizontal ? "flex-row justify-between gap-1" : "flex-col gap-4",
      )}
    >
      <button
        type="button"
        onClick={onProfile}
        aria-label={horizontal ? `About ${creatorName}` : `Open ${creatorName}'s profile`}
        className="transition-transform duration-150 active:scale-90"
      >
        <img
          src={avatarUrl || generatedAvatar(creatorName, creatorName)}
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = generatedAvatar(creatorName, creatorName);
          }}
          alt=""
          width={44}
          height={44}
          loading="lazy"
          className="h-11 w-11 rounded-full object-cover ring-2 ring-primary"
        />
      </button>

      <RailButton
        aria={
          horizontal
            ? liked
              ? "Unlike Reel in Nuru"
              : "Like Reel in Nuru"
            : liked
              ? "Unlike Reel"
              : "Like Reel"
        }
        onClick={onLike}
        label={horizontal ? (liked ? "Liked" : "Like") : compactNumber(likeCount)}
        tint={liked ? "destructive" : undefined}
        icon={<Heart className={cn("h-6 w-6", liked && "fill-destructive text-destructive")} />}
      />
      <RailButton
        aria={horizontal ? `Open ${commentCount} Nuru comments` : `Open ${commentCount} comments`}
        onClick={onComments}
        label={compactNumber(commentCount)}
        icon={<MessageCircle className="h-6 w-6" />}
      />
      <RailButton aria="Share Reel" onClick={onShare} icon={<Share2 className="h-5.5 w-5.5" />} />
      <RailButton
        aria={saved ? "Remove Reel from saved" : "Save Reel"}
        onClick={onSave}
        tint={saved ? "cyan" : undefined}
        icon={<Bookmark className={cn("h-5.5 w-5.5", saved && "fill-leaf text-leaf")} />}
      />
      <RailButton
        aria="More options for this Reel"
        onClick={onMore}
        icon={<MoreHorizontal className="h-6 w-6" />}
      />
    </div>
  );
}
