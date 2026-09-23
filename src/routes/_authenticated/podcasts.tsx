import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { SectionHeader } from "@/components/nuru/Primitives";
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

    </AppShell>
  );
}
