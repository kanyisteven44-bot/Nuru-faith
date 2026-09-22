import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { generatedAvatar } from "@/lib/avatar";
import { toggleFollow } from "@/services/reels";
import type { PersonRow as Person } from "@/services/content";

/**
 * One person in a list, with the control to follow or unfollow them.
 *
 * Shared so the Followers/Following sheet and the Community People tab show
 * the same row, and a follow made in one place refreshes the other.
 */
export function PersonRow({
  person,
  viewerId,
  isFollowing,
  /** Extra query keys to refresh after a follow changes. */
  invalidate = [],
}: {
  person: Person;
  viewerId: string | null;
  isFollowing: boolean;
  invalidate?: unknown[][];
}) {
  const qc = useQueryClient();

  const follow = useMutation({
    mutationFn: () => toggleFollow(viewerId!, person.id, isFollowing),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["my-following-ids", viewerId] });
      void qc.invalidateQueries({ queryKey: ["profile-counts"] });
      void qc.invalidateQueries({ queryKey: ["following", viewerId] });
      for (const key of invalidate) void qc.invalidateQueries({ queryKey: key });
    },
    onError: () => toast.error("Couldn't update that — try again"),
  });

  const name = person.full_name?.trim() || person.username?.trim() || "Nuru member";
  const isSelf = viewerId === person.id;

  return (
    <div className="flex items-center gap-3 border-b border-border/60 py-3 last:border-b-0">
      <img
        src={person.avatar_url || generatedAvatar(person.id, name)}
        alt=""
        className="h-11 w-11 shrink-0 rounded-full object-cover"
      />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 text-[14px] font-semibold">
          <span className="truncate">{name}</span>
          {person.verified && (
            <BadgeCheck
              aria-label="Verified"
              className="h-3.5 w-3.5 shrink-0 text-cyan"
              strokeWidth={2}
            />
          )}
        </p>
        {person.username ? (
          <p className="truncate text-[12px] text-muted-foreground">@{person.username}</p>
        ) : (
          person.bio && <p className="truncate text-[12px] text-muted-foreground">{person.bio}</p>
        )}
      </div>

      {viewerId && !isSelf && (
        <button
          type="button"
          disabled={follow.isPending}
          onClick={() => follow.mutate()}
          aria-label={`${isFollowing ? "Unfollow" : "Follow"} ${name}`}
          className={cn(
            "flex min-h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-semibold transition-colors disabled:opacity-60",
            isFollowing
              ? "border border-border-strong bg-surface-2 text-secondary-foreground"
              : "bg-primary text-primary-foreground",
          )}
        >
          {!isFollowing && <UserPlus className="h-3.5 w-3.5" strokeWidth={2} />}
          {isFollowing ? "Following" : "Follow"}
        </button>
      )}
    </div>
  );
}
