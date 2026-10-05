import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import {
  buildPushPayload,
  type PushSubscription,
  type VapidKeys,
} from "npm:@block65/webcrypto-web-push@2.0.0";

type PushConfig = {
  subject: string | null;
  publicKey: string | null;
  privateKey: string | null;
  dispatchSecret: string | null;
};

function secureEqual(a: string, b: string) {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i]! ^ right[i]!;
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const url = Deno.env.get("SUPABASE_URL");
  const rawSecretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  const secretKeys = rawSecretKeys ? (JSON.parse(rawSecretKeys) as Record<string, string>) : {};
  const serviceKey = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return new Response("Server configuration missing", { status: 500 });

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rawConfig, error: configError } = await supabase.rpc("get_web_push_server_config");
  if (configError) {
    console.error("[web-push] config lookup failed", configError.message);
    return new Response("Push configuration unavailable", { status: 500 });
  }

  const config = rawConfig as PushConfig | null;
  const suppliedSecret = req.headers.get("x-nuru-push-secret") ?? "";
  if (
    !config?.dispatchSecret ||
    !suppliedSecret ||
    !secureEqual(config.dispatchSecret, suppliedSecret)
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!config.subject || !config.publicKey || !config.privateKey) {
    return new Response("VAPID configuration incomplete", { status: 503 });
  }

  let notificationId = "";
  try {
    const body = (await req.json()) as { notification_id?: unknown };
    notificationId = typeof body.notification_id === "string" ? body.notification_id : "";
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!notificationId) return new Response("notification_id required", { status: 400 });

  const { data: notification, error: notificationError } = await supabase
    .from("notifications")
    .select("id,user_id,category,title,body,deep_link,priority")
    .eq("id", notificationId)
    .maybeSingle();

  if (notificationError || !notification) {
    return new Response("Notification not found", { status: 404 });
  }

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("push_enabled,social_enabled,mentorship_enabled,events_enabled")
    .eq("user_id", notification.user_id)
    .maybeSingle();

  const categoryDisabled =
    notification.category === "social"
      ? prefs?.social_enabled === false
      : notification.category === "mentorship"
        ? prefs?.mentorship_enabled === false
        : notification.category === "event"
          ? prefs?.events_enabled === false
          : false;

  if (prefs?.push_enabled === false || categoryDisabled) {
    return Response.json({ delivered: 0, skipped: "preferences" });
  }

  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from("web_push_subscriptions")
    .select("id,endpoint,p256dh,auth,expiration_time")
    .eq("user_id", notification.user_id)
    .eq("enabled", true);

  if (subscriptionsError) {
    console.error("[web-push] subscription lookup failed", subscriptionsError.message);
    return new Response("Subscription lookup failed", { status: 500 });
  }

  if (!subscriptions?.length) return Response.json({ delivered: 0, skipped: "no-subscriptions" });

  const vapid: VapidKeys = {
    subject: config.subject,
    publicKey: config.publicKey,
    privateKey: config.privateKey,
  };

  const message = JSON.stringify({
    id: notification.id,
    title: notification.title || "Nuru Faith",
    body: notification.body || "",
    url: notification.deep_link || "/notifications",
    priority: notification.priority || "normal",
  });

  let delivered = 0;
  let disabled = 0;

  for (const row of subscriptions) {
    const subscription: PushSubscription = {
      endpoint: row.endpoint,
      expirationTime: row.expiration_time,
      keys: { p256dh: row.p256dh, auth: row.auth },
    };

    try {
      const init = await buildPushPayload(
        { data: message, options: { ttl: 60 * 60 } },
        subscription,
        vapid,
      );
      const response = await fetch(subscription.endpoint, init);

      if (response.ok) {
        delivered += 1;
        await supabase
          .from("web_push_subscriptions")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", row.id);
      } else if (response.status === 404 || response.status === 410) {
        disabled += 1;
        await supabase.from("web_push_subscriptions").update({ enabled: false }).eq("id", row.id);
      } else {
        console.warn("[web-push] provider rejected push", row.id, response.status);
      }
    } catch (error) {
      console.error(
        "[web-push] send failed",
        row.id,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  if (delivered > 0) {
    await supabase
      .from("notifications")
      .update({ delivered_at: new Date().toISOString() })
      .eq("id", notification.id);
  }

  return Response.json({ delivered, disabled, attempted: subscriptions.length });
});
