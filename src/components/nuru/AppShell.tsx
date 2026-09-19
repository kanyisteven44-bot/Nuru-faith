import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bell, Compass, Home, Plus, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { fetchProfile } from "@/services/content";
import { generatedAvatar } from "@/lib/avatar";
import { NuruMark } from "./Logo";

/**
 * Two nav items sit either side of the raised create button, matching the
 * app design: Home, Explore, (+), Community, Profile.
 */
const NAV_LEFT = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
] as const;

const NAV_RIGHT = [
  { to: "/community", label: "Community", icon: Users },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({
  children,
  wide = false,
  flush = false,
  hideNav = false,
}: {
  children: ReactNode;
  wide?: boolean | "xl";
  /** Full-bleed screens (Reels) manage their own height and skip the bottom padding. */
  flush?: boolean;
  hideNav?: boolean;
}) {
  const maxWidth = wide === "xl" ? "max-w-7xl" : wide ? "max-w-5xl" : "max-w-xl";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className={cn("relative bg-background", flush ? "h-dvh overflow-hidden" : "min-h-dvh")}>
      <main
        className={cn("relative z-10 mx-auto w-full", flush || hideNav ? "" : "pb-24", maxWidth)}
      >
        {children}
      </main>

      {!hideNav && (
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-xl"
        >
          <ul
            className={cn(
              "mx-auto grid grid-cols-5 items-end px-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-2",
              maxWidth,
            )}
          >
            {NAV_LEFT.map((item) => (
              <NavItem key={item.to} {...item} active={pathname.startsWith(item.to)} />
            ))}
            <li className="flex justify-center">
              <Link
                to="/create"
                aria-label="Create"
                className="-mt-1.5 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_4px_18px_-2px_var(--primary)] transition-transform active:scale-95"
              >
                <Plus className="h-5.5 w-5.5" strokeWidth={2.2} />
              </Link>
            </li>
            {NAV_RIGHT.map((item) => (
              <NavItem key={item.to} {...item} active={pathname.startsWith(item.to)} />
            ))}
          </ul>
        </nav>
      )}
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
          "flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[9px] font-medium transition-colors",
          active ? "text-cyan" : "text-muted-foreground hover:text-secondary-foreground",
        )}
      >
        <Icon
          className={cn("h-5 w-5", active && "drop-shadow-[0_0_10px_var(--brand-cyan)]")}
          strokeWidth={active ? 2 : 1.6}
        />
        {label}
      </Link>
    </li>
  );
}

/**
 * Home-style top bar: brand lockup on the left, notification bell and the
 * signed-in person's avatar on the right.
 */
export function BrandBar() {
  const { userId } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-background/90 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
      <span className="flex items-center gap-2">
        <NuruMark className="h-7 w-7" />
        <span className="font-display text-[17px] font-semibold">
          Nuru <span className="text-cyan">Faith</span>
        </span>
      </span>
      <div className="flex items-center gap-3">
        <Link
          to="/notifications"
          aria-label="Notifications"
          className="relative text-secondary-foreground transition-colors hover:text-foreground"
        >
          <Bell className="h-5.5 w-5.5" strokeWidth={1.8} />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-cyan" />
        </Link>
        <Link to="/profile" aria-label="Your profile">
          <Avatar
            url={profile?.avatar_url ?? null}
            name={profile?.full_name ?? ""}
            seed={userId}
            size="sm"
          />
        </Link>
      </div>
    </header>
  );
}

/** Sub-screen header: optional back arrow, centered-left title, optional right slot. */
export function ScreenHeader({
  title,
  subtitle,
  right,
  back = false,
  titleClassName,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  back?: boolean;
  /** Lets a screen tint its own title, as Explore does in the design. */
  titleClassName?: string;
}) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 bg-background/90 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
      {back && (
        <button
          type="button"
          onClick={() => void navigate({ to: ".." })}
          aria-label="Go back"
          className="-ml-1 shrink-0 rounded-full p-1.5 text-secondary-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1
          className={cn(
            "truncate font-display text-[22px] font-semibold tracking-tight",
            titleClassName,
          )}
        >
          {title}
        </h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </header>
  );
}

const AVATAR_SIZES = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-11 w-11 text-sm",
  lg: "h-24 w-24 text-2xl",
};

export function Avatar({
  url,
  name,
  seed,
  size = "md",
  className,
}: {
  url: string | null;
  name: string;
  /** Stable per-person value (user id) so the generated avatar never shifts. */
  seed?: string | null;
  size?: keyof typeof AVATAR_SIZES;
  className?: string;
}) {
  const src = url || generatedAvatar(seed || name, name);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-strong",
        AVATAR_SIZES[size],
        className,
      )}
    >
      <img src={src} alt="" className="h-full w-full object-cover" />
    </span>
  );
}
