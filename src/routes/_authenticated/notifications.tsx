import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BellOff,
  BellRing,
  CalendarDays,
  HeartHandshake,
  LoaderCircle,
  MessageCircle,
  Phone,
  PhoneIncoming,
  Smartphone,
  RefreshCw,
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
  sendTestWebPush,
  type WebPushState,
} from "@/services/push";
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

const TABS = ["All", "Calls", "Social", "Mentorship", "Events"] as const;
type Tab = (typeof TABS)[number];

const ICONS: Record<string, typeof Bell> = {
  social: Users,
  mention: MessageCircle,
  message: MessageCircle,
  mentorship: HeartHandshake,
  event: CalendarDays,
  call: Phone,
};

function NotificationsScreen() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("All");

  const notifications = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => fetchNotifications(userId!),
    enabled: !!userId,
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const all = notifications.data ?? [];
  const rows =
    tab === "All"
      ? all
      : all.filter((n) => {
          const expected = tab === "Events" ? "event" : tab === "Calls" ? "call" : tab.toLowerCase();
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

      <div className="mx-4 mb-4 flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <PhoneIncoming className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold">Incoming calls when Nuru is closed</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Enable device alerts above, then allow notifications for Nuru in Android and Chrome.
            On supported devices a call alert can appear while Nuru is closed. Tap <strong>Open call</strong>
            to return to Nuru and answer while the caller is still ringing.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            For reliable delivery, install Nuru on your home screen, keep internet on and avoid
            restricting Chrome or Nuru's background activity. Sound and vibration depend on Android settings.
          </p>
          <Link to="/messages" search={{}} className="mt-3 inline-flex min-h-9 items-center gap-1 text-xs font-bold text-primary hover:underline">
            <Phone className="h-4 w-4" /> Open messages and call history
          </Link>
        </div>
      </div>

      <div className="px-4 pb-1">
        <PillTabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      <div className="space-y-2 px-4 pt-2">
        {notifications.isLoading && <CardSkeleton count={4} height="h-16" />}
        {!notifications.isLoading && rows.length === 0 && (
          <EmptyState
            title="Nothing here yet"
            description={tab === "Calls" ? "Your incoming-call alerts will appear here. Try a call from another Nuru account after enabling device alerts." : "New notifications will show up here."}
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
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-primary/12 text-leaf">
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
                          ? "bg-rose-soft text-rose"
                          : "bg-sand-soft text-sand",
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
              {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-leaf" />}
            </button>
          );
        })}
      </div>
    </AppShell>
  );
}

function PushControl() {
  const [state, setState] = useState<WebPushState | "checking" | "error">("checking");
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let active = true;

    void getWebPushState()
      .then((next) => {
        if (active) setState(next);
      })
      .catch(() => {
        if (active) setState("error");
      });

    return () => {
      active = false;
    };
  }, []);

  async function retryCheck() {
    setState("checking");
    try {
      setState(await getWebPushState());
    } catch {
      setState("error");
      toast.error("Couldn't check device notifications. Please retry while online.");
    }
  }

  if (state === "unsupported") {
    return (
      <div className="px-4 pb-3">
        <div className="nuru-card flex items-start gap-3 p-4">
          <Smartphone className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold">Background alerts not supported here</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              This browser cannot register Web Push. On Android, open Nuru in a current version
              of Chrome and enable notifications there. In-app calls still work while Nuru is open.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const enabled = state === "enabled";
  const blocked = state === "blocked";
  const hasError = state === "error";

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
      const next = await getWebPushState().catch(() => "error" as const);
      setState(next);
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    if (!enabled || testing) return;
    setTesting(true);
    try {
      const request = sendTestWebPush();
      toast("Test requested. Minimize Nuru now; the alert should arrive shortly.");
      await request;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't send the test alert");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="px-4 pb-3">
      <div
        className={cn(
          "nuru-card flex items-center gap-3 p-3",
          enabled && "border-leaf/35 bg-leaf/5",
        )}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-leaf">
          {blocked ? <BellOff className="h-4.5 w-4.5" /> : <BellRing className="h-4.5 w-4.5" />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold">
            {blocked
              ? "Allow device alerts in Chrome settings"
              : hasError
                ? "Could not verify device alerts"
                : state === "checking"
                  ? "Checking device alerts…"
                  : enabled
                    ? "Device alerts enabled"
                    : "Receive calls when Nuru is closed"}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {blocked
              ? "Android Settings → Apps → Chrome → Notifications, then allow alerts for nurufaith.co.ke in Chrome Site settings. Return here afterward."
              : hasError
                ? "Check your internet connection and try again. We cannot confirm that this browser is registered."
                : enabled
                  ? "Incoming calls and messages can notify this device when Nuru is minimized or closed."
                  : "Allow notifications on this device to receive incoming call alerts in the background."}
          </p>
        </div>

        {hasError ? (
          <button type="button" disabled={busy} onClick={() => void retryCheck()}
            className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        ) : !blocked && (
          <div className="flex shrink-0 flex-col gap-2">
            {enabled && (
              <button
                type="button"
                disabled={testing || busy}
                onClick={() => void sendTest()}
                className="flex min-h-9 min-w-16 items-center justify-center rounded-xl bg-primary px-3 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
              >
                {testing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Test alert"}
              </button>
            )}
            <button
              type="button"
              disabled={busy || state === "checking" || testing}
              onClick={() => void togglePush()}
              className={cn(
                "flex min-h-9 min-w-16 items-center justify-center rounded-xl px-3 text-[11px] font-semibold transition-colors disabled:opacity-50",
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
          </div>
        )}
      </div>
    </div>
  );
}
