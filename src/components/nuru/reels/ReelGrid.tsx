import { CoverImage } from "@/components/nuru/CoverImage";
import { videoArtwork } from "@/lib/mediaPlayback";
import { Play } from "lucide-react";
import { compactNumber } from "@/lib/format";
import { resolveMedia } from "@/lib/media";
import type { Reel } from "@/services/reels";

/** Browse Reels as a shelf of thumbnails; tapping one opens the full-screen feed at that index. */
export function ReelGrid({ items, onOpen }: { items: Reel[]; onOpen: (index: number) => void }) {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 pb-6 pt-2 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((reel, i) => (
        <button
          key={reel.id}
          type="button"
          onClick={() => onOpen(i)}
          aria-label={`Play Reel by ${reel.creator_name}`}
          className="group relative aspect-[9/14] border border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary overflow-hidden rounded-2xl bg-surface-2 text-left transition-transform duration-150 active:scale-[0.97]"
        >
          {reel.poster_url || reel.external_id ? (
            <CoverImage
              src={videoArtwork(reel.source_type, reel.external_id, resolveMedia(reel.poster_url))}
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
          <p className="absolute inset-x-3 bottom-9 line-clamp-2 text-sm font-semibold text-white">
            {reel.caption ?? reel.title ?? reel.creator_name}
          </p>
          <p className="absolute inset-x-3 bottom-3 truncate text-xs text-white/70">
            {reel.creator_name} &middot; {compactNumber(reel.view_count)}
          </p>
        </button>
      ))}
    </div>
  );
}
