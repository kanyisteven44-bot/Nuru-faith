import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AtSign, Bell, CalendarDays, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { fetchNotifications, markNotificationRead } from "@/services/content";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState, PillTabs } from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Nuru Faith" },
      { name: "description", content: "Mentions, messages and event reminders." },
    ],
  }),
  component: NotificationsScreen,
});

const TABS = ["All", "Mentions", "Messages", "Events"] as const;
type Tab = (typeof TABS)[number];

const ICONS: Record<string, typeof Bell> = {
  mention: AtSign,
  message: MessageCircle,
  event: CalendarDays,
};

function NotificationsScreen() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("All");

  const notifications = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => fetchNotifications(userId!),
    enabled: !!userId,
  });

  const all = notifications.data ?? [];
  const rows =
    tab === "All" ? all : all.filter((n) => n.category === tab.toLowerCase().replace(/s$/, ""));

  async function open(id: string, read: boolean) {
    if (read) return;
    await markNotificationRead(id);
    await qc.invalidateQueries({ queryKey: ["notifications", userId] });
  }

  return (
    <AppShell>
      <ScreenHeader title="Notifications" />

      <div className="px-4 pb-1">
        <PillTabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      <div className="space-y-2 px-4 pt-2">
        {notifications.isLoading && <CardSkeleton count={4} height="h-16" />}
        {!notifications.isLoading && rows.length === 0 && (
          <EmptyState
            title="Nothing here yet"
            description="Mentions, replies and event reminders will show up here."
          />
        )}
        {rows.map((n) => {
          const Icon = ICONS[n.category] ?? Bell;
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => void open(n.id, n.read)}
              className={cn(
                "nuru-card flex w-full items-start gap-3 p-3 text-left transition-colors",
                !n.read && "border-primary/45 bg-primary/8",
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-primary/12 text-cyan">
                <Icon className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{n.title}</span>
                {n.body && (
                  <span className="mt-0.5 block line-clamp-2 text-[12px] text-muted-foreground">
                    {n.body}
                  </span>
                )}
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  {timeAgo(n.created_at)}
                </span>
              </span>
              {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan" />}
            </button>
          );
        })}
      </div>
    </AppShell>
  );
}
