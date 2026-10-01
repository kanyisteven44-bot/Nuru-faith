import { useEffect, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Church,
  Clapperboard,
  Compass,
  FileText,
  GraduationCap,
  Home,
  MoreHorizontal,
  Music2,
  Search,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { fetchProfile, fetchUnreadNotificationCount } from "@/services/content";
import { recordNuruActivity } from "@/services/pilot";
import { NuruMark } from "./Logo";
import { Avatar } from "./AppShell";

/**
 * Shell for the Home concept board.
 *
 * Home is the only screen on this layout, so it carries its own shell rather
 * than changing the shared AppShell: a grouped sidebar from `lg:` up, and the
 * board's five-item bar below that. The navy palette comes from the
 * `.home-concept` scope in styles.css and stops at this subtree.
 */

type NavLink = { to: string; label: string; icon: LucideIcon };

const SIDEBAR: { heading: string; items: NavLink[] }[] = [
  {
    heading: "Discover",
    items: [
      { to: "/home", label: "Home", icon: Home },
      { to: "/explore", label: "Explore", icon: Compass },
      { to: "/reels", label: "Reels", icon: Clapperboard },
      { to: "/music", label: "Music", icon: Music2 },
    ],
  },
  {
    heading: "Grow in faith",
    items: [
      { to: "/bible", label: "Bible", icon: BookOpen },
      { to: "/devotionals", label: "Devotionals", icon: FileText },
      { to: "/faith-courses", label: "Courses", icon: GraduationCap },
    ],
  },
  {
    heading: "Together",
    items: [
      { to: "/community", label: "Community", icon: Users },
      { to: "/church", label: "My Church", icon: Church },
      { to: "/mentors", label: "Mentorship", icon: Users },
      { to: "/events", label: "Events", icon: CalendarDays },
    ],
  },
];

/** The board's mobile bar. "More" is the existing /hub index. */
const MOBILE_NAV: NavLink[] = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/community", label: "Community", icon: Users },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/hub", label: "More", icon: MoreHorizontal },
];

export function HomeShell({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    void recordNuruActivity();
  }, []);

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

  const bell = (
    <Link
      to="/notifications"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
      className="relative flex h-9 w-9 shrink-0 items-center justify-center text-ink-2 transition-colors hover:text-foreground"
    >
      <Bell className="h-5 w-5" strokeWidth={1.8} />
      {unread > 0 && (
        <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-[var(--background)]" />
      )}
    </Link>
  );

  return (
    <div className="home-concept relative min-h-dvh">
      <div className="mx-auto flex w-full max-w-[1480px] gap-6 lg:p-6">
        {/* Sidebar — desktop only */}
        <aside className="hidden w-[232px] shrink-0 flex-col rounded-3xl border border-border bg-surface p-4 lg:flex">
          <Link to="/home" className="mb-6 flex items-center gap-2.5 px-2">
            <NuruMark className="h-9 w-9" />
            <span className="font-sans text-[19px] font-bold tracking-tight">Nuru Faith</span>
          </Link>

          <nav aria-label="Main" className="flex-1 space-y-5">
            {SIDEBAR.map((group) => (
              <div key={group.heading}>
                <p className="px-3 pb-1.5 text-[12px] font-semibold text-ink-3">{group.heading}</p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = pathname.startsWith(item.to);
                    return (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14.5px] font-semibold transition-colors",
                            active
                              ? "bg-primary text-primary-foreground"
                              : "text-ink-2 hover:bg-surface-2 hover:text-foreground",
                          )}
                        >
                          <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
                          {item.label}
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

        {/* Content column */}
        <div className="min-w-0 flex-1 lg:rounded-3xl lg:border lg:border-border lg:bg-surface lg:p-6">
          {/* Desktop top bar: search, bell, avatar */}
          <div className="mb-5 hidden items-center gap-4 lg:flex">
            <Link
              to="/explore"
              search={{ q: "", kind: "all" }}
              className="flex h-11 flex-1 items-center gap-3 rounded-full border border-border bg-background px-4 text-[14px] text-ink-3"
            >
              <Search className="h-4.5 w-4.5 shrink-0" strokeWidth={1.9} />
              Search Nuru Faith
            </Link>
            {bell}
            {avatar}
          </div>

          {/* Mobile top bar: logo, bell, avatar */}
          <header className="flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 lg:hidden">
            <Link to="/home" className="flex items-center gap-2">
              <NuruMark className="h-8 w-8" />
              <span className="font-sans text-[17px] font-bold tracking-tight">Nuru Faith</span>
            </Link>
            <div className="flex items-center gap-1">
              {bell}
              {avatar}
            </div>
          </header>

          <main className="pb-28 lg:pb-0">{children}</main>
        </div>
      </div>

      {/* Mobile bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-xl lg:hidden"
      >
        <ul className="mx-auto grid max-w-xl grid-cols-5 px-1 pt-2 pb-[max(0.4rem,env(safe-area-inset-bottom))]">
          {MOBILE_NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-12 flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors",
                    active ? "text-primary" : "text-ink-3 hover:text-ink-2",
                  )}
                >
                  <item.icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
