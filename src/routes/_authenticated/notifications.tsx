import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarDays, HeartHandshake, MessageCircle, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { fetchNotifications, markNotificationRead } from "@/services/content";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState, PillTabs } from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Nuru Faith" },
      { name: "description", content: "Community, mentorship and event notifications." },
    ],
  }),
  component: NotificationsScreen,
});

const TABS = ["All", "Social", "Mentorship", "Events"] as const;
type Tab = (typeof TABS)[number];

const ICONS: Record<string, typeof Bell> = {
  social: Users,
  mention: MessageCircle,
  message: MessageCircle,
  mentorship: HeartHandshake,
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

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ["notifications", userId] });
          void qc.invalidateQueries({ queryKey: ["notification-unread-count", userId] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  const all = notifications.data ?? [];
  const rows =
    tab === "All"
      ? all
      : all.filter((n) => {
          const expected = tab === "Events" ? "event" : tab.toLowerCase();
          return n.category === expected;
        });

  async function open(notification: (typeof all)[number]) {
    if (!notification.read) {
      await markNotificationRead(notification.id);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["notifications", userId] }),
        qc.invalidateQueries({ queryKey: ["notification-unread-count", userId] }),
      ]);
    }

    if (notification.deep_link) {
      window.location.assign(notification.deep_link);
    }
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
            description="Community, mentorship and event updates will show up here."
          />
        )}
        {rows.map((n) => {
          const Icon = ICONS[n.category] ?? Bell;
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => void open(n)}
              className={cn(
                "nuru-card flex w-full items-start gap-3 p-3 text-left transition-colors",
                !n.read && "border-primary/45 bg-primary/8",
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-primary/12 text-cyan">
                <Icon className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="block truncate text-sm font-medium">{n.title}</span>
                  {n.priority !== "normal" && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                        n.priority === "critical"
                          ? "bg-red-500/15 text-red-200"
                          : "bg-amber-400/15 text-amber-200",
                      )}
                    >
                      {n.priority}
                    </span>
                  )}
                </span>
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
