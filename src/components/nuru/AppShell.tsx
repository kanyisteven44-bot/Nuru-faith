import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { fetchProfile } from "@/services/content";
import { generatedAvatar } from "@/lib/avatar";
import { recordNuruActivity } from "@/services/pilot";
import { NuruArch, NuruLockup, NuruMark } from "./Logo";
import { MOBILE_NAV, SIDEBAR_GROUPS } from "./nav";

/**
 * The app frame: a grouped sidebar from `lg:` up, and the five-item bar below
 * that. Both read one shared definition in ./nav, so navigation can never
 * drift between screens.
 */
export function AppShell({
  children,
  wide = false,
  flush = false,
  hideNav = false,
}: {
  children: ReactNode;
  /** Kept for callers; the desktop frame is a fixed width now. */
  wide?: boolean | "xl";
  /** Full-bleed screens (Reels) take the viewport whole and skip the frame. */
  flush?: boolean;
  hideNav?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    void recordNuruActivity();
  }, []);

  // Full-bleed screens (Reels) own the viewport, but they still need a way
  // out on desktop — without the rail there is no navigation on the screen
  // at all.
  if (flush) {
    return (
      <div className="relative flex h-dvh overflow-hidden bg-background lg:gap-6 lg:p-6">
        {!hideNav && <Sidebar pathname={pathname} />}
        <main className="relative z-10 h-full min-w-0 flex-1 overflow-hidden lg:rounded-3xl">
          {children}
        </main>
        {!hideNav && <MobileNav pathname={pathname} />}
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh bg-background">
      <div className="mx-auto flex w-full max-w-[1480px] gap-6 lg:p-6">
        {!hideNav && <Sidebar pathname={pathname} />}
        <div
          className={cn(
            "min-w-0 flex-1",
            !hideNav && "lg:rounded-3xl lg:border lg:border-border lg:bg-surface lg:p-6",
            wide === "xl" && "max-w-none",
          )}
        >
          <main className={cn("relative z-10 w-full", hideNav ? "" : "pb-28 lg:pb-0")}>
            {children}
          </main>
        </div>
      </div>
      {!hideNav && <MobileNav pathname={pathname} />}
    </div>
  );
}

/** Desktop navigation rail. */
export function Sidebar({ pathname }: { pathname: string }) {
  const { userId } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });

  return (
    <aside className="hidden w-[232px] shrink-0 flex-col rounded-3xl border border-border bg-surface p-4 lg:flex">
      <Link to="/home" className="mb-6 flex items-center gap-2.5 px-2">
        <NuruMark className="h-9 w-9" />
        <span className="font-sans text-[19px] font-bold tracking-tight">Nuru Faith</span>
      </Link>

      <nav aria-label="Main" className="flex-1 space-y-5">
        {SIDEBAR_GROUPS.map((group) => (
          <div key={group.heading}>
            <p className="px-3 pb-1.5 text-[12px] font-semibold text-ink-3">{group.heading}</p>
            <ul className="space-y-2">
              {group.items.map((item) => {
                const active = pathname.startsWith(item.to);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "nuru-soft-control flex min-h-11 items-center gap-3 rounded-2xl px-3 text-[14px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active ? "nuru-soft-primary" : "text-ink-2 hover:text-foreground",
                      )}
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
                      <span className="flex-1">{item.label}</span>
                      {active && (
                        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <Link
        to="/profile"
        className="mt-4 flex items-center gap-2.5 rounded-xl border-t border-border px-2 pt-4"
      >
        <Avatar
          url={profile?.avatar_url ?? null}
          name={profile?.full_name ?? ""}
          seed={userId}
          size="sm"
          className="h-9 w-9"
        />
        <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">
          {profile?.full_name ?? "Your profile"}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={2} />
      </Link>
    </aside>
  );
}

/** The five-item bar, below `lg:`. */
export function MobileNav({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <ul className="nuru-nav-dock mx-auto grid max-w-xl grid-cols-5 gap-1 rounded-[26px] border border-border-strong p-1.5 backdrop-blur-xl">
        {MOBILE_NAV.map((item) => (
          <NavItem key={item.to} {...item} active={pathname.startsWith(item.to)} />
        ))}
      </ul>
    </nav>
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
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <li>
      <Link
        to={to}
        aria-current={active ? "page" : undefined}
        className={cn(
          "nuru-soft-control flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[19px] px-0.5 text-[10px] font-semibold",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          active ? "nuru-soft-primary" : "text-ink-2 hover:text-foreground",
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
        <span className={active ? "font-bold" : undefined}>{label}</span>
      </Link>
    </li>
  );
}

/**
 * The header the designs put on nearly every screen: an optional back
 * chevron, and the arch over the wordmark, centred.
 */
export function BoardHeader({
  back = false,
  right,
  crossLogo = false,
}: {
  back?: boolean;
  right?: ReactNode;
  crossLogo?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <header className="relative flex min-h-12 items-center justify-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 lg:justify-end lg:px-0 lg:pt-0">
      {back && (
        <button
          type="button"
          onClick={() => void navigate({ to: ".." })}
          aria-label="Go back"
          className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:left-0"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2} />
        </button>
      )}
      {/* The desktop rail already carries the mark, so the centred lockup
          would be the brand twice on one screen. */}
      <Link
        to="/home"
        aria-label="Nuru Faith"
        className="flex flex-col items-center gap-1 lg:hidden"
      >
        {crossLogo ? (
          <NuruMark className="h-11 w-11" />
        ) : (
          <span className="block h-4 w-7">
            <NuruArch />
          </span>
        )}
        <span className="font-display text-[11.5px] leading-none tracking-[0.2em] text-foreground">
          NURU FAITH
        </span>
      </Link>
      {right && (
        <div className="absolute right-3 flex items-center gap-1 lg:static lg:right-auto">
          {right}
        </div>
      )}
    </header>
  );
}

/**
 * Top bar for the main tabs. Home centres the full arch lockup with the
 * avatar floated to the right; the other tabs show the plain "NURU" wordmark
 * on the left, as the boards lay them out.
 */
export function BrandBar({ centered = false }: { centered?: boolean }) {
  const { userId } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });

  const avatar = (
    <Link to="/profile" aria-label="Your profile" className="shrink-0">
      <Avatar
        url={profile?.avatar_url ?? null}
        name={profile?.full_name ?? ""}
        seed={userId}
        size="sm"
        className="h-9 w-9"
      />
    </Link>
  );

  if (centered) {
    return (
      <header className="relative z-30 flex items-start justify-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <Link to="/home" aria-label="Nuru Faith">
          <NuruLockup />
        </Link>
        <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-4">{avatar}</div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-background/90 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl lg:hidden">
      <Link to="/home" aria-label="Nuru Faith">
        <span className="font-display text-[20px] leading-none tracking-[0.16em]">NURU</span>
      </Link>
      {avatar}
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
        <h1 className="truncate font-display text-[22px] font-semibold tracking-tight">{title}</h1>
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
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const src = url && url !== failedUrl ? url : generatedAvatar(seed || name, name);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-strong",
        AVATAR_SIZES[size],
        className,
      )}
    >
      <img
        src={src}
        alt=""
        // Large avatars lead a screen (profile, mentor); small ones sit in long lists.
        loading={size === "lg" ? "eager" : "lazy"}
        fetchPriority={size === "lg" ? "high" : "auto"}
        decoding="async"
        className="h-full w-full object-cover"
        onError={() => setFailedUrl(url)}
      />
    </span>
  );
}
