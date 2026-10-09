import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BellOff,
  BellRing,
  ChevronDown,
  Settings2,
  CalendarDays,
  HeartHandshake,
  CheckCircle2,
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
import { CardSkeleton, EmptyState } from "@/components/nuru/Primitives";

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
  const [callHelpOpen, setCallHelpOpen] = useState(false);
  const [showTestAlerts, setShowTestAlerts] = useState(false);

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

  // Test alerts remain accessible, but repeated tests should not crowd out
  // real calls and community activity on a small phone screen.
  const isTestAlert = (row: (typeof all)[number]) =>
    row.category === "system" && row.title === "Nuru Faith test alert";
  const testCount = tab === "All" ? rows.filter(isTestAlert).length : 0;
  const visibleRows = tab === "All" && !showTestAlerts ? rows.filter((n) => !isTestAlert(n)) : rows;
  const unread = rows.filter((n) => !n.read && !isTestAlert(n)).length;

  async function open(notification: (typeof all)[number]) {
    if (!notification.read) {
      try {
        await markNotificationRead(notification.id);
        await Promise.allSettled([
          qc.invalidateQueries({ queryKey: ["notifications", userId] }),
          qc.invalidateQueries({ queryKey: ["notification-unread-count", userId] }),
        ]);
      } catch {
        toast.error("Couldn't mark this notification as read.");
      }
    }

    // Notification deep links are local app routes, never external URLs.
    if (notification.deep_link?.startsWith("/") && !notification.deep_link.startsWith("//")) {
      window.location.assign(notification.deep_link);
    }
  }

  return (
    <AppShell>
      <ScreenHeader title="Notifications" subtitle="Calls, messages and community updates" />

      {userId && <PushControl />}

      <section className="mx-4 mb-4 overflow-hidden rounded-2xl border border-border bg-card/60">
        <button
          type="button"
          aria-expanded={callHelpOpen}
          aria-controls="notification-call-help"
          onClick={() => setCallHelpOpen((value) => !value)}
          className="flex min-h-14 w-full items-center gap-3 px-3.5 py-3 text-left focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <PhoneIncoming className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold">Incoming calls when Nuru is closed</span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              {callHelpOpen ? "Hide setup tips" : "How background call alerts work"}
            </span>
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", callHelpOpen && "rotate-180")} />
        </button>
        {callHelpOpen && (
          <div id="notification-call-help" className="space-y-2 border-t border-border px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            <p>Enable device alerts above and allow notifications for Nuru in Android or Chrome. A call alert can appear when the app is minimized or closed on supported devices.</p>
            <p>Tap <strong>Open call</strong> to return to Nuru and answer while it is still ringing. Keep internet enabled and avoid restricting background activity.</p>
            <p>For easier access, install Nuru on your home screen. Alert sound and vibration depend on your phone settings.</p>
            <Link to="/messages" search={{}} className="inline-flex min-h-9 items-center gap-1.5 font-semibold text-primary hover:underline">
              <Phone className="h-4 w-4" /> Messages and call history
            </Link>
          </div>
        )}
      </section>

      <div className="no-scrollbar mx-4 flex gap-2 overflow-x-auto pb-3" role="tablist" aria-label="Filter notifications">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            onClick={() => setTab(item)}
            className={cn(
              "min-h-10 shrink-0 rounded-full border px-3.5 text-[12px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary",
              tab === item
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card/70 text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {item === "Mentorship" ? "Mentors" : item}
          </button>
        ))}
      </div>

      <section className="px-4 pb-8" aria-label="Notification activity">
        <div className="mb-2 flex min-h-7 items-center justify-between gap-3">
          <h2 className="text-[13px] font-semibold text-foreground">Recent activity</h2>
          {unread > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
              {unread} unread
            </span>
          )}
        </div>

        {notifications.isLoading && <CardSkeleton count={3} height="h-16" />}
        {notifications.isError && (
          <EmptyState
            title="Couldn't load notifications"
            description="Check your connection and try again."
            action={
              <button type="button" onClick={() => void notifications.refetch()} className="min-h-10 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">
                Retry
              </button>
            }
          />
        )}
        {!notifications.isLoading && !notifications.isError && visibleRows.length === 0 && (
          <EmptyState
            title={tab === "All" ? "You're all caught up" : "No notifications here"}
            description={
              tab === "Calls"
                ? "Incoming call alerts will appear here."
                : "Your new updates will show up here."
            }
          />
        )}

        {visibleRows.length > 0 && !notifications.isError && (
          <ul className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border bg-card/65">
            {visibleRows.map((n) => {
              const Icon = ICONS[n.category] ?? Bell;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void open(n)}
                    className={cn(
                      "flex min-h-[72px] w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-surface-2/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
                      !n.read && "bg-primary/5",
                    )}
                  >
                    <span className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      n.category === "call" ? "bg-primary/15 text-primary" : "bg-surface-2 text-secondary-foreground",
                    )}>
                      <Icon className="h-[19px] w-[19px]" strokeWidth={1.9} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className={cn(
                          "min-w-0 flex-1 truncate text-[13px]",
                          n.read ? "font-medium text-secondary-foreground" : "font-bold text-foreground",
                        )}>
                          {n.title}
                        </span>
                        <span className="shrink-0 pt-0.5 text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                      </span>
                      {n.body && (
                        <span className="mt-1 block truncate text-[12px] leading-snug text-muted-foreground">
                          {n.body}
                        </span>
                      )}
                    </span>
                    {!n.read && <span aria-label="Unread" className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {testCount > 0 && (
          <button
            type="button"
            onClick={() => setShowTestAlerts((value) => !value)}
            className="mt-3 inline-flex min-h-10 items-center gap-1 text-[12px] font-semibold text-muted-foreground hover:text-primary"
            aria-expanded={showTestAlerts}
          >
            <Bell className="h-3.5 w-3.5" />
            {showTestAlerts ? "Hide" : "Show"} {testCount} test alert{testCount === 1 ? "" : "s"}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showTestAlerts && "rotate-180")} />
          </button>
        )}
      </section>
    </AppShell>
  );
}

