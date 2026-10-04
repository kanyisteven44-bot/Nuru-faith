import { CoverImage } from "@/components/nuru/CoverImage";
import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Music2, Play, Search, X } from "lucide-react";
import { duration } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { fetchProfile, fetchTracks } from "@/services/content";
import { fetchMediaItems, fetchMediaSources } from "@/services/media";
import type { YouTubePlaylist, YouTubeVideo } from "@/services/youtubeService";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import {
  CardSkeleton,
  EmptyState,
  IconTile,
  PillTabs,
  SectionHeader,
} from "@/components/nuru/Primitives";
import { NURU_PHOTO_POOLS, useRotatingMedia } from "@/lib/rotatingMedia";
import { YouTubePlayer, YouTubeNotice } from "@/components/youtube/YouTubePlayer";
import { YouTubeSearchResults } from "@/components/youtube/YouTubeSearchResults";
import { MediaCategoryRail } from "@/components/youtube/MediaCategoryRail";
import { MediaPlayback } from "@/components/youtube/MediaCatalog";
import type { MediaItem } from "@/services/media";
import { MusicDiscovery } from "@/components/youtube/MusicDiscovery";
import { MediaActions } from "@/components/youtube/MediaActions";

export const Route = createFileRoute("/_authenticated/music")({
  head: () => ({
    meta: [
      { title: "Music & media — Nuru Faith" },
      {
        name: "description",
        content:
          "Worship, hymns, sermons and Christian video — organised by topic and by your church.",
      },
      { property: "og:title", content: "Music & media — Nuru Faith" },
      {
        property: "og:description",
        content: "Worship playlists, sermons and Christian video in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MusicScreen,
});

const TABS = ["Music", "Podcasts", "Sermons", "Videos"] as const;
type Tab = (typeof TABS)[number];

type NowPlaying =
  | { kind: "youtube-video"; id: string; title: string }
  | { kind: "youtube-playlist"; id: string; title: string };

function MusicScreen() {
  const { userId } = useAuth();
  const [tab, setTab] = useState<Tab>("Music");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const playCatalog = (item: MediaItem) => {
    setNowPlaying(null);
    setSelectedMedia(item);
  };
  const heroBg = useRotatingMedia(NURU_PHOTO_POOLS.music, "music-hero");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 450);
    return () => clearTimeout(t);
  }, [search]);

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
  const churchId = profile.data?.church_id ?? null;

  const tracks = useQuery({ queryKey: ["tracks"], queryFn: fetchTracks });
  const artists = useQuery({
    queryKey: ["media-sources", "artist"],
    queryFn: () => fetchMediaSources({ sourceType: "youtube" }),
  });
  const churchMedia = useQuery({
    queryKey: ["media-items", "church", churchId],
    queryFn: () => fetchMediaItems({ churchId: churchId! }),
    enabled: !!churchId,
  });

  const openVideo = (v: YouTubeVideo) => {
    setSelectedMedia(null);
    setNowPlaying({ kind: "youtube-video", id: v.youtubeVideoId, title: v.title });
  };
  const openPlaylist = (p: YouTubePlaylist) => {
    setSelectedMedia(null);
    setNowPlaying({ kind: "youtube-playlist", id: p.youtubePlaylistId, title: p.title });
  };

  return (
    <AppShell>
      <ScreenHeader title="Music & media" subtitle="Worship, teaching and sound for your week" />
      <section
        className="relative mx-4 mb-2 overflow-hidden rounded-3xl bg-slate-950 p-6 text-white sm:p-8"
        aria-label="Worship collection"
      >
        <CoverImage
          src={heroBg}
          alt=""
          className="absolute inset-0 h-full w-full opacity-45"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent" />
        <div className="relative max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
            Sound for your soul
          </p>
          <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">
            A little worship.
            <br />A brighter day.
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/80">
            Find a song to lift your spirit, or a conversation to deepen your faith.
          </p>
        </div>
      </section>

      <div className="space-y-3 px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search worship, sermons, artists…"
            aria-label="Search music and media"
            className="input-nuru pl-11"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <PillTabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      {(tab === "Music" || tab === "Podcasts") && (
        <MusicDiscovery
          mediaType={tab === "Music" ? "music" : "podcast"}
          query={debounced}
          onPlay={openVideo}
          onPlayItem={playCatalog}
        />
      )}

      {tab === "Music" && !debounced.trim() && !!tracks.data?.length && (
        <NuruAudioSection tracks={tracks.data} loading={tracks.isLoading} onPlay={playCatalog} />
      )}

      {debounced.trim() && tab !== "Music" && tab !== "Podcasts" ? (
        <YouTubeSearchResults
          query={debounced}
          onSelectVideo={openVideo}
          onSelectPlaylist={openPlaylist}
        />
      ) : (
        <>
          {tab === "Videos" && (
            <section className="px-4 pt-3">
              <SectionHeader title="Artists & channels" />
              {artists.isLoading && <CardSkeleton count={3} height="h-16" />}
              {!artists.isLoading && (artists.data ?? []).length === 0 && (
                <EmptyState
                  title="No approved artists yet"
                  description="Verified Christian artists and channels will appear here once approved."
                />
              )}
              <div className="space-y-2">
                {(artists.data ?? []).map((a) => (
                  <div key={a.id} className="nuru-card flex items-center gap-3 p-3">
                    <IconTile icon={Music2} tone="cyan" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold">{a.name}</span>
                        {a.is_verified && (
                          <BadgeCheck
                            className="h-3.5 w-3.5 shrink-0 text-leaf"
                            aria-label="Verified"
                          />
                        )}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {a.description}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              {(artists.data ?? []).length > 0 && (
                <div className="pt-3">
                  {(artists.data ?? [])
                    .filter((a) => a.youtube_channel_id)
                    .slice(0, 3)
                    .map((a, i) => (
                      <MediaCategoryRail
                        key={a.id}
                        title={a.name}
                        channelId={a.youtube_channel_id!}
                        onSelect={openVideo}
                        showUnavailableNotice={i === 0}
                      />
                    ))}
                </div>
              )}

              <SectionHeader title="Search YouTube" />
              <p className="text-xs text-muted-foreground">
                Search Christian worship, teaching and testimony. Videos play in YouTube's own
                player — Nuru Faith never downloads or re-hosts them.
              </p>
              <div className="pt-3">
                <MediaCategoryRail
                  title="Christian teaching"
                  query="bible teaching sermon"
                  onSelect={openVideo}
                  showUnavailableNotice
                />
                <MediaCategoryRail
                  title="Testimonies"
                  query="christian testimony story"
                  onSelect={openVideo}
                />
              </div>
            </section>
          )}

          {tab === "Sermons" && (
            <section className="px-4 pt-3">
              <SectionHeader title="From your church" />
              {!churchId && (
                <EmptyState
                  title="No church yet"
                  description="Join a church to see its worship, sermons and media here."
                />
              )}
              {churchId && churchMedia.isLoading && <CardSkeleton count={3} height="h-20" />}
              {churchId && !churchMedia.isLoading && (churchMedia.data ?? []).length === 0 && (
                <EmptyState
                  title="Nothing shared yet"
                  description="Your church hasn't added music or sermons to Nuru Faith yet."
                />
              )}
              <div className="space-y-2">
                {(churchMedia.data ?? []).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => playCatalog(m)}
                    className="nuru-card flex w-full items-center gap-3 p-3 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{m.title}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {m.creator_name}
                      </span>
                    </span>
                    <Play className="h-4 w-4 text-leaf" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <div className="px-4 pt-6">
        <Link to="/podcasts" className="nuru-card block p-4 text-sm font-semibold">
          Podcasts & sermons →
        </Link>
      </div>

      {selectedMedia && (
        <MediaPlayback item={selectedMedia} onClose={() => setSelectedMedia(null)} />
      )}
      {nowPlaying && (
        <div className="fixed inset-x-0 bottom-0 z-50 md:inset-x-auto md:bottom-5 md:right-5 md:w-[420px] md:rounded-3xl md:border border-t border-border bg-surface/98 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
          <div className="mx-auto max-w-xl">
            <div className="flex items-start justify-between gap-3 pb-2">
              <p className="line-clamp-2 text-sm font-semibold">{nowPlaying.title}</p>
              <button
                type="button"
                onClick={() => setNowPlaying(null)}
                aria-label="Close player"
                className="rounded-full p-1.5 text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <YouTubePlayer
              title={nowPlaying.title}
              {...(nowPlaying.kind === "youtube-video"
                ? { videoId: nowPlaying.id }
                : { playlistId: nowPlaying.id })}
              autoplay
              muted={false}
            />
            <YouTubeNotice className="pt-2" />
            <MediaActions
              className="pt-2"
              title={nowPlaying.title}
              contextType="media"
              contextId={nowPlaying.id}
              shareUrl={
                nowPlaying.kind === "youtube-video"
                  ? `https://www.youtube.com/watch?v=${nowPlaying.id}`
                  : `https://www.youtube.com/playlist?list=${nowPlaying.id}`
              }
            />
          </div>
        </div>
      )}
    </AppShell>
  );
}

/** Audio hosted by the church or Nuru. */
function NuruAudioSection({
  tracks,
  loading,
  onPlay,
}: {
  tracks: {
    id: string;
    title: string;
    artist: string;
    audio_url: string | null;
    duration_seconds: number;
  }[];
  loading: boolean;
  onPlay: (item: MediaItem) => void;
}) {
  return (
    <section className="px-4 pt-6">
      <SectionHeader title="Nuru Audio" />
      {loading && <CardSkeleton count={3} height="h-16" />}
      {!loading && !tracks.length && (
        <EmptyState
          title="No Nuru Audio yet"
          description="Church-hosted audio will appear here when it is added."
        />
      )}
      <div className="space-y-2">
        {tracks.map((track) => (
          <button
            key={track.id}
            type="button"
            disabled={!track.audio_url}
            className="nuru-card flex w-full items-center gap-3 p-3 text-left disabled:opacity-50"
            onClick={() =>
              onPlay({
                id: track.id,
                source: "nuru_audio",
                external_id: track.id,
                title: track.title,
                description: null,
                thumbnail_url: null,
                media_type: "music",
                category: null,
                creator_name: track.artist,
                youtube_channel_id: null,
                church_id: null,
                audio_url: track.audio_url,
                duration_seconds: track.duration_seconds,
                scripture_ref: null,
                can_download: false,
                is_featured: false,
              })
            }
            aria-label={`Play ${track.title}`}
          >
            <IconTile icon={Music2} tone="cyan" size="lg" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{track.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{track.artist}</span>
            </span>
            <span className="text-xs text-muted-foreground">
              {duration(track.duration_seconds)}
            </span>
            <Play className="h-4 w-4" />
          </button>
        ))}
      </div>
    </section>
  );
}
