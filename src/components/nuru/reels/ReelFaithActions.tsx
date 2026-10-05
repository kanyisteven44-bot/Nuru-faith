import { BookOpen, Hand, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "gradient" | "green" | "amber" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  gradient: "nuru-gradient-bg text-primary-foreground",
  green: "bg-growth/15 text-growth ring-1 ring-inset ring-growth/45",
  amber: "bg-warning/15 text-warning ring-1 ring-inset ring-warning/45",
  neutral: "bg-white/15 text-white",
};

function Pill({
  icon,
  label,
  onClick,
  disabled,
  tone = "neutral",
  aria,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: Tone;
  aria: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={aria}
      className={cn(
        "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold backdrop-blur-md transition-transform duration-150 active:scale-95 disabled:opacity-40 motion-reduce:active:scale-100",
        TONE_CLASSES[tone],
      )}
    >
      {icon}
      {label}
    </button>
  );
}

/** Nuru's differentiator: Read / Pray / Ask AI / Discuss as one compact row. */
export function ReelFaithActions({
  hasScripture,
  onRead,
  onPray,
  onAskAi,
  onDiscuss,
}: {
  hasScripture: boolean;
  onRead: () => void;
  onPray: () => void;
  onAskAi: () => void;
  onDiscuss: () => void;
}) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
      <Pill
        icon={<BookOpen className="h-3.5 w-3.5" />}
        label="Read"
        onClick={onRead}
        disabled={!hasScripture}
        tone="amber"
        aria="Read the Scripture for this Reel"
      />
      <Pill
        icon={<Hand className="h-3.5 w-3.5" />}
        label="Pray"
        onClick={onPray}
        tone="green"
        aria="Pray about this Reel"
      />
      <Pill
        icon={<Sparkles className="h-3.5 w-3.5" />}
        label="Ask AI"
        onClick={onAskAi}
        tone="gradient"
        aria="Ask Nuru AI about this Reel"
      />
      <Pill
        icon={<Users className="h-3.5 w-3.5" />}
        label="Discuss"
        onClick={onDiscuss}
        aria="Discuss this Reel with the community"
      />
    </div>
  );
}
