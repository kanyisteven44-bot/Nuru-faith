import { supabase } from "@/integrations/supabase/client";

export type WebPushState = "unsupported" | "blocked" | "available" | "enabled";

// VAPID public keys are designed to be shipped to browsers. The matching
// private key remains encrypted in Supabase Vault.
const WEB_PUSH_PUBLIC_KEY =
  "BJFmY3S0zK1Tru2R_7Kft32EUXkfY-7nvmuMMIPkEJUsvu2QxmvpIDyk7Ht68URW_7m6kZHDvTNX5n83iRBdzOE";

function hasPushSupport(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function vapidKeyToArrayBuffer(value: string): ArrayBuffer {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer.slice(0) as ArrayBuffer;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!hasPushSupport()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

async function registerSubscription(subscription: PushSubscription): Promise<void> {
  const serialized = subscription.toJSON();
  const endpoint = serialized.endpoint ?? subscription.endpoint;
  const p256dh = serialized.keys?.["p256dh"];
  const auth = serialized.keys?.["auth"];

  if (!endpoint || !p256dh || !auth) {
    throw new Error("The browser returned an incomplete push subscription.");
  }

  const { error } = await supabase.functions.invoke("manage-web-push-subscription", {
    body: {
      action: "register",
      subscription: {
        endpoint,
        p256dh,
        auth,
        expirationTime: serialized.expirationTime ?? null,
        userAgent: navigator.userAgent,
      },
    },
  });

  if (error) throw new Error(error.message);
}

export async function getWebPushState(): Promise<WebPushState> {
  if (!hasPushSupport()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";

  const subscription = await currentSubscription();
  if (!subscription) return "available";

  // Re-registering is idempotent and repairs server state after a sign-in
  // change while the browser retained its existing push subscription.
  await registerSubscription(subscription);
  return "enabled";
}

export async function enableWebPush(): Promise<void> {
  if (!hasPushSupport()) {
    throw new Error("Push notifications are not supported on this device.");
  }

  let permission: NotificationPermission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKeyToArrayBuffer(WEB_PUSH_PUBLIC_KEY),
    });
  }

  await registerSubscription(subscription);
}

export async function disableWebPush(): Promise<void> {
  if (!hasPushSupport()) return;

  const subscription = await currentSubscription();
  if (!subscription) return;

  const { error } = await supabase.functions.invoke("manage-web-push-subscription", {
    body: { action: "unregister", endpoint: subscription.endpoint },
  });
  if (error) throw new Error(error.message);

  await subscription.unsubscribe();
}
