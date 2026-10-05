import { BookOpen, Hand, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "gradient" | "green" | "amber" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  gradient: "border border-[#77A9E9] bg-white/95 text-[#286FC8] shadow-[0_5px_14px_rgba(33,79,137,0.2)]",
  green: "border border-white/80 bg-white/95 text-[#182033] shadow-[0_5px_14px_rgba(24,32,51,0.18)]",
  amber: "border border-white/80 bg-white/95 text-[#182033] shadow-[0_5px_14px_rgba(24,32,51,0.18)]",
  neutral: "border border-white/80 bg-white/95 text-[#182033] shadow-[0_5px_14px_rgba(24,32,51,0.18)]",
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
        "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-2xl px-3 text-[11px] font-semibold backdrop-blur-md transition-transform duration-150 active:scale-95 disabled:opacity-40 motion-reduce:active:scale-100",
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
    <div className="no-scrollbar grid grid-cols-4 gap-2 overflow-x-auto pb-1">
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
