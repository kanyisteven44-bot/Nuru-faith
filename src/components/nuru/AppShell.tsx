import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, BookOpen, CalendarDays, Home, User, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { NuruLogo, NuruMark } from "@/components/nuru/Logo";

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
  wide?: boolean | "xl";
  flush?: boolean;
}) {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const maxWidth = wide === "xl" ? "max-w-7xl" : wide ? "max-w-5xl" : "max-w-xl";
  const avatar = user?.user_metadata?.["avatar_url"] ?? user?.user_metadata?.["picture"];

  return (
    <div className={cn("nuru-app relative", flush ? "h-dvh overflow-hidden" : "min-h-dvh")}>
      {!flush ? (
        <header className="nuru-desktop-bar hidden lg:block">
          <div className={cn("mx-auto flex h-16 items-center justify-between px-5", maxWidth)}>
            <Link to="/home" aria-label="Nuru Faith home">
              <NuruLogo compact />
            </Link>
            <nav aria-label="Desktop navigation" className="flex items-center gap-1">
              {NAV.slice(0, 4).map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={cn("nuru-top-link", pathname.startsWith(to) && "nuru-top-link-active")}
                >
                  {label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <Link to="/notifications" className="nuru-icon-button" aria-label="Notifications">
                <Bell className="h-4 w-4" />
              </Link>
              <Link to="/profile" className="nuru-avatar-link" aria-label="Open profile">
                {avatar ? (
                  <img src={avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </Link>
            </div>
          </div>
        </header>
      ) : null}
      <main className={cn("relative z-10 mx-auto w-full", flush ? "" : "pb-24", maxWidth)}>
        {children}
      </main>
      <nav aria-label="Main navigation" className="nuru-bottom-bar">
        <ul className={cn("mx-auto grid grid-cols-5 px-2", maxWidth)}>
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn("nuru-bottom-link", active && "is-active")}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
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
  const { user } = useAuth();
  const avatar = user?.user_metadata?.["avatar_url"] ?? user?.user_metadata?.["picture"];

  return (
    <header className="nuru-screen-header">
      <NuruMark className="h-9 w-9 shrink-0 lg:hidden" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-xl font-semibold">{title}</h1>
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {right}
        <Link to="/profile" className="nuru-avatar-link lg:hidden" aria-label="Open profile">
          {avatar ? (
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <User className="h-4 w-4" />
          )}
        </Link>
      </div>
    </header>
  );
}
