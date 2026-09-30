import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  Calendar,
  Church,
  Clapperboard,
  GraduationCap,
  HandHeart,
  Home,
  Layers,
  Menu,
  Music2,
  Search,
  Settings,
  Sparkles,
  Sunrise,
  User,
  Users,
} from "lucide-react";
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
  { to: "/hub", label: "More", icon: Menu },
] as const;

const DESKTOP_NAV = [
  {
    label: "Discover",
    items: [
      { to: "/home", label: "Home", icon: Home },
      { to: "/explore", label: "Search & Explore", icon: Search },
      { to: "/reels", label: "Reels", icon: Clapperboard },
      { to: "/music", label: "Music & Media", icon: Music2 },
    ],
  },
  {
    label: "Grow in faith",
    items: [
      { to: "/bible", label: "Bible", icon: BookOpen },
      { to: "/devotionals", label: "Devotionals", icon: Sunrise },
      { to: "/series", label: "Series", icon: Layers },
      { to: "/faith-courses", label: "Faith Courses", icon: GraduationCap },
      { to: "/ai", label: "Ask Nuru", icon: Sparkles },
    ],
  },
  {
    label: "Together",
    items: [
      { to: "/community", label: "Community", icon: Users },
      { to: "/groups", label: "Groups", icon: Users },
      { to: "/church", label: "My Church", icon: Church },
      { to: "/mentors", label: "Mentorship", icon: HandHeart },
      { to: "/events", label: "Events", icon: Calendar },
    ],
  },
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
        !hideNav && "lg:pl-64",
        flush ? "h-dvh overflow-hidden" : "min-h-dvh",
      )}
    >
      <main
        id="nuru-main"
        className={cn(
          "relative z-10 mx-auto w-full max-w-xl lg:px-4 xl:px-8",
          flush || hideNav ? "" : "pb-24 lg:pb-10",
          maxWidth,
        )}
      >
        {children}
      </main>

      {!hideNav && (
        <>
          <nav
            aria-label="Main"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-xl lg:hidden"
          >
            <ul className="mx-auto grid max-w-xl grid-cols-5 px-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-2">
              {NAV.map((item) => (
                <NavItem
                  key={item.to}
                  {...item}
                  active={pathname === item.to || pathname.startsWith(`${item.to}/`)}
                />
              ))}
            </ul>
          </nav>
          <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
            <Link
              to="/home"
              aria-label="Nuru Faith Home"
              className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-6"
            >
              <NuruMark className="h-10 w-10" />
              <span>
                <span className="block font-display text-xl font-semibold">
                  Nuru <span className="text-cyan">Faith</span>
                </span>
                <span className="text-[10px] tracking-wide text-muted-foreground">
                  Faith. Community. Purpose.
                </span>
              </span>
            </Link>
            <nav
              aria-label="Desktop"
              className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4"
            >
              {DESKTOP_NAV.map((group) => (
                <section key={group.label} className="mb-5 last:mb-0">
                  <h2 className="mb-2 px-3 font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {group.label}
                  </h2>
                  <ul className="space-y-1">
                    {group.items.map((item) => (
                      <NavItem
                        key={item.to}
                        {...item}
                        desktop
                        active={pathname === item.to || pathname.startsWith(`${item.to}/`)}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </nav>
            <nav aria-label="Account" className="shrink-0 border-t border-border px-3 py-3">
              <ul className="space-y-1">
                <NavItem
                  to="/profile"
                  label="My profile"
                  icon={User}
                  desktop
                  active={pathname === "/profile"}
                />
                <NavItem
                  to="/settings"
                  label="Settings & help"
                  icon={Settings}
                  desktop
                  active={pathname === "/settings"}
                />
              </ul>
            </nav>
          </aside>
        </>
      )}
    </div>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  active,
  desktop = false,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  active: boolean;
  desktop?: boolean;
}) {
  return (
    <li>
      <Link
        to={to}
        {...(to === "/ai"
          ? { search: {} }
          : to === "/explore"
            ? { search: { q: "", kind: "all" as const } }
            : {})}
        aria-current={active ? "page" : undefined}
        className={cn(
          desktop
            ? "flex min-h-10 items-center gap-3 rounded-xl border border-transparent px-3 text-[13px] font-medium transition-colors hover:bg-surface-2/60"
            : "flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition-colors",
          active
            ? desktop
              ? "border-primary/25 bg-primary/15 text-cyan"
              : "text-cyan"
            : "text-muted-foreground hover:text-secondary-foreground",
        )}
      >
        <Icon
          className={cn("h-5.5 w-5.5", active && "drop-shadow-[0_0_10px_var(--brand-cyan)]")}
          strokeWidth={active ? 2.3 : 1.8}
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
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
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
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-background/90 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl lg:mb-6 lg:border-b lg:border-border lg:py-5">
      <span className="flex items-center gap-2 lg:hidden">
        <NuruMark className="h-7 w-7" />
        <span className="font-display text-[17px] font-semibold">
          Nuru <span className="text-cyan">Faith</span>
        </span>
      </span>
      <form
        role="search"
        aria-label="Search Nuru Faith"
        className="hidden w-full max-w-md items-center gap-3 rounded-xl border border-border bg-surface/75 px-3 focus-within:ring-2 focus-within:ring-primary/60 lg:flex"
        onSubmit={(event) => {
          event.preventDefault();
          void navigate({
            to: "/explore",
            search: { q: search.trim().slice(0, 120), kind: "all" },
          });
        }}
      >
        <Search className="h-4 w-4 shrink-0 text-cyan" aria-hidden="true" />
        <input
          type="search"
          aria-label="Search Scripture, music and community"
          placeholder="Search Scripture, music, community…"
          maxLength={120}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-h-11 min-w-0 flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
        />
        <button
          type="submit"
          aria-label="Search"
          className="rounded-lg p-2 text-cyan hover:bg-primary/10"
        >
          <ArrowLeft className="h-4 w-4 rotate-180" />
        </button>
      </form>
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
