import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Headphones, Search, X } from "lucide-react";
import { resolveMedia } from "@/lib/media";
import { fetchPodcasts } from "@/services/content";
import { useAuth } from "@/hooks/useAuth";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState, SectionHeader } from "@/components/nuru/Primitives";
import { DiscoveryResults } from "@/components/nuru/DiscoveryResults";

export const Route = createFileRoute("/_authenticated/podcasts")({
  head: () => ({
    meta: [
      { title: "Podcasts & sermons — Nuru Faith" },
      {
        name: "description",
        content: "Discover Christian podcasts, sermons, Bible study and faith conversations.",
      },
      { property: "og:title", content: "Podcasts & sermons — Nuru Faith" },
      { property: "og:description", content: "Search and play Christian podcasts and sermons." },
    ],
  }),
  component: PodcastsScreen,
});

const TOPICS = [
  "Bible study",
  "Prayer",
  "Youth",
  "Purpose",
  "Relationships",
  "Mental health",
  "Leadership",
  "Family",
  "Theology",
  "Christian living",
] as const;

function PodcastsScreen() {
  const { userId } = useAuth();
  const [search, setSearch] = useState("");
  const legacy = useQuery({ queryKey: ["podcasts", "legacy"], queryFn: fetchPodcasts });

  return (
    <AppShell>
      <ScreenHeader title="Podcasts" subtitle="Teaching, conversations and sermons for your walk" />

      <div className="space-y-4 px-4 py-3">
        <div className="nuru-card p-4">
          <p className="text-sm font-semibold">A catalog built to grow</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Nuru searches approved podcast metadata instead of downloading huge audio libraries.
            Episodes stream from their original source, so the catalog can grow into the millions
            while keeping the app fast and respectful of publisher rights.
          </p>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search podcasts, hosts, topics…"
            aria-label="Search podcasts"
            className="input-nuru pl-11 pr-11"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear podcast search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div>
          <SectionHeader title="Explore topics" />
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => setSearch(topic)}
                className="shrink-0 rounded-full border border-border bg-surface-2 px-3 py-2 text-xs text-secondary-foreground"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </div>

      <DiscoveryResults kind="podcasts" query={search.trim()} userId={userId} />

      <section className="space-y-3 px-4 pb-6">
        <SectionHeader title="Nuru & church shows" />
        {legacy.isLoading && <CardSkeleton count={2} height="h-32" />}
        {!legacy.isLoading && (legacy.data ?? []).length === 0 && (
          <EmptyState
            title="No church shows yet"
            description="Approved podcast feeds and church sermon series will appear here."
          />
        )}
        {(legacy.data ?? []).slice(0, 12).map((podcast) => (
          <article key={podcast.id} className="nuru-card flex gap-3 p-3">
            <img
              src={resolveMedia(podcast.cover_url)}
              alt=""
              width={96}
              height={96}
              loading="lazy"
              className="h-20 w-20 shrink-0 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-semibold">{podcast.title}</p>
              <p className="mt-0.5 truncate text-xs text-cyan">{podcast.host}</p>
              {podcast.description && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {podcast.description}
                </p>
              )}
              <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Headphones className="h-3.5 w-3.5" />
                {(podcast.podcast_episodes ?? []).length} episodes
              </p>
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
