import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Compass, Home, Plus, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { fetchMyRoles } from "@/services/content";
import { CreateSheet } from "./CreateSheet";

const NAV = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/community", label: "Community", icon: Users },
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
  const [createOpen, setCreateOpen] = useState(false);
  const { userId } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data: roles = [] } = useQuery({
    queryKey: ["roles", userId],
    queryFn: () => fetchMyRoles(userId!),
    enabled: !!userId,
  });
  const canPublishEvents = roles.some((r) => r.role === "church_admin" || r.role === "super_admin");

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
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 backdrop-blur-xl"
      >
        <ul
          className={cn(
            "mx-auto grid grid-cols-5 items-end px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5",
            maxWidth,
          )}
        >
          {NAV.slice(0, 2).map((item) => (
            <NavItem key={item.to} {...item} active={pathname.startsWith(item.to)} />
          ))}
          <li className="flex justify-center">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              aria-label="Create"
              className="-mt-7 flex h-14 w-14 items-center justify-center rounded-2xl nuru-gradient-bg nuru-glow ring-4 ring-background transition-transform active:scale-95"
            >
              <Plus className="h-6 w-6 text-primary-foreground" />
            </button>
          </li>
          {NAV.slice(2).map((item) => (
            <NavItem key={item.to} {...item} active={pathname.startsWith(item.to)} />
          ))}
        </ul>
      </nav>

      <CreateSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        userId={userId}
        canPublishEvents={canPublishEvents}
      />
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
          "flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold transition-colors",
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
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
      <div className="min-w-0">
        <h1 className="truncate font-display text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </header>
  );
}
