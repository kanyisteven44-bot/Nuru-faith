import { Flag, HelpCircle, Link2, Pencil, Trash2, ThumbsDown } from "lucide-react";
import type { Reel } from "@/services/reels";
import { Sheet } from "./Sheet";

export type WhyReason = string;

function Row({
  icon,
  label,
  description,
  onClick,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2"
    >
      <span
        className={destructive ? "mt-0.5 text-destructive" : "mt-0.5 text-secondary-foreground"}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={
            destructive ? "block text-sm font-medium text-destructive" : "block text-sm font-medium"
          }
        >
          {label}
        </span>
        {description && <span className="block text-xs text-muted-foreground">{description}</span>}
      </span>
    </button>
  );
}

export function ReelMoreMenu({
  reel,
  isMine,
  onClose,
  onNotInterested,
  onReport,
  onCopyLink,
  onWhy,
  onEdit,
  onDelete,
}: {
  reel: Reel;
  isMine: boolean;
  onClose: () => void;
  onNotInterested: () => void;
  onReport: () => void;
  onCopyLink: () => void;
  onWhy: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <Sheet label="Reel options" onClose={onClose} height="max-h-[70dvh]">
      <div className="pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Row
          icon={<ThumbsDown className="h-4.5 w-4.5" />}
          label="Not interested"
          description="Show me fewer Reels like this"
          onClick={onNotInterested}
        />
        <Row
          icon={<HelpCircle className="h-4.5 w-4.5" />}
          label="Why am I seeing this?"
          onClick={onWhy}
        />
        <Row icon={<Link2 className="h-4.5 w-4.5" />} label="Copy link" onClick={onCopyLink} />
        <Row
          icon={<Flag className="h-4.5 w-4.5" />}
          label="Report"
          description="Tell moderators something is wrong here"
          onClick={onReport}
        />
        {isMine && onEdit && (
          <Row icon={<Pencil className="h-4.5 w-4.5" />} label="Edit caption" onClick={onEdit} />
        )}
        {isMine && onDelete && (
          <Row
            icon={<Trash2 className="h-4.5 w-4.5" />}
            label="Delete Reel"
            onClick={onDelete}
            destructive
          />
        )}
        <p className="px-4 pt-2 text-[11px] text-muted-foreground">{reel.creator_handle}</p>
      </div>
    </Sheet>
  );
}

/** Honest personalisation reasons — no invented signals. */
export function ReelWhySheet({ reasons, onClose }: { reasons: WhyReason[]; onClose: () => void }) {
  return (
    <Sheet
      label="Why am I seeing this Reel"
      onClose={onClose}
      height="max-h-[55dvh]"
      title={<h2 className="font-display text-base font-semibold">Why am I seeing this?</h2>}
    >
      <ul className="space-y-2 px-4 pb-6">
        {reasons.map((r) => (
          <li
            key={r}
            className="rounded-2xl bg-surface-2 px-3 py-2.5 text-sm text-secondary-foreground"
          >
            {r}
          </li>
        ))}
        <li className="pt-1 text-[11px] text-muted-foreground">
          Your feed is built from the topics you chose, your church and the people you follow —
          never from how long you stare at the screen.
        </li>
      </ul>
    </Sheet>
  );
}
