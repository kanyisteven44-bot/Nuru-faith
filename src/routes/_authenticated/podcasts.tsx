import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Headphones } from "lucide-react";
import { toast } from "sonner";
import { resolveMedia } from "@/lib/media";
import { duration } from "@/lib/format";
import { fetchPodcasts } from "@/services/content";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState } from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/podcasts")({
  head: () => ({
    meta: [
      { title: "Podcasts & sermons — Nuru Faith" },
      {
        name: "description",
        content: "Sermons, teaching series and Christian podcasts for young believers.",
      },
      { property: "og:title", content: "Podcasts & sermons — Nuru Faith" },
      { property: "og:description", content: "Sermons and Christian podcasts." },
    ],
  }),
  component: PodcastsScreen,
});

function PodcastsScreen() {
  const { data, isLoading } = useQuery({ queryKey: ["podcasts"], queryFn: fetchPodcasts });

  return (
    <AppShell>
      <ScreenHeader title="Podcasts" subtitle="Sermons and teaching, on the go" />

      <div className="space-y-4 px-4 py-3">
        {isLoading && <CardSkeleton count={2} height="h-40" />}
        {data?.length === 0 && (
          <EmptyState
            title="No shows yet"
            description="Churches are uploading their sermon feeds."
          />
        )}
        {(data ?? []).map((p) => (
          <section key={p.id} className="nuru-card overflow-hidden">
            <div className="flex gap-3 p-4">
              <img
                src={resolveMedia(p.cover_url)}
                alt=""
                width={160}
                height={160}
                loading="lazy"
                className="h-20 w-20 rounded-2xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.host}</p>
                {p.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-secondary-foreground">
                    {p.description}
                  </p>
                )}
              </div>
            </div>
            <ul className="border-t border-border/60">
              {(p.podcast_episodes ?? []).map(
                (e: { id: string; title: string; duration_seconds: number | null }) => (
                  <li key={e.id}>
                    <button
                      onClick={() => toast("Audio playback is coming soon")}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2"
                    >
                      <Headphones className="h-4 w-4 shrink-0 text-cyan" />
                      <span className="min-w-0 flex-1 truncate text-sm">{e.title}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {duration(e.duration_seconds)}
                      </span>
                    </button>
                  </li>
                ),
              )}
            </ul>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
