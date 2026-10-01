import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { fetchFollowers, fetchFollowing } from "@/services/content";
import { fetchFollowingIds, toggleFollow } from "@/services/reels";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/nuru/Primitives";
import { Sheet } from "@/components/nuru/Sheet";
import { PersonRow } from "@/components/nuru/PersonRow";

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
          <PersonRow
            key={person.id}
            person={person}
            viewerId={viewerId}
            isFollowing={followingIds.has(person.id)}
            invalidate={[["people", kind, userId]]}
          />
        ))}
      </div>
    </Sheet>
  );
}
