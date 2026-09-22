import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BellOff,
  BellRing,
  CalendarDays,
  HeartHandshake,
  LoaderCircle,
  MessageCircle,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { fetchNotifications, markNotificationRead } from "@/services/content";
import {
  disableWebPush,
  enableWebPush,
  getWebPushState,
  type WebPushState,
} from "@/services/push";
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

    if (notification.deep_link) window.location.assign(notification.deep_link);
  }

  return (
    <AppShell>
      <ScreenHeader title="Notifications" />

      {userId && <PushControl />}

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

function PushControl() {
  const [state, setState] = useState<WebPushState | "checking">("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    void getWebPushState()
      .then((next) => {
        if (active) setState(next);
      })
      .catch(() => {
        if (active) setState("available");
      });

    return () => {
      active = false;
    };
  }, []);

  if (state === "unsupported") return null;

  const enabled = state === "enabled";
  const blocked = state === "blocked";

  async function togglePush() {
    if (blocked || state === "checking") return;

    setBusy(true);
    try {
      if (enabled) {
        await disableWebPush();
        setState("available");
        toast.success("Device notifications are off");
      } else {
        await enableWebPush();
        setState("enabled");
        toast.success("Device notifications are on");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update device notifications");
      const next = await getWebPushState().catch(() => "available" as const);
      setState(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-4 pb-3">
      <div
        className={cn(
          "nuru-card flex items-center gap-3 p-3",
          enabled && "border-cyan/35 bg-cyan/5",
        )}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-cyan">
          {blocked ? <BellOff className="h-4.5 w-4.5" /> : <BellRing className="h-4.5 w-4.5" />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold">
            {blocked
              ? "Device alerts are blocked"
              : enabled
                ? "Device alerts are on"
                : "Get alerts when Nuru is closed"}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {blocked
              ? "Allow notifications for this site in your browser settings to enable them."
              : enabled
                ? "Community and mentorship updates can reach this browser in the background."
                : "Enable secure browser alerts for this device. You can turn them off anytime."}
          </p>
        </div>

        {!blocked && (
          <button
            type="button"
            disabled={busy || state === "checking"}
            onClick={() => void togglePush()}
            className={cn(
              "flex min-h-9 min-w-16 shrink-0 items-center justify-center rounded-xl px-3 text-[11px] font-semibold transition-colors disabled:opacity-50",
              enabled
                ? "border border-border-strong bg-surface-2 text-secondary-foreground"
                : "bg-primary text-primary-foreground",
            )}
          >
            {busy || state === "checking" ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : enabled ? (
              "Turn off"
            ) : (
              "Enable"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
