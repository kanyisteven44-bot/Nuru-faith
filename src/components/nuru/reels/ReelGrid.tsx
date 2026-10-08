import { generatedAvatar } from "@/lib/avatar";
import { CoverImage } from "@/components/nuru/CoverImage";
import { videoArtwork } from "@/lib/mediaPlayback";
import { Play } from "lucide-react";
import { compactNumber } from "@/lib/format";
import { resolveMedia } from "@/lib/media";
import type { Reel } from "@/services/reels";

/** Full previews keep landscape videos readable instead of cropping faces into portrait tiles. */
export function ReelGrid({ items, onOpen }: { items: Reel[]; onOpen: (index: number) => void }) {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 pb-8 pt-2 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((reel, i) => {
        const artwork = videoArtwork(
          reel.source_type,
          reel.external_id,
          resolveMedia(reel.poster_url),
        );
        return (
          <button
            key={reel.id}
            type="button"
            onClick={() => onOpen(i)}
            aria-label={`Play ${reel.title || reel.caption || "Reel"} by ${reel.creator_name}`}
            className="group overflow-hidden rounded-[22px] border border-white/80 bg-white text-left shadow-[0_5px_18px_rgba(24,32,51,0.08)] transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]"
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-[#111D30]">
              <CoverImage
                src={artwork}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-xl"
              />
              <CoverImage
                src={artwork}
                alt=""
                loading={i < 4 ? "eager" : "lazy"}
                className="absolute inset-0 h-full w-full object-contain"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"
              />
              <span
                aria-hidden="true"
                className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/35 text-white shadow-sm backdrop-blur-md"
              >
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              </span>
              {reel.source_type !== "youtube" && reel.view_count > 0 && (
                <span className="absolute bottom-3 right-3 rounded-full bg-black/40 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-md">
                  {compactNumber(reel.view_count)} views
                </span>
              )}
            </div>
            <div className="space-y-2 px-3 py-3">
              <p className="line-clamp-2 min-h-10 text-[13px] font-semibold leading-5 text-[#182033]">
                {reel.title || reel.caption || "Faith-filled moment"}
              </p>
              <div className="flex min-w-0 items-center gap-1.5">
                <img
                  src={
                    reel.creator_avatar_url || generatedAvatar(reel.creator_name, reel.creator_name)
                  }
                  alt=""
                  loading="lazy"
                  className="h-5 w-5 shrink-0 rounded-full object-cover"
                />
                <p className="truncate text-[10px] font-medium text-[#7A8597]">
                  {reel.creator_name}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
