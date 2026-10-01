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
    <div className="nuru-gradient-bg rounded-full p-[3px] shadow-[0_4px_20px_-6px_rgba(126,108,255,0.6)]">
      <div
        role="tablist"
        aria-label="Reel feeds"
        className="flex items-center gap-1 rounded-full bg-[#051730] p-[3px]"
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
                  ? "nuru-gradient-bg font-bold text-[#05203f]"
                  : "font-semibold text-white/65",
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
