import { Play } from "lucide-react";
import { compactNumber } from "@/lib/format";
import { resolveMedia } from "@/lib/media";
import type { Reel } from "@/services/reels";

/** Browse Reels as a shelf of thumbnails; tapping one opens the full-screen feed at that index. */
export function ReelGrid({ items, onOpen }: { items: Reel[]; onOpen: (index: number) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 px-3 pb-6 pt-2">
      {items.map((reel, i) => (
        <button
          key={reel.id}
          type="button"
          onClick={() => onOpen(i)}
          aria-label={`Play Reel by ${reel.creator_name}`}
          className="group relative aspect-[9/14] overflow-hidden rounded-2xl bg-surface-2 text-left transition-transform duration-150 active:scale-[0.97]"
        >
          {reel.poster_url ? (
            <img
              src={resolveMedia(reel.poster_url)}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-surface-2 via-surface to-background" />
          )}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/35 to-transparent"
          />
          <Play
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 fill-white/85 text-white/85"
          />
          <p className="absolute inset-x-2 bottom-6 truncate text-[11px] font-semibold text-white">
            {reel.caption ?? reel.title ?? reel.creator_name}
          </p>
          <p className="absolute inset-x-2 bottom-2 truncate text-[9.5px] text-white/70">
            {reel.creator_name} &middot; {compactNumber(reel.view_count)}
          </p>
        </button>
      ))}
    </div>
  );
}
