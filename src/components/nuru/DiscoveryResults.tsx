import { Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { searchDiscovery } from "@/lib/discovery.functions";
import { DISCOVERY_LABELS, type DiscoveryKind } from "@/lib/content-policy";
import { resolveMedia } from "@/lib/media";
import { CardSkeleton, EmptyState, ErrorState, GhostButton, SectionHeader } from "./Primitives";

export function DiscoveryResults({
  kind,
  query,
  userId,
}: {
  kind: DiscoveryKind;
  query: string;
  userId: string | null;
}) {
  const results = useInfiniteQuery({
    queryKey: ["discovery", userId, kind, query],
    enabled: !!userId,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => searchDiscovery({ data: { kind, query, page: pageParam } }),
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length : undefined),
    staleTime: 60_000,
  });
  const items = results.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <section className="space-y-2 px-4 pb-5" aria-label={DISCOVERY_LABELS[kind]}>
      <SectionHeader title={DISCOVERY_LABELS[kind]} />
      {results.isLoading && <CardSkeleton count={2} height="h-20" />}
      {results.isError && <ErrorState onRetry={() => void results.refetch()} />}
      {results.isSuccess && items.length === 0 && (
        <EmptyState
          title="No results here"
          description={
            query
              ? "Try another word or topic."
              : "Approved content will appear here when it is available."
          }
        />
      )}
      {items.map((item) => (
        <Link
          key={item.id}
          to="/discovery/$kind/$id"
          params={{ kind, id: item.id }}
          className="nuru-card flex min-h-20 items-center gap-3 p-3"
        >
          {item.image && (
            <img
              src={resolveMedia(item.image)}
              alt=""
              width={64}
              height={64}
              loading="lazy"
              className="h-16 w-16 shrink-0 rounded-xl object-cover"
            />
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold break-words">{item.title}</span>
            <span className="line-clamp-2 text-xs text-muted-foreground">{item.description}</span>
          </span>
        </Link>
      ))}
      {results.hasNextPage && (
        <GhostButton
          disabled={results.isFetchingNextPage}
          onClick={() => void results.fetchNextPage()}
        >
          {results.isFetchingNextPage ? "Loading…" : "Show more"}
        </GhostButton>
      )}
    </section>
  );
}
