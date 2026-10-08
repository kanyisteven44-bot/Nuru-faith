import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  BookOpenCheck,
  Church,
  Clapperboard,
  Home,
  MessageCircle,
  Music2,
  Search,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { NuruMark } from "@/components/nuru/Logo";
import { Avatar } from "@/components/nuru/AppShell";

export type AdminSectionId =
  | "operations"
  | "dashboard"
  | "users"
  | "churches"
  | "content"
  | "music"
  | "reels"
  | "community"
  | "moderation"
  | "roles";

type SectionItem = {
  kind: "section";
  id: AdminSectionId;
  label: string;
  icon: LucideIcon;
  badge?: number;
};
type LinkItem = {
  kind: "link";
  to: "/messages" | "/settings";
  label: string;
  icon: LucideIcon;
  badge?: number;
};
type MenuItem = SectionItem | LinkItem;

export function AdminCommandShell({
  activeSection,
  onSectionChange,
  userId,
  userName,
  avatarUrl,
  roleLabel,
  attentionCount,
  isSuperAdmin,
  children,
}: {
  activeSection: AdminSectionId;
  onSectionChange: (section: AdminSectionId) => void;
  userId: string | null;
  userName: string;
  avatarUrl: string | null;
  roleLabel: string;
  attentionCount: number;
  isSuperAdmin: boolean;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      if (event.key === "Escape" && document.activeElement === searchRef.current) {
        setSearch("");
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const menu: MenuItem[] = [
    { kind: "section", id: "dashboard", label: "Dashboard", icon: Home },
    { kind: "section", id: "operations", label: "Operations", icon: UserCog },
    { kind: "section", id: "users", label: "Users", icon: Users },
    { kind: "section", id: "churches", label: "Churches", icon: Church },
    { kind: "section", id: "content", label: "Content", icon: BookOpenCheck },
    { kind: "section", id: "music", label: "Music", icon: Music2 },
    { kind: "section", id: "reels", label: "Reels", icon: Clapperboard },
    { kind: "section", id: "community", label: "Community", icon: Users },
    { kind: "link", to: "/messages", label: "Messages", icon: MessageCircle },
    { kind: "section", id: "moderation", label: "Reports", icon: BarChart3, badge: attentionCount },
    { kind: "section", id: "roles", label: "Roles", icon: ShieldCheck },
    { kind: "link", to: "/settings", label: "Settings", icon: Settings },
  ];

  const visibleMenu = menu.filter(
    (item) => isSuperAdmin || item.kind !== "section" || !["roles", "users"].includes(item.id),
  );

  function runSearch() {
    const q = search.trim().toLowerCase();
    if (!q) return;
    if (
      q.includes("operation") ||
      q.includes("mentor") ||
      q.includes("topic") ||
      q.includes("health")
    )
      return onSectionChange("operations");
    if (q.includes("church")) return onSectionChange("churches");
    if (q.includes("role") || q.includes("admin"))
      return onSectionChange(isSuperAdmin ? "roles" : "operations");
    if (q.includes("report") || q.includes("moder")) return onSectionChange("moderation");
    if (q.includes("music") || q.includes("song") || q.includes("artist"))
      return onSectionChange("music");
    if (q.includes("reel") || q.includes("video")) return onSectionChange("reels");
    if (q.includes("content") || q.includes("course") || q.includes("devotion"))
      return onSectionChange("content");
    if (q.includes("community") || q.includes("group") || q.includes("event"))
      return onSectionChange("community");
    if (q.includes("message") || q.includes("chat")) {
      void navigate({ to: "/messages" });
      return;
    }
    if (q.includes("setting") || q.includes("security")) {
      void navigate({ to: "/settings" });
      return;
    }
    onSectionChange(isSuperAdmin ? "users" : "operations");
  }

  return (
    <div className="min-h-dvh bg-[#020a13] text-slate-100 lg:flex">
      <aside className="hidden w-[248px] shrink-0 border-r border-[#142b3d] bg-[#06111c] px-3 py-4 lg:flex lg:flex-col">
        <Link
          to="/home"
          className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-white/[0.03]"
        >
          <NuruMark className="h-10 w-10 shrink-0" />
          <span className="min-w-0">
            <span className="block font-display text-base font-semibold tracking-[0.08em] text-white">
              NURU FAITH
            </span>
            <span className="block text-[10px] text-slate-500">Administration</span>
          </span>
        </Link>

        <nav className="mt-5 flex-1 space-y-1" aria-label="Admin navigation">
          {visibleMenu.map((item, index) => {
            const active = item.kind === "section" && item.id === activeSection;
            const row = (
              <span
                className={[
                  "flex min-h-10 items-center gap-3 rounded-lg border-l-2 border-y-0 border-r-0 px-3 text-[13px] font-medium transition-colors",
                  active
                    ? "border-l-cyan-300 bg-[#0b2031] text-white"
                    : "border-l-transparent text-slate-400 hover:bg-white/[0.035] hover:text-slate-100",
                ].join(" ")}
              >
                <item.icon
                  className={["h-4 w-4", active ? "text-cyan-300" : "text-slate-500"].join(" ")}
                />
                <span className="flex-1">{item.label}</span>
                {!!item.badge && item.badge > 0 && (
                  <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </span>
            );
            return item.kind === "section" ? (
              <button
                key={item.label}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => onSectionChange(item.id)}
                className={[
                  "block w-full text-left",
                  index === 8 ? "mt-4 border-t border-[#12314a] pt-4" : "",
                ].join(" ")}
              >
                {row}
              </button>
            ) : (
              <Link
                key={item.label}
                to={item.to}
                className={["block", index === 8 ? "mt-4 border-t border-[#12314a] pt-4" : ""].join(
                  " ",
                )}
              >
                {row}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 border-t border-[#142b3d] px-2 pt-4">
          <Link
            to="/home"
            className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs font-medium text-slate-400 transition hover:bg-white/[0.035] hover:text-white"
          >
            <Home className="h-4 w-4" />
            Back to Nuru Faith
          </Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 border-b border-[#12314a] bg-[#03101d]/95 backdrop-blur-xl">
          <div className="flex min-h-16 flex-wrap items-center gap-3 px-4 py-3 sm:px-5 lg:px-6">
            <div className="min-w-0 shrink-0">
              <p className="font-display text-base font-semibold text-white">Nuru Faith Admin</p>
              <p className="hidden text-[10px] text-slate-500 sm:block">
                Content, community and platform operations
              </p>
            </div>

            <form
              className="mx-auto w-full max-w-xl"
              onSubmit={(event) => {
                event.preventDefault();
                runSearch();
              }}
            >
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Find an admin workspace"
                  placeholder="Find a workspace…"
                  className="min-h-10 w-full rounded-xl border border-[#17364c] bg-[#071522] pl-10 pr-14 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400/50"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-[#234d6c] px-1.5 py-0.5 text-[9px] font-semibold text-slate-400">
                  ⌘K
                </span>
              </label>
            </form>

            <Link
              to="/notifications"
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#17364c] bg-[#071522] text-slate-400 transition hover:border-[#23506d] hover:text-white"
              aria-label="Notifications"
            >
              <Bell className="h-4.5 w-4.5" />
            </Link>

            <Link
              to="/profile"
              className="flex shrink-0 items-center gap-2 rounded-lg border border-[#17364c] bg-[#071522] px-2 py-1.5"
            >
              <Avatar
                url={avatarUrl}
                name={userName}
                seed={userId}
                size="sm"
                className="h-8 w-8 border-cyan-400/20"
              />
              <span className="hidden text-left sm:block">
                <span className="block max-w-32 truncate text-xs font-semibold text-white">
                  {userName}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {roleLabel}
                </span>
              </span>
            </Link>
          </div>

          <div className="overflow-x-auto border-t border-[#0d2538] px-3 py-2 lg:hidden">
            <nav className="flex min-w-max gap-2" aria-label="Mobile admin navigation">
              {visibleMenu
                .filter((item) => item.kind === "section")
                .map((item) => {
                  if (item.kind !== "section") return null;
                  const active = item.id === activeSection;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-current={active ? "page" : undefined}
                      onClick={() => onSectionChange(item.id)}
                      className={[
                        "min-h-9 rounded-lg border px-3 text-xs font-medium",
                        active
                          ? "border-[#2d6687] bg-[#0b2031] text-white"
                          : "border-[#173750] bg-[#071522] text-slate-400",
                      ].join(" ")}
                    >
                      {item.label}
                    </button>
                  );
                })}
            </nav>
          </div>
        </header>

        <main className="p-3 sm:p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
