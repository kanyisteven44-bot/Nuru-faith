import { useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Clapperboard, Home, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { fetchProfile } from "@/services/content";
import { generatedAvatar } from "@/lib/avatar";
import { recordNuruActivity } from "@/services/pilot";
import { NuruLockup } from "./Logo";

/**
 * Design system v2 primary navigation. Events, Prayer and Mentorship are
 * reached from the four quick actions on Home instead of the bar.
 *
 * The boards disagree with themselves here — the "First steps" set shows
 * Church/Me — but the handoff states the Home board is the final direction,
 * and the design-language board lists these four.
 */
const NAV = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/bible", label: "Bible", icon: BookOpen },
  { to: "/community", label: "Community", icon: Users },
  { to: "/reels", label: "Reels", icon: Clapperboard },
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

  useEffect(() => {
    void recordNuruActivity();
  }, []);

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
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl"
        >
          <ul
            className={cn(
              "mx-auto grid grid-cols-4 px-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-2",
              maxWidth,
            )}
          >
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
          "flex min-h-12 flex-col items-center justify-center gap-1.5 text-[10px] font-semibold transition-colors",
          active ? "text-foreground" : "text-ink-3 hover:text-ink-2",
        )}
      >
        {/* The selected tab is marked by a raised forest pill, not a glow. */}
        <span
          className={cn(
            "flex h-7 w-11 items-center justify-center rounded-full transition-colors",
            active && "nuru-raise bg-[linear-gradient(180deg,var(--forest-hi),var(--primary))]",
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={active ? 2.1 : 1.75} />
        </span>
        {label}
      </Link>
    </li>
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
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-background/90 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
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
