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
    <div role="tablist" aria-label="Reel feeds" className="flex items-center justify-center gap-5">
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
              "relative min-h-9 text-[13px] transition-opacity",
              active
                ? "font-semibold text-white opacity-100"
                : "font-medium text-white/70 opacity-80",
            )}
          >
            {feed}
            {active && (
              <span
                aria-hidden="true"
                className="absolute -bottom-0.5 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-white"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
