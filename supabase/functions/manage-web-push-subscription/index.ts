import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseNamedKeys(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const publishableKeys = parseNamedKeys(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"));
  const secretKeys = parseNamedKeys(Deno.env.get("SUPABASE_SECRET_KEYS"));
  const publishableKey =
    publishableKeys.default ??
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY");
  const secretKey =
    secretKeys.default ??
    Deno.env.get("SUPABASE_SECRET_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !publishableKey || !secretKey) {
    return json({ error: "Server configuration missing" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const token = authHeader.slice("Bearer ".length);
  const userClient = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(token);

  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const action = body.action;
  if (action === "register") {
    const raw = body.subscription;
    if (!raw || typeof raw !== "object") return json({ error: "subscription required" }, 400);

    const subscription = raw as Record<string, unknown>;
    const endpoint = typeof subscription.endpoint === "string" ? subscription.endpoint : "";
    const p256dh = typeof subscription.p256dh === "string" ? subscription.p256dh : "";
    const auth = typeof subscription.auth === "string" ? subscription.auth : "";
    const expirationTime =
      typeof subscription.expirationTime === "number" ? subscription.expirationTime : null;
    const userAgent =
      typeof subscription.userAgent === "string" ? subscription.userAgent.slice(0, 500) : null;

    if (!endpoint.startsWith("https://") || p256dh.length < 20 || auth.length < 8) {
      return json({ error: "Invalid push subscription" }, 400);
    }

    // A browser push endpoint belongs to one currently signed-in Nuru account.
    // Remove any stale owner before registering it to the authenticated caller.
    const { error: deleteError } = await admin
      .from("web_push_subscriptions")
      .delete()
      .eq("endpoint", endpoint);
    if (deleteError) return json({ error: "Could not rotate push subscription" }, 500);

    const { error: insertError } = await admin.from("web_push_subscriptions").insert({
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      expiration_time: expirationTime,
      enabled: true,
      user_agent: userAgent,
      updated_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    });
    if (insertError) return json({ error: "Could not save push subscription" }, 500);

    const { error: preferenceError } = await admin
      .from("notification_preferences")
      .upsert({ user_id: user.id }, { onConflict: "user_id" });
    if (preferenceError) return json({ error: "Could not initialize notification preferences" }, 500);

    return json({ ok: true });
  }

  if (action === "unregister") {
    const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
    if (!endpoint.startsWith("https://")) return json({ error: "Invalid endpoint" }, 400);

    const { error } = await admin
      .from("web_push_subscriptions")
      .delete()
      .eq("endpoint", endpoint)
      .eq("user_id", user.id);
    if (error) return json({ error: "Could not remove push subscription" }, 500);

    return json({ ok: true });
  }

  return json({ error: "Unsupported action" }, 400);
});
