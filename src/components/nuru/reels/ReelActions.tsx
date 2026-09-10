import { Bookmark, Heart, MessageCircle, MoreHorizontal, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { compactNumber } from "@/lib/format";
import { resolveMedia } from "@/lib/media";

function RailButton({
  icon,
  label,
  onClick,
  aria,
}: {
  icon: React.ReactNode;
  label?: string;
  onClick: () => void;
  aria: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={aria}
      className="flex min-h-11 w-12 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-white drop-shadow-md transition-transform duration-150 active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100"
    >
      {icon}
      {label ? <span>{label}</span> : null}
    </button>
  );
}

/** The familiar vertical rail: creator, like, comments, share, save, more. */
export function ReelActions({
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
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={onProfile}
        aria-label={`Open ${creatorName}'s profile`}
        className="transition-transform duration-150 active:scale-90"
      >
        <img
          src={resolveMedia(avatarUrl)}
          alt=""
          width={44}
          height={44}
          loading="lazy"
          className="h-11 w-11 rounded-full border-2 border-white/80 object-cover"
        />
      </button>

      <RailButton
        aria={liked ? "Unlike Reel" : "Like Reel"}
        onClick={onLike}
        label={compactNumber(likeCount)}
        icon={<Heart className={cn("h-7 w-7", liked && "fill-destructive text-destructive")} />}
      />
      <RailButton
        aria={`Open ${commentCount} comments`}
        onClick={onComments}
        label={compactNumber(commentCount)}
        icon={<MessageCircle className="h-7 w-7" />}
      />
      <RailButton aria="Share Reel" onClick={onShare} icon={<Share2 className="h-6.5 w-6.5" />} />
      <RailButton
        aria={saved ? "Remove Reel from saved" : "Save Reel"}
        onClick={onSave}
        icon={<Bookmark className={cn("h-6.5 w-6.5", saved && "fill-cyan text-cyan")} />}
      />
      <RailButton
        aria="More options for this Reel"
        onClick={onMore}
        icon={<MoreHorizontal className="h-6 w-6" />}
      />
    </div>
  );
}
