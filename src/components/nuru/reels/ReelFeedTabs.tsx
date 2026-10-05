import { cn } from "@/lib/utils";
import type { ReelFeed } from "@/services/reels";

export const REEL_FEEDS: readonly ReelFeed[] = ["Following", "For You", "My Church"] as const;

/** Floating, header-less feed switcher that sits over the video. */
export function ReelFeedTabs({
  value,
  onChange,
}: {
  value: ReelFeed;
  onChange: (f: ReelFeed) => void;
}) {
  return (
    <div className="rounded-full border border-white/80 bg-[#EDF1F7] p-1 shadow-[6px_6px_15px_rgba(171,181,197,0.3),-6px_-6px_15px_rgba(255,255,255,0.95)]">
      <div
        role="tablist"
        aria-label="Reel feeds"
        className="flex items-center gap-1 rounded-full"
      >
        {REEL_FEEDS.map((feed) => {
          const active = feed === value;
          return (
            <button
              key={feed}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(feed)}
              className={cn(
                "min-h-9 rounded-full px-3.5 text-[12px] transition-colors",
                active
                  ? "bg-white font-bold text-[#182033] shadow-[0_5px_12px_rgba(82,96,119,0.16)]"
                  : "font-semibold text-[#778296]",
              )}
            >
              {feed}
            </button>
          );
        })}
      </div>
    </div>
  );
}
