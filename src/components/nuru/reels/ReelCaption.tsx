import { useState } from "react";
import { BadgeCheck, BookOpen, Music2 } from "lucide-react";
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
          className="h-8 w-8 rounded-full object-cover ring-2 ring-primary"
        />
        <p className="flex min-w-0 items-center gap-1 truncate text-sm font-semibold drop-shadow">
          <span className="truncate">{reel.creator_name}</span>
          {reel.churches?.verified && (
            <BadgeCheck className="h-3.5 w-3.5 shrink-0 fill-cyan text-[#05203f]" />
          )}
        </p>
        {canFollow && (
          <button
            type="button"
            onClick={onFollow}
            aria-label={
              isFollowing ? `Unfollow ${reel.creator_name}` : `Follow ${reel.creator_name}`
            }
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-transform duration-150 active:scale-95",
              isFollowing
                ? "border border-white/50 text-white/90"
                : "nuru-gradient-bg text-primary-foreground",
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
