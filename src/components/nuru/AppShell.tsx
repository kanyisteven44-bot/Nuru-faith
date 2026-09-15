import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, CalendarDays, Home, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/community", label: "Community", icon: Users },
  { to: "/bible", label: "Bible", icon: BookOpen },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({
  children,
  wide = false,
  flush = false,
}: {
  children: ReactNode;
  /** "xl" is the Home dashboard's three-column ecosystem layout; true is the 5xl default. */
  wide?: boolean | "xl";
  /** Full-bleed screens (Reels) manage their own height and skip the bottom padding. */
  flush?: boolean;
}) {
  const maxWidth = wide === "xl" ? "max-w-7xl" : wide ? "max-w-5xl" : "max-w-xl";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className={cn("relative bg-background", flush ? "h-dvh overflow-hidden" : "min-h-dvh")}>
      {!flush && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-0 z-0 h-72 bg-[radial-gradient(70%_100%_at_50%_0%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_75%)]"
        />
      )}
      <main className={cn("relative z-10 mx-auto w-full", flush ? "" : "pb-28", maxWidth)}>
        {children}
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-cyan/25 bg-[#001a3d]/95 shadow-[0_-10px_30px_-24px_var(--brand-cyan)] backdrop-blur-xl"
      >
        <ul
          className={cn(
            "mx-auto grid grid-cols-5 items-end px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5",
            maxWidth,
          )}
        >
          {NAV.map((item) => (
            <NavItem key={item.to} {...item} active={pathname.startsWith(item.to)} />
          ))}
        </ul>
      </nav>
    </div>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <li>
      <Link
        to={to}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-12 flex-col items-center justify-center gap-1 rounded-md text-[10px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan",
          active ? "text-primary" : "text-muted-foreground hover:text-secondary-foreground",
        )}
      >
        <span className="relative">
          <Icon
            className={cn("h-5 w-5", active && "drop-shadow-[0_0_10px_var(--primary)]")}
            strokeWidth={active ? 2.4 : 1.8}
          />
          {active && (
            <span className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
          )}
        </span>
        {label}
      </Link>
    </li>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border-strong bg-background/92 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-[0_8px_24px_-20px_var(--brand-cyan)] backdrop-blur-xl">
      <div className="min-w-0">
        <h1 className="truncate font-display text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </header>
  );
}
