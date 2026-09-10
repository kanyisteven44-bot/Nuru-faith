import { useState } from "react";
import { BookOpen, Music2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveMedia } from "@/lib/media";
import type { Reel } from "@/services/reels";

/** Creator, caption, Scripture chip, topic chip and the audio ticker. */
export function ReelCaption({
  reel,
  isFollowing,
  canFollow,
  onFollow,
  onOpenScripture,
}: {
  reel: Reel;
  isFollowing: boolean;
  canFollow: boolean;
  onFollow: () => void;
  onOpenScripture: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const caption = reel.caption ?? "";
  const long = caption.length > 110;
  const audio = reel.audio_title
    ? `${reel.audio_title}${reel.churches?.name ? ` · ${reel.churches.name}` : ""}`
    : `Original audio · ${reel.creator_handle}`;

  return (
    <div className="min-w-0 flex-1 text-white">
      <div className="flex items-center gap-2">
        <img
          src={resolveMedia(reel.creator_avatar_url)}
          alt=""
          width={32}
          height={32}
          loading="lazy"
          className="h-8 w-8 rounded-full object-cover"
        />
        <p className="min-w-0 truncate text-sm font-semibold drop-shadow">
          {reel.creator_name}
          {reel.churches?.verified && <span className="ml-1 text-cyan">✓</span>}
        </p>
        {canFollow && (
          <button
            type="button"
            onClick={onFollow}
            aria-label={
              isFollowing ? `Unfollow ${reel.creator_name}` : `Follow ${reel.creator_name}`
            }
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold transition-transform duration-150 active:scale-95",
              isFollowing ? "border-white/50 text-white/90" : "border-white bg-white/10 text-white",
            )}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
        )}
      </div>

      {caption && (
        <p className={cn("mt-2 text-sm leading-snug drop-shadow", !expanded && "line-clamp-2")}>
          {caption}
          {long && !expanded && (
            <button onClick={() => setExpanded(true)} className="ml-1 font-semibold text-white/70">
              more
            </button>
          )}
        </p>
      )}
      {long && expanded && (
        <button
          onClick={() => setExpanded(false)}
          className="text-[11px] font-semibold text-white/70"
        >
          Show less
        </button>
      )}

      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
        {reel.scripture_ref && (
          <button
            type="button"
            onClick={onOpenScripture}
            aria-label={`Open ${reel.scripture_ref}`}
            className="inline-flex items-center gap-1 rounded-full bg-primary/30 px-2.5 py-1 font-semibold text-cyan ring-1 ring-inset ring-cyan/30 backdrop-blur-md"
          >
            <BookOpen className="h-3 w-3" /> {reel.scripture_ref}
          </button>
        )}
        {reel.topic && (
          <span className="rounded-full bg-white/15 px-2.5 py-1 font-medium backdrop-blur-md">
            {reel.topic}
          </span>
        )}
      </div>

      <div className="mt-1.5 flex items-center gap-1.5 overflow-hidden text-[11px] text-white/80">
        <Music2 className="h-3 w-3 shrink-0" />
        <span className="nuru-ticker whitespace-nowrap">{audio}</span>
      </div>
    </div>
  );
}
