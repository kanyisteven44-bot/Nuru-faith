import { useState } from "react";
import { cn } from "@/lib/utils";

/** The archive edition's cover, never unrelated fallback photography. */
export function BookCover({
  id,
  title,
  author,
  className = "",
}: {
  id: number;
  title: string;
  author: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={cn(
        "relative aspect-[2/3] shrink-0 overflow-hidden rounded-r-xl border border-border bg-surface-2 shadow-md",
        className,
      )}
    >
      {failed ? (
        <div className="flex h-full flex-col justify-between border-l-4 border-primary/40 p-3">
          <span className="text-[9px] font-semibold tracking-widest text-primary uppercase">
            Nuru reading room
          </span>
          <span className="font-display text-sm font-semibold leading-snug">{title}</span>
          <span className="text-[10px] text-ink-2">
            {author}
            <span className="mt-1 block">Cover unavailable</span>
          </span>
        </div>
      ) : (
        <img
          src={`https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`}
          alt={`Archive edition cover of ${title}`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
