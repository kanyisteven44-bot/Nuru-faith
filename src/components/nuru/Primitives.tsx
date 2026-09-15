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
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan/80">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-[15px] font-semibold tracking-tight">{title}</h2>
      </div>
      {action &&
        (to ? (
          <Link
            to={to}
            className="shrink-0 text-xs font-semibold text-cyan transition-opacity hover:opacity-80"
          >
            {action}
          </Link>
        ) : (
          <span className="shrink-0 text-xs font-medium text-muted-foreground">{action}</span>
        ))}
    </div>
  );
}

/** Segmented filter row — bright blue active pill, quiet outlined rest. */
export function PillTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: readonly T[];
  value: T;
  onChange: (t: T) => void;
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
              "min-h-9 shrink-0 rounded-lg px-4 text-[13px] font-semibold transition-all",
              active
                ? "bg-primary text-primary-foreground nuru-glow-sm"
                : "border border-border bg-surface-2/60 text-muted-foreground hover:text-secondary-foreground",
            )}
          >
            {tab}
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
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-cyan/30 bg-primary px-5 text-sm font-semibold text-primary-foreground nuru-glow-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none",
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
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface-2 px-5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

const ICON_TONES = {
  brand: "border-primary/45 bg-primary/24 text-cyan",
  cyan: "border-cyan/40 bg-cyan/18 text-cyan",
  violet: "border-violet/40 bg-violet/20 text-violet",
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
          className="h-full rounded-full bg-gradient-to-r from-cyan to-primary transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {label && <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>}
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
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
        tone === "muted" && "bg-surface-2 text-muted-foreground",
        tone === "growth" && "bg-growth/15 text-growth",
        tone === "brand" && "bg-primary/18 text-cyan ring-1 ring-inset ring-primary/25",
        tone === "violet" && "bg-violet/15 text-violet",
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
    <div className="nuru-card flex flex-col items-center gap-2 px-6 py-10 text-center">
      <p className="font-display text-base font-semibold">{title}</p>
      <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="nuru-card flex flex-col items-center gap-3 px-6 py-10 text-center" role="alert">
      <p className="font-display text-base font-semibold">Something didn't load</p>
      <p className="max-w-xs text-sm text-muted-foreground">
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
