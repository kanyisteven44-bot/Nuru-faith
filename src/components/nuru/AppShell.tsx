import { useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bell, Calendar, Home, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { fetchProfile, fetchUnreadNotificationCount } from "@/services/content";
import { generatedAvatar } from "@/lib/avatar";
import { recordNuruActivity } from "@/services/pilot";
import { NuruMark } from "./Logo";

/** Bible is reached from Quick Access on Home, so it is not in this bar. */
const NAV = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/community", label: "Community", icon: Users },
  { to: "/events", label: "Events", icon: Calendar },
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
  const maxWidth = wide === "xl" ? "lg:max-w-7xl" : wide ? "lg:max-w-5xl" : "lg:max-w-6xl";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    void recordNuruActivity();
  }, []);

  return (
    <div
      className={cn(
        "relative bg-background",
        !hideNav && "lg:pl-28",
        flush ? "h-dvh overflow-hidden" : "min-h-dvh",
      )}
    >
      <main
        className={cn(
          "relative z-10 mx-auto w-full max-w-xl lg:px-10",
          flush || hideNav ? "" : "pb-24 lg:pb-10",
          maxWidth,
        )}
      >
        {children}
      </main>

      {!hideNav && (
        <nav
          aria-label="Main"
          className="fixed inset-x-3 bottom-3 z-40 rounded-3xl border border-border bg-surface/95 px-2 shadow-2xl shadow-black/40 backdrop-blur-xl lg:inset-y-4 lg:right-auto lg:left-4 lg:w-20 lg:rounded-[2rem] lg:px-0 lg:pt-5"
        >
          <Link
            to="/home"
            aria-label="Nuru Faith Home"
            className="mx-auto mb-9 hidden h-11 w-11 items-center justify-center rounded-2xl bg-primary font-display text-2xl font-bold text-primary-foreground lg:flex"
          >
            N
          </Link>
          <ul className="mx-auto grid max-w-xl grid-cols-4 pb-[max(0.3rem,env(safe-area-inset-bottom))] pt-1 lg:flex lg:flex-col lg:gap-3 lg:px-2 lg:pt-0">
            {NAV.map((item) => (
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
          "flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-medium transition-colors lg:min-h-16 lg:w-full lg:text-[10px]",
          active
            ? "bg-primary/12 text-cyan"
            : "text-muted-foreground hover:text-secondary-foreground",
        )}
      >
        <Icon className="h-5.5 w-5.5" strokeWidth={active ? 2.3 : 1.8} />
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

  const { data: unread = 0 } = useQuery({
    queryKey: ["notification-unread-count", userId],
    queryFn: () => fetchUnreadNotificationCount(userId!),
    enabled: !!userId,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/92 px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl lg:mb-6 lg:px-6">
      <span className="flex items-center gap-2">
        <NuruMark className="h-7 w-7" />
        <span className="font-display text-[20px] font-semibold tracking-tight">
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
          {unread > 0 && (
            <span className="absolute -right-2 -top-2 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-cyan px-1 text-[9px] font-bold text-background">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
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
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  back?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/92 px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl lg:mb-6 lg:px-6">
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
        <h1 className="truncate font-display text-[27px] font-semibold tracking-tight">{title}</h1>
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
