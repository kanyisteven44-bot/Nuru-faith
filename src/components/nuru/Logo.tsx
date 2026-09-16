import { cn } from "@/lib/utils";

/**
 * The Nuru Faith mark: a glowing cross standing inside an arch, drawn as SVG so
 * it stays crisp at every size and picks up the brand cyan from the theme.
 */
export function NuruMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden rounded-2xl bg-[#040d24] nuru-glow-sm",
        className,
      )}
    >
      <svg viewBox="0 0 64 64" className="h-full w-full" role="presentation">
        <defs>
          <linearGradient
            id="nuru-arch"
            x1="32"
            y1="6"
            x2="32"
            y2="58"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#7fe7ff" />
            <stop offset="1" stopColor="#168cff" />
          </linearGradient>
          <linearGradient
            id="nuru-cross"
            x1="32"
            y1="16"
            x2="32"
            y2="48"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#8ad9ff" />
          </linearGradient>
          <filter id="nuru-bloom" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* arch: straight sides rising into a rounded crown */}
        <path
          d="M17 52V29a15 15 0 0 1 30 0v23"
          fill="none"
          stroke="url(#nuru-arch)"
          strokeWidth="4"
          strokeLinecap="round"
          filter="url(#nuru-bloom)"
        />

        {/* cross standing inside the arch */}
        <g
          stroke="url(#nuru-cross)"
          strokeWidth="4.5"
          strokeLinecap="round"
          filter="url(#nuru-bloom)"
        >
          <line x1="32" y1="20" x2="32" y2="45" />
          <line x1="23" y1="31" x2="41" y2="31" />
        </g>
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
          Nuru <span className="text-cyan">Faith</span>
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
