import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Music2, Pause, Play, Search, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { resolveMedia } from "@/lib/media";
import { duration } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { fetchPlaylists, fetchProfile, fetchTracks } from "@/services/content";
import { fetchMediaItems, fetchMediaPlaylists, fetchMediaSources } from "@/services/media";
import type { YouTubePlaylist, YouTubeVideo } from "@/services/youtubeService";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import {
  CardSkeleton,
  EmptyState,
  IconTile,
  PillTabs,
  SectionHeader,
} from "@/components/nuru/Primitives";
import { YouTubePlayer, YouTubeNotice } from "@/components/youtube/YouTubePlayer";
import { YouTubeSearchResults } from "@/components/youtube/YouTubeSearchResults";
import { MediaCategoryRail } from "@/components/youtube/MediaCategoryRail";
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

const TABS = ["For You", "Worship", "Playlists", "Artists", "My Church", "YouTube"] as const;
type Tab = (typeof TABS)[number];

type NowPlaying =
  | { kind: "youtube-video"; id: string; title: string }
  | { kind: "youtube-playlist"; id: string; title: string };

function MusicScreen() {
  const { userId } = useAuth();
  const [tab, setTab] = useState<Tab>("For You");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);

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

  const playlists = useQuery({ queryKey: ["playlists"], queryFn: fetchPlaylists });
  const tracks = useQuery({ queryKey: ["tracks"], queryFn: fetchTracks });
  const curatedPlaylists = useQuery({
    queryKey: ["media-playlists"],
    queryFn: () => fetchMediaPlaylists(),
  });
  const artists = useQuery({
    queryKey: ["media-sources", "artist"],
    queryFn: () => fetchMediaSources({ sourceType: "youtube" }),
  });
  const churchMedia = useQuery({
    queryKey: ["media-items", "church", churchId],
    queryFn: () => fetchMediaItems({ churchId: churchId! }),
    enabled: !!churchId,
  });

  const openVideo = (v: YouTubeVideo) =>
    setNowPlaying({ kind: "youtube-video", id: v.youtubeVideoId, title: v.title });
  const openPlaylist = (p: YouTubePlaylist) =>
    setNowPlaying({ kind: "youtube-playlist", id: p.youtubePlaylistId, title: p.title });

  return (
    <AppShell>
      <ScreenHeader title="Music & media" subtitle="Worship, teaching and sound for your week" />

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

      {debounced.trim() ? (
        <YouTubeSearchResults
          query={debounced}
          onSelectVideo={openVideo}
          onSelectPlaylist={openPlaylist}
        />
      ) : (
        <>
          {tab === "For You" && (
            <>
              <MediaCategoryRail
                title="Worship right now"
                query="christian worship live"
                onSelect={openVideo}
              />
              <MediaCategoryRail
                title="Songs for hard days"
                query="christian worship peace anxiety"
                onSelect={openVideo}
              />
              <MediaCategoryRail
                title="Praise & celebration"
                query="gospel praise songs"
                onSelect={openVideo}
              />
              <NuruAudioSection tracks={tracks.data ?? []} loading={tracks.isLoading} />
            </>
          )}

          {tab === "Worship" && (
            <>
              <MediaCategoryRail
                title="Worship sets"
                query="worship set full"
                onSelect={openVideo}
              />
              <MediaCategoryRail title="Hymns" query="christian hymns" onSelect={openVideo} />
              <MediaCategoryRail
                title="Acoustic worship"
                query="acoustic worship christian"
                onSelect={openVideo}
              />
            </>
          )}

          {tab === "Playlists" && (
            <section className="pt-3">
              <div className="px-4">
                <SectionHeader title="Nuru playlists" />
              </div>
              <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
                {playlists.isLoading && <CardSkeleton count={2} height="h-40" />}
                {(playlists.data ?? []).map((p) => (
                  <article key={p.id} className="w-40 shrink-0">
                    <div className="relative">
                      <img
                        src={resolveMedia(p.cover_url)}
                        alt=""
                        width={320}
                        height={320}
                        loading="lazy"
                        className="h-40 w-40 rounded-2xl border border-border object-cover"
                      />
                      <span className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground nuru-glow-sm">
                        <Play className="h-4 w-4 fill-current" />
                      </span>
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold">{p.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{p.description}</p>
                  </article>
                ))}
              </div>

              <div className="px-4 pt-5">
                <SectionHeader title="Curated video playlists" />
                {curatedPlaylists.isLoading && <CardSkeleton count={2} height="h-20" />}
                {!curatedPlaylists.isLoading && (curatedPlaylists.data ?? []).length === 0 && (
                  <EmptyState
                    title="No curated playlists yet"
                    description="Your church and the Nuru team can add approved playlists here."
                  />
                )}
                <div className="space-y-2">
                  {(curatedPlaylists.data ?? []).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        p.youtube_playlist_id
                          ? setNowPlaying({
                              kind: "youtube-playlist",
                              id: p.youtube_playlist_id,
                              title: p.title,
                            })
                          : toast("This playlist has no video source yet")
                      }
                      className="nuru-card flex w-full items-center gap-3 p-3 text-left"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{p.title}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {p.description}
                        </span>
                      </span>
                      <Play className="h-4 w-4 text-cyan" />
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {tab === "Artists" && (
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
                  <div key={a.id} className="nuru-card p-3">
                    <p className="text-sm font-semibold">{a.name}</p>
                    <p className="text-[11px] text-muted-foreground">{a.description}</p>
                  </div>
                ))}
              </div>
              {(artists.data ?? []).length > 0 && (
                <div className="pt-3">
                  {(artists.data ?? [])
                    .filter((a) => a.youtube_channel_id)
                    .slice(0, 3)
                    .map((a) => (
                      <MediaCategoryRail
                        key={a.id}
                        title={a.name}
                        channelId={a.youtube_channel_id!}
                        onSelect={openVideo}
                      />
                    ))}
                </div>
              )}
            </section>
          )}

          {tab === "My Church" && (
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
                    onClick={() =>
                      m.source === "youtube"
                        ? setNowPlaying({
                            kind: "youtube-video",
                            id: m.external_id,
                            title: m.title,
                          })
                        : toast("This item isn't playable yet")
                    }
                    className="nuru-card flex w-full items-center gap-3 p-3 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{m.title}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {m.creator_name}
                      </span>
                    </span>
                    <Play className="h-4 w-4 text-cyan" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {tab === "YouTube" && (
            <section className="px-4 pt-3">
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
                />
                <MediaCategoryRail
                  title="Testimonies"
                  query="christian testimony story"
                  onSelect={openVideo}
                />
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

      {nowPlaying && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/98 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
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

/** Rights-cleared audio hosted by Nuru Faith itself. */
function NuruAudioSection({
  tracks,
  loading,
}: {
  tracks: {
    id: string;
    title: string;
    artist: string;
    audio_url: string | null;
    duration_seconds: number;
  }[];
  loading: boolean;
}) {
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const current = useMemo(() => tracks.find((t) => t.id === playing) ?? null, [tracks, playing]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (current?.audio_url) {
      audio.src = resolveMedia(current.audio_url);
      void audio.play().catch(() => setPlaying(null));
    } else {
      audio.pause();
    }
  }, [current]);

  return (
    <section className="px-4 pt-6">
      <SectionHeader title="Nuru Audio" />
      <p className="pb-2 text-xs text-muted-foreground">
        Rights-cleared worship we host ourselves — these can be saved for offline listening.
      </p>
      {loading && <CardSkeleton count={3} height="h-16" />}
      {!loading && tracks.length === 0 && (
        <EmptyState
          title="No Nuru Audio yet"
          description="Licensed worship sets are being added."
        />
      )}
      <div className="space-y-2">
        {tracks.map((t) => {
          const isPlaying = playing === t.id;
          return (
            <div key={t.id} className="nuru-card flex items-center gap-3 p-3">
              <IconTile icon={Music2} tone="cyan" size="lg" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{t.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{t.artist}</span>
              </span>
              <span className="text-[11px] text-muted-foreground">
                {duration(t.duration_seconds)}
              </span>
              <button
                aria-label={isPlaying ? `Pause ${t.title}` : `Play ${t.title}`}
                onClick={() => {
                  if (!t.audio_url) {
                    toast("This track isn't licensed for streaming yet");
                    return;
                  }
                  setPlaying(isPlaying ? null : t.id);
                }}
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-strong transition-colors",
                  isPlaying
                    ? "border-primary bg-primary/15 text-cyan"
                    : "text-secondary-foreground",
                )}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
            </div>
          );
        })}
      </div>
      <audio ref={audioRef} onEnded={() => setPlaying(null)} className="hidden" />
    </section>
  );
}