function PushControl() {
  const [state, setState] = useState<WebPushState | "checking" | "error">("checking");
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

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

  const enabled = state === "enabled";
  const blocked = state === "blocked";
  const hasError = state === "error";
  const unsupported = state === "unsupported";
  const checking = state === "checking";

  async function togglePush() {
    if (blocked || checking || hasError || unsupported || busy) return;
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
      setState(await getWebPushState().catch(() => "error" as const));
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
    <section className="px-4 pb-3" aria-label="Device notification settings">
      <div className={cn(
        "rounded-2xl border bg-card/80",
        enabled ? "border-primary/25" : "border-border",
      )}>
        <div className="flex min-h-[72px] items-center gap-3 px-3.5 py-3">
          <span className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            enabled ? "bg-primary/12 text-primary" : "bg-surface-2 text-muted-foreground",
          )}>
            {enabled ? <BellRing className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[13px] font-bold">
              {enabled ? "Device alerts on" : blocked ? "Notifications blocked" : unsupported ? "Browser not supported" : hasError ? "Couldn't check alerts" : checking ? "Checking alerts…" : "Enable device alerts"}
              {enabled && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Enabled" />}
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
              {enabled ? "Calls and messages can reach this phone" : blocked ? "Allow notifications in Chrome settings" : unsupported ? "Try Chrome on Android" : hasError ? "Check your connection and retry" : checking ? "Checking this device" : "Receive calls when Nuru is closed"}
            </span>
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            {enabled ? (
              <button type="button" disabled={testing || busy} onClick={() => void sendTest()}
                className="inline-flex min-h-10 items-center rounded-xl bg-primary px-3 text-[12px] font-semibold text-primary-foreground disabled:opacity-50">
                {testing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Test alert"}
              </button>
            ) : hasError ? (
              <button type="button" onClick={() => void retryCheck()} className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground">
                <RefreshCw className="h-4 w-4" /> Retry
              </button>
            ) : !blocked && !unsupported ? (
              <button type="button" disabled={checking || busy} onClick={() => void togglePush()}
                className="inline-flex min-h-10 items-center rounded-xl bg-primary px-3 text-[12px] font-semibold text-primary-foreground disabled:opacity-50">
                {checking || busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Enable"}
              </button>
            ) : null}
            <button type="button" aria-label="Notification preferences" aria-expanded={manageOpen}
              onClick={() => setManageOpen((value) => !value)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-surface-2 hover:text-foreground">
              <Settings2 className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
        {manageOpen && (
          <div className="space-y-3 border-t border-border px-4 py-3 text-[12px] leading-relaxed text-muted-foreground">
            {enabled ? (
              <>
                <p>Web Push is enabled for this browser. If you change phones or browsers, enable alerts there too.</p>
                <button type="button" disabled={busy || testing} onClick={() => void togglePush()}
                  className="min-h-10 rounded-xl border border-border px-3 font-semibold text-foreground disabled:opacity-50">
                  {busy ? "Updating…" : "Turn off device alerts"}
                </button>
              </>
            ) : blocked ? (
              <p>Open Android Settings → Apps → Chrome → Notifications, then allow notifications for nurufaith.co.ke in Chrome Site settings.</p>
            ) : unsupported ? (
              <p>This browser cannot register Web Push. On Android, open Nuru in a current version of Chrome to enable background call alerts. In-app calls still work while Nuru is open.</p>
            ) : (
              <p>{hasError ? "A connection error prevented us from checking your alert registration." : "Enable alerts above, then allow notifications when Chrome asks."}</p>
            )}
            {unsupported && <p className="font-semibold text-foreground">Background alerts not supported here</p>}
          </div>
        )}
      </div>
    </section>
  );
}
