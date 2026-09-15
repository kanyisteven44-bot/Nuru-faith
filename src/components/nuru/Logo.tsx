import { cn } from "@/lib/utils";

export function NuruMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden rounded-2xl nuru-glow-sm",
        className,
      )}
    >
      <img
        src="/icons/icon-192.png"
        alt=""
        width={192}
        height={192}
        className="h-full w-full object-cover"
      />
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
