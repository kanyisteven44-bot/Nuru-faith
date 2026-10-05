import { resolveMedia } from "@/lib/media";
import { ScreenHero } from "@/components/nuru/Primitives";
import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { MusicDiscovery } from "@/components/youtube/MusicDiscovery";
import type { MediaItem } from "@/services/media";
import type { YouTubeVideo } from "@/services/youtubeService";
import { MediaPlayback } from "@/components/youtube/MediaCatalog";

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
  const [selected, setSelected] = useState<MediaItem | null>(null);
  function playVideo(video: YouTubeVideo) {
    setSelected({
      id: video.youtubeVideoId,
      source: "youtube",
      external_id: video.youtubeVideoId,
      title: video.title,
      description: video.description,
      thumbnail_url: video.thumbnail,
      media_type: "podcast",
      category: "faith",
      creator_name: video.channelName,
      youtube_channel_id: video.channelId,
      church_id: null,
      audio_url: null,
      duration_seconds: null,
      scripture_ref: null,
      can_download: false,
      is_featured: false,
    });
  }
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 350);
    return () => clearTimeout(timer);
  }, [search]);
  return (
    <AppShell>
      <ScreenHeader
        title="Podcasts"
        subtitle="Sermons, teaching and conversations about Scripture"
      />
      <ScreenHero image={resolveMedia("asset:church-interior")} />
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
      {/* The catalogue below now lists every episode, audio and video alike,
          so the old "Browse audio archive" toggle is gone — it was hiding the
          whole published archive behind a second tap. */}
      <MusicDiscovery
        mediaType="podcast"
        query={query}
        onPlay={playVideo}
        onPlayItem={setSelected}
      />
      {selected && <MediaPlayback item={selected} onClose={() => setSelected(null)} />}
    </AppShell>
  );
}
