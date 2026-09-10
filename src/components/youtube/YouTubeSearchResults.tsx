import { useQuery } from "@tanstack/react-query";
import {
  youtubeQuery,
  youtubeErrorMessage,
  type YouTubeChannel,
  type YouTubePlaylist,
  type YouTubeVideo,
} from "@/services/youtubeService";
import { CardSkeleton, EmptyState, SectionHeader } from "@/components/nuru/Primitives";
import { ChannelCard, PlaylistCard, VideoCard } from "./MediaCards";

/** Grouped YouTube search results: Videos, Playlists, Channels. */
export function YouTubeSearchResults({
  query,
  onSelectVideo,
  onSelectPlaylist,
  onSelectChannel,
}: {
  query: string;
  onSelectVideo: (video: YouTubeVideo) => void;
  onSelectPlaylist: (playlist: YouTubePlaylist) => void;
  onSelectChannel?: (channel: YouTubeChannel) => void;
}) {
  const videos = useQuery(youtubeQuery({ query, type: "video", maxResults: 12 }));
  const playlists = useQuery(youtubeQuery({ query, type: "playlist", maxResults: 8 }));
  const channels = useQuery(youtubeQuery({ query, type: "channel", maxResults: 6 }));

  if (!query.trim()) return null;

  const loading = videos.isLoading || playlists.isLoading || channels.isLoading;
  const message = youtubeErrorMessage(
    videos.data?.error ?? playlists.data?.error ?? channels.data?.error,
  );

  if (loading) {
    return (
      <div className="px-4 pt-4">
        <CardSkeleton count={3} height="h-40" />
      </div>
    );
  }

  if (message) {
    return (
      <div className="px-4 pt-4">
        <EmptyState title="Online media unavailable" description={message} />
      </div>
    );
  }

  const videoList = videos.data?.videos ?? [];
  const playlistList = playlists.data?.playlists ?? [];
  const channelList = channels.data?.channels ?? [];

  if (videoList.length + playlistList.length + channelList.length === 0) {
    return (
      <div className="px-4 pt-4">
        <EmptyState title="Nothing matched" description="Try a different word or topic." />
      </div>
    );
  }

  return (
    <div className="space-y-5 pt-4">
      {videoList.length > 0 && (
        <section className="px-4">
          <SectionHeader title="Videos" />
          <div className="grid gap-3 sm:grid-cols-2">
            {videoList.map((v) => (
              <VideoCard key={v.youtubeVideoId} video={v} onSelect={onSelectVideo} />
            ))}
          </div>
        </section>
      )}

      {playlistList.length > 0 && (
        <section className="px-4">
          <SectionHeader title="Playlists" />
          <div className="grid gap-3 sm:grid-cols-2">
            {playlistList.map((p) => (
              <PlaylistCard key={p.youtubePlaylistId} playlist={p} onSelect={onSelectPlaylist} />
            ))}
          </div>
        </section>
      )}

      {channelList.length > 0 && onSelectChannel && (
        <section className="px-4">
          <SectionHeader title="Channels" />
          <div className="space-y-2">
            {channelList.map((c) => (
              <ChannelCard key={c.youtubeChannelId} channel={c} onSelect={onSelectChannel} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
