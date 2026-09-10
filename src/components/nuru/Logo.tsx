import { cn } from "@/lib/utils";

export function NuruMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex items-center justify-center rounded-2xl nuru-gradient-bg nuru-glow-sm",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-1/2 w-1/2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
      >
        <path d="M12 3v18M6 9h12" strokeLinecap="round" className="text-primary-foreground" />
      </svg>
    </span>
  );
}

export function NuruLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <NuruMark className="h-9 w-9" />
      <span className="leading-tight">
        <span className="block font-display text-lg font-semibold">
          Nuru <span className="nuru-gradient-text">Faith</span>
        </span>
        {!compact && (
          <span className="block text-[11px] text-muted-foreground">
            Faith. Community. Purpose.
          </span>
        )}
      </span>
    </span>
  );
}
