import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { MediaCatalog } from "@/components/youtube/MediaCatalog";

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
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 350);
    return () => clearTimeout(timer);
  }, [search]);
  return (
    <AppShell>
      <ScreenHeader title="Podcasts" subtitle="Real conversations about Scripture and faith" />
      <div className="px-4 pt-4">
        <input
          className="input-nuru"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search podcast episodes"
          placeholder="Search episodes or creators…"
        />
      </div>
      <MediaCatalog mediaType="podcast" query={query} />
    </AppShell>
  );
}
