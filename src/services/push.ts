import { supabase } from "@/integrations/supabase/client";

export type WebPushState = "unsupported" | "blocked" | "available" | "enabled";

function supported() {
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
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}

async function currentSubscription() {
  if (!supported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

async function persistSubscription(subscription: PushSubscription) {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;

  if (!json.endpoint || !p256dh || !auth) {
    throw new Error("The browser returned an incomplete push subscription.");
  }

  const { error } = await supabase.rpc("register_web_push_subscription", {
    p_endpoint: json.endpoint,
    p_p256dh: p256dh,
    p_auth: auth,
    p_expiration_time: json.expirationTime ?? undefined,
    p_user_agent: navigator.userAgent,
  });

  if (error) throw new Error(error.message);
}

export async function getWebPushState(): Promise<WebPushState> {
  if (!supported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";

  const subscription = await currentSubscription();
  if (subscription) {
    // Heal the server-side registration if the browser retained the
    // subscription but app data was cleared or the user signed back in.
    await persistSubscription(subscription);
    return "enabled";
  }

  return "available";
}

export async function enableWebPush() {
  if (!supported()) throw new Error("Push notifications are not supported on this device.");

  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const { data: publicKey, error: keyError } = await supabase.rpc("get_web_push_public_key");
  if (keyError) throw new Error(keyError.message);
  if (!publicKey) throw new Error("Push notifications are not configured yet.");

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKeyToArrayBuffer(publicKey),
    });
  }

  await persistSubscription(subscription);
  return true;
}

export async function disableWebPush() {
  if (!supported()) return;

  const subscription = await currentSubscription();
  if (!subscription) return;

  const { error } = await supabase.rpc("unregister_web_push_subscription", {
    p_endpoint: subscription.endpoint,
  });
  if (error) throw new Error(error.message);

  await subscription.unsubscribe();
}
