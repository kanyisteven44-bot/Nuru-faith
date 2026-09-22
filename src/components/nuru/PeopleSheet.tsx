import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { generatedAvatar } from "@/lib/avatar";
import { fetchFollowers, fetchFollowing, type PersonRow } from "@/services/content";
import { fetchFollowingIds, toggleFollow } from "@/services/reels";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/nuru/Primitives";
import { Sheet } from "@/components/nuru/Sheet";

export type PeopleKind = "followers" | "following";

const COPY = {
  followers: {
    label: "Followers",
    empty: "No followers yet",
    hint: "When someone follows you, they'll show up here.",
  },
  following: {
    label: "Following",
    empty: "Not following anyone yet",
    hint: "Follow people from Reels and Community to see them here.",
  },
} as const;

/**
 * The list behind the Followers / Following counts on a profile.
 *
 * It opens over the profile rather than navigating, so the person keeps their
 * place — and so this adds no new route to the app.
 */
export function PeopleSheet({
  kind,
  userId,
  viewerId,
  onClose,
}: {
  kind: PeopleKind;
  /** Whose followers/following to list. */
  userId: string;
  /** The signed-in person, used to show Follow / Following on each row. */
  viewerId: string | null;
  onClose: () => void;
}) {
  const copy = COPY[kind];

  const people = useQuery({
    queryKey: ["people", kind, userId],
    queryFn: () => (kind === "followers" ? fetchFollowers(userId) : fetchFollowing(userId)),
  });

  const myFollowing = useQuery({
    queryKey: ["my-following-ids", viewerId],
    queryFn: () => fetchFollowingIds(viewerId!),
    enabled: !!viewerId,
  });
  const followingIds = new Set(myFollowing.data ?? []);

  const rows = people.data ?? [];

  return (
    <Sheet
      label={copy.label}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-cyan" strokeWidth={1.8} />
          <p className="font-display text-[15px] font-bold">{copy.label}</p>
          {people.isSuccess && (
            <span className="text-[13px] text-muted-foreground">{rows.length}</span>
          )}
        </div>
      }
    >
      <div className="px-4 pb-6">
        {people.isLoading && <CardSkeleton count={4} height="h-14" />}
        {people.isError && <ErrorState onRetry={() => void people.refetch()} />}

        {people.isSuccess && rows.length === 0 && (
          <EmptyState title={copy.empty} description={copy.hint} />
        )}

        {rows.map((person) => (
          <PersonRowItem
            key={person.id}
            person={person}
            viewerId={viewerId}
            isFollowing={followingIds.has(person.id)}
            kind={kind}
            listOwnerId={userId}
          />
        ))}
      </div>
    </Sheet>
  );
}

function PersonRowItem({
  person,
  viewerId,
  isFollowing,
  kind,
  listOwnerId,
}: {
  person: PersonRow;
  viewerId: string | null;
  isFollowing: boolean;
  kind: PeopleKind;
  listOwnerId: string;
}) {
  const qc = useQueryClient();

  const follow = useMutation({
    mutationFn: () => toggleFollow(viewerId!, person.id, isFollowing),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["my-following-ids", viewerId] });
      void qc.invalidateQueries({ queryKey: ["profile-counts"] });
      void qc.invalidateQueries({ queryKey: ["people", kind, listOwnerId] });
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
        {person.username && (
          <p className="truncate text-[12px] text-muted-foreground">@{person.username}</p>
        )}
      </div>

      {viewerId && !isSelf && (
        <button
          type="button"
          disabled={follow.isPending}
          onClick={() => follow.mutate()}
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
