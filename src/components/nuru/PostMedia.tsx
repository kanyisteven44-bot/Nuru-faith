import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, type RefObject } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveMedia } from "@/lib/media";
import { POST_MUSIC_BY_ID } from "@/lib/postMusic";
export function PostMedia({
  url,
  kind,
  compact = false,
  soundtrack = false,
  onPlayback,
}: {
  url: string;
  kind: string;
  compact?: boolean;
  soundtrack?: boolean;
  onPlayback?: (video: HTMLVideoElement, playing: boolean) => void;
}) {
  const path = url.startsWith("post:") ? url.slice(5) : null;
  const media = useQuery({
    queryKey: ["post-media", path],
    enabled: !!path,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("post-media")
        .createSignedUrl(path!, 3600);
      if (error || !data) throw new Error("Media unavailable");
      return data.signedUrl;
    },
    staleTime: 50 * 60 * 1000,
  });
  const source = path ? media.data : resolveMedia(url);
  if (!source)
    return (
      <button
        type="button"
        onClick={() => void media.refetch()}
        className="flex h-full min-h-24 w-full items-center justify-center rounded-xl bg-surface-2 text-xs"
      >
        {media.isError ? "Retry media" : "Loading…"}
      </button>
    );
  return kind === "video" ? (
    <video
      src={source}
      controls={!compact}
      muted={compact || soundtrack}
      onPlay={(e) => onPlayback?.(e.currentTarget, true)}
      onPause={(e) => onPlayback?.(e.currentTarget, false)}
      onSeeked={(e) => onPlayback?.(e.currentTarget, !e.currentTarget.paused)}
      onEnded={(e) => onPlayback?.(e.currentTarget, false)}
      playsInline
      preload="metadata"
      className={
        compact ? "h-full w-full object-cover" : "max-h-[70dvh] w-full rounded-2xl bg-black"
      }
    />
  ) : (
    <img
      src={source}
      alt="Shared photo"
      loading="lazy"
      className={
        compact ? "h-full w-full object-cover" : "max-h-[70dvh] w-full rounded-2xl object-contain"
      }
    />
  );
}
export function PostSoundtrack({
  id,
  start = 0,
  audioRef,
}: {
  id: string;
  start?: number;
  audioRef?: RefObject<HTMLAudioElement | null>;
}) {
  const track = POST_MUSIC_BY_ID.get(id);
  const localAudio = useRef<HTMLAudioElement>(null);
  const audio = audioRef ?? localAudio;
  useEffect(() => {
    if (audio.current && audio.current.readyState >= 1)
      audio.current.currentTime = Math.min(start, audio.current.duration || 0);
  }, [start, audio]);
  if (!track) return null;
  return (
    <div className="mt-3 rounded-xl bg-surface-2 p-3">
      <p className="mb-2 text-xs font-semibold">
        ♫ {track.title} · {track.artist}
      </p>
      <audio
        ref={audio}
        src={track.url}
        controls
        preload="none"
        className="h-9 w-full"
        onLoadedMetadata={() => {
          if (audio.current)
            audio.current.currentTime = Math.min(start, audio.current.duration || 0);
        }}
      />
      <p className="mt-2 text-[10px] text-muted-foreground">
        <a
          href="https://incompetech.com/music/royalty-free/music.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          Kevin MacLeod (incompetech.com)
        </a>{" "}
        ·{" "}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noopener noreferrer"
        >
          CC BY 4.0
        </a>
        {start > 0 ? ` · Playback starts at ${start}s` : ""}
      </p>
    </div>
  );
}

export function PostPresentation({
  url,
  kind,
  musicId,
  start = 0,
}: {
  url?: string | null;
  kind: string;
  musicId?: string | null;
  start?: number;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const hasMusic = !!musicId && POST_MUSIC_BY_ID.has(musicId);
  function sync(video: HTMLVideoElement, playing: boolean) {
    const player = audio.current;
    if (!player) return;
    if (player.readyState >= 1)
      player.currentTime = Math.min(start + video.currentTime, Math.max(0, player.duration - 0.05));
    if (playing) void player.play().catch(() => {});
    else player.pause();
  }
  return (
    <>
      {url && <PostMedia url={url} kind={kind} soundtrack={hasMusic} onPlayback={sync} />}{" "}
      {hasMusic && <PostSoundtrack id={musicId!} start={start} audioRef={audio} />}
    </>
  );
}
