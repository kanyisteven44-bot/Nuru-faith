import { ListVideo, PlayCircle, Radio } from "lucide-react";
import type { YouTubeChannel, YouTubePlaylist, YouTubeVideo } from "@/services/youtubeService";
import { cn } from "@/lib/utils";

const FALLBACK = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'/>";

export function VideoCard({
  video,
  onSelect,
  className,
}: {
  video: YouTubeVideo;
  onSelect: (video: YouTubeVideo) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(video)}
      className={cn(
        "nuru-card w-full overflow-hidden text-left transition-transform active:scale-[0.98]",
        className,
      )}
    >
      <span className="relative block">
        <img
          src={video.thumbnail || FALLBACK}
          alt=""
          loading="lazy"
          width={480}
          height={270}
          className="aspect-video w-full object-cover"
        />
        <PlayCircle className="absolute bottom-2 left-2 h-7 w-7 text-primary-foreground drop-shadow" />
        {video.duration && (
          <span className="absolute bottom-2 right-2 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-medium">
            {video.duration}
          </span>
        )}
      </span>
      <span className="block p-3">
        <span className="line-clamp-2 block text-sm font-semibold">{video.title}</span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
          {video.channelName}
        </span>
      </span>
    </button>
  );
}

export function PlaylistCard({
  playlist,
  onSelect,
}: {
  playlist: YouTubePlaylist;
  onSelect: (playlist: YouTubePlaylist) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(playlist)}
      className="nuru-card w-full overflow-hidden text-left transition-transform active:scale-[0.98]"
    >
      <span className="relative block">
        <img
          src={playlist.thumbnail || FALLBACK}
          alt=""
          loading="lazy"
          width={480}
          height={270}
          className="aspect-video w-full object-cover"
        />
        <ListVideo className="absolute bottom-2 left-2 h-6 w-6 text-primary-foreground drop-shadow" />
      </span>
      <span className="block p-3">
        <span className="line-clamp-2 block text-sm font-semibold">{playlist.title}</span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
          {playlist.channelName}
          {playlist.itemCount != null ? ` · ${playlist.itemCount} videos` : ""}
        </span>
      </span>
    </button>
  );
}

export function ChannelCard({
  channel,
  onSelect,
}: {
  channel: YouTubeChannel;
  onSelect: (channel: YouTubeChannel) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(channel)}
      className="nuru-card flex w-full items-center gap-3 p-3 text-left"
    >
      <img
        src={channel.thumbnail || FALLBACK}
        alt=""
        loading="lazy"
        width={96}
        height={96}
        className="h-12 w-12 rounded-full object-cover"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{channel.title}</span>
        <span className="line-clamp-1 block text-[11px] text-muted-foreground">
          {channel.description}
        </span>
      </span>
      <Radio className="h-4 w-4 shrink-0 text-cyan" />
    </button>
  );
}
