import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { DISCOVERY_KINDS, DISCOVERY_LABELS } from "@/lib/content-policy";
import { searchDiscovery } from "@/lib/discovery.functions";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/nuru/Primitives";
import { ScriptureText } from "@/components/nuru/Scripture";
import { YouTubePlayer } from "@/components/youtube/YouTubePlayer";
import { resolveMedia } from "@/lib/media";

export const Route = createFileRoute("/_authenticated/discovery/$kind/$id")({
  component: DiscoveryDetail,
});
function DiscoveryDetail() {
  const params = Route.useParams();
  const { userId } = useAuth();
  const kind = DISCOVERY_KINDS.find((value) => value === params.kind);
  const result = useQuery({
    queryKey: ["discovery-item", userId, kind, params.id],
    enabled: !!kind && !!userId,
    queryFn: () => searchDiscovery({ data: { kind: kind!, id: params.id } }),
  });
  const item = result.data?.items[0];
  return (
    <AppShell>
      <ScreenHeader title={kind ? DISCOVERY_LABELS[kind] : "Explore"} />
      <div className="space-y-4 p-4">
        <Link
          to="/explore"
          search={{ q: "", kind: "all" }}
          className="inline-flex min-h-11 items-center text-sm text-cyan"
        >
          Back to Explore
        </Link>
        {result.isLoading && <CardSkeleton count={1} height="h-48" />}
        {result.isError && <ErrorState onRetry={() => void result.refetch()} />}
        {(!kind || (result.isSuccess && !item)) && (
          <EmptyState
            title="Content unavailable"
            description="It may have been removed or may no longer be shared with you."
          />
        )}
        {item && (
          <article className="nuru-card space-y-4 overflow-hidden p-4">
            <h1 className="font-display text-xl font-semibold break-words">{item.title}</h1>
            {item.image && (
              <img
                src={resolveMedia(item.image)}
                alt=""
                className="max-h-64 w-full rounded-xl object-cover"
              />
            )}
            <p className="whitespace-pre-wrap break-words text-sm text-secondary-foreground">
              {item.description}
            </p>
            {item.reference && <ScriptureText reference={item.reference} />}
            {item.source === "youtube" && item.externalId && (
              <YouTubePlayer videoId={item.externalId} title={item.title} />
            )}
            {item.source !== "youtube" && item.audioUrl && (
              <audio controls preload="none" src={resolveMedia(item.audioUrl)} className="w-full" />
            )}
            {item.kind === "series" && item.slug && (
              <Link
                className="inline-flex min-h-11 items-center text-cyan"
                to="/series/$slug"
                params={{ slug: item.slug }}
              >
                Begin this series
              </Link>
            )}
            {item.kind === "reels" && (
              <a
                className="inline-flex min-h-11 items-center text-cyan"
                href={`/reels?reel=${item.id}`}
              >
                Watch this Reel
              </a>
            )}
          </article>
        )}
      </div>
    </AppShell>
  );
}
