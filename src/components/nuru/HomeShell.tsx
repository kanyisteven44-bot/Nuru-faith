import { type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { fetchProfile, fetchUnreadNotificationCount } from "@/services/content";
import { NuruMark } from "./Logo";
import { Avatar, MobileNav, Sidebar } from "./AppShell";

/**
 * Home's frame.
 *
 * The rail and the bar are the shared ones from AppShell, so navigation is
 * identical across the app. Home adds only what its board asks for on top:
 * a search field, bell and avatar across the desktop header, and the brand
 * row on mobile.
 */
export function HomeShell({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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
        <Sidebar pathname={pathname} />

        <div className="min-w-0 flex-1 lg:rounded-3xl lg:border lg:border-border lg:bg-surface lg:p-6">
          {/* Desktop header */}
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

          {/* Mobile header */}
          <header className="flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 lg:hidden">
            <Link to="/home" className="flex items-center gap-2">
              <NuruMark className="h-9 w-9" />
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

      <MobileNav pathname={pathname} />
    </div>
  );
}
