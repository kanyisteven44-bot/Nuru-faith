import type { ComponentType, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/** Compact themed hero banner used under a screen's sticky header. */
export function ScreenHero({ image, alt = "" }: { image: string; alt?: string }) {
  return (
    <div className="relative h-28 w-full overflow-hidden" aria-hidden={alt === ""}>
      <img src={image} alt={alt} loading="eager" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/25 via-background/60 to-background" />
    </div>
  );
}

export function SectionHeader({
  title,
  action,
  to,
  eyebrow,
}: {
  title: string;
  action?: string;
  to?: string;
  eyebrow?: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sand">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-[15px] font-semibold tracking-tight">{title}</h2>
      </div>
      {action &&
        (to ? (
          <Link
            to={to}
            className="shrink-0 text-xs font-semibold text-leaf transition-opacity hover:opacity-80"
          >
            {action}
          </Link>
        ) : (
          <span className="shrink-0 text-xs font-medium text-muted-foreground">{action}</span>
        ))}
    </div>
  );
}

/**
 * Segmented filter row. The selected pill fills with the soft blue accent;
 * the rest stay quiet outlines, as the boards draw them.
 */
export function PillTabs<T extends string>({
  tabs,
  value,
  onChange,
  labels,
  className,
}: {
  tabs: readonly T[];
  value: T;
  onChange: (t: T) => void;
  /** Optional display text per tab, when the value isn't what you want shown. */
  labels?: Partial<Record<T, string>>;
  className?: string;
}) {
  return (
    <div
      className={cn("no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1", className)}
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = tab === value;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab)}
            className={cn(
              "h-9 shrink-0 rounded-full border px-4 text-[13px] font-semibold transition-colors",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-ink-2 hover:bg-surface-2 hover:text-foreground",
            )}
          >
            {labels?.[tab] ?? tab}
          </button>
        );
      })}
    </div>
  );
}

/** Primary action — solid electric blue with a soft glow. */
export function GradientButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:brightness-105 active:scale-[0.99] disabled:opacity-50",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
        className,
      )}
    >
      {children}
    </button>
  );
}

export { GradientButton as PrimaryButton };

export function GhostButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2 disabled:opacity-50",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
    >
      {children}
    </button>
  );
}

const ICON_TONES = {
  brand: "border-primary/45 bg-primary/24 text-leaf",
  cyan: "border-leaf/40 bg-leaf/18 text-leaf",
  violet: "border-terra/40 bg-terra/20 text-terra-lt",
  growth: "border-growth/40 bg-growth/18 text-growth",
  warning: "border-warning/45 bg-warning/18 text-warning",
} as const;

/** Small rounded icon tile used across quick-access grids and list rows. */
export function IconTile({
  icon: Icon,
  tone = "brand",
  size = "md",
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  tone?: keyof typeof ICON_TONES;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const box = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10";
  const glyph = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-5.5 w-5.5" : "h-5 w-5";
  return (
    <span className={cn("nuru-icon-tile", ICON_TONES[tone], box, className)}>
      <Icon className={glyph} />
    </span>
  );
}

export function ProgressBar({
  value,
  className,
  label,
}: {
  value: number;
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={className}>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {label && <p className="mt-1 text-[11.5px] text-ink-3">{label}</p>}
    </div>
  );
}

export function Chip({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "growth" | "brand" | "violet";
}) {
  // Design system v2 badges: each status sits on its own soft ground.
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-[0.04em]",
        tone === "muted" && "bg-surface-2 text-ink-3",
        tone === "growth" && "bg-olive-soft text-leaf",
        tone === "brand" && "bg-olive-soft text-leaf",
        tone === "violet" && "bg-[#33280F] text-terra-lt",
      )}
    >
      {children}
    </span>
  );
}

export function CardSkeleton({ count = 3, height = "h-24" }: { count?: number; height?: string }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn("animate-pulse rounded-2xl border border-border bg-surface-2/70", height)}
        />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-6 py-10 text-center">
      <p className="font-display text-[17px] font-semibold">{title}</p>
      <p className="max-w-xs text-[13.5px] leading-snug text-ink-2">{description}</p>
      {action && <div className="pt-1.5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-10 text-center"
      role="alert"
    >
      <p className="font-display text-[17px] font-semibold">Something didn&apos;t load</p>
      <p className="max-w-xs text-[13.5px] leading-snug text-ink-2">
        {message ?? "Check your connection and try again."}
      </p>
      {onRetry && <GhostButton onClick={onRetry}>Try again</GhostButton>}
    </div>
  );
}

export function ComingSoon({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-warning uppercase">
      {label}
    </span>
  );
}
