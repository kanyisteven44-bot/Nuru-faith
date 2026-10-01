import { Link } from "@tanstack/react-router";
import { Bookmark, MessageCircle, Share2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useShareSheet } from "@/hooks/useShareSheet";

/**
 * The one interaction row used by every piece of content in Nuru Faith:
 * Save · Share · Ask AI · Discuss.
 */
export function MediaActions({
  title,
  contextType,
  contextId,
  shareUrl,
  saved,
  onToggleSave,
  className,
}: {
  title: string;
  contextType: string;
  contextId: string;
  shareUrl?: string;
  saved?: boolean;
  onToggleSave?: () => void;
  className?: string;
}) {
  const shareSheet = useShareSheet();

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {onToggleSave && (
        <button
          type="button"
          onClick={onToggleSave}
          aria-pressed={saved}
          className={cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium",
            saved ? "bg-surface-2 text-cyan" : "text-secondary-foreground",
          )}
        >
          <Bookmark className={cn("h-3.5 w-3.5", saved && "fill-current")} />
          {saved ? "Saved" : "Save"}
        </button>
      )}
      <button
        type="button"
        onClick={() =>
          void shareSheet.share({
            title,
            url: shareUrl ?? (typeof window !== "undefined" ? window.location.href : ""),
          })
        }
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-secondary-foreground"
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
      </button>
      {shareSheet.node}
      <Link
        to="/ai"
        search={{ contextType, contextId, contextLabel: title }}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg nuru-gradient-bg px-3 text-xs font-semibold text-primary-foreground"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Ask AI
      </Link>
      <Link
        to="/community"
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-secondary-foreground"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Discuss
      </Link>
    </div>
  );
}
