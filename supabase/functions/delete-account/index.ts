import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const origins = new Set([
  "https://app.nurufaith.co.ke", // official youth app origin
  // Former apex app origin: kept only until the apex becomes the separate
  // ministry website, so already-installed PWAs there can still delete accounts.
  "https://nurufaith.co.ke",
  "https://www.nurufaith.co.ke",
  "https://nurufaith.website", // legacy installed PWA origin
  "https://www.nurufaith.website",
  "https://nuru-faith-vortiqora.vercel.app",
  "https://nuru-faith-git-main-vortiqora.vercel.app",
]);
Deno.serve(async (request) => {
  const origin = request.headers.get("origin") || "";
  const headers = {
    "Content-Type": "application/json",
    ...(origins.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Cache-Control": "no-store",
  };
  const reply = (status: number, value: unknown) => new Response(JSON.stringify(value), { status, headers });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return reply(405, { error: "Use POST." });
  if (origin && !origins.has(origin)) return reply(403, { error: "Use the official Nuru Faith app." });
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return reply(401, { error: "Sign in to continue." });
  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user?.email) return reply(401, { error: "Sign in again before deleting your account." });
  try {
    const body = await request.json();
    const changingPassword = body.action === "change-password";
    if ((!changingPassword && body.confirmation !== "DELETE") || typeof body.password !== "string" || !body.password || body.password.length > 256) return reply(400, { error: "Confirm your password and type DELETE." });
    // A verified authenticator must remain enforced even after checking the password.
    const verifiedMfa = user.factors?.some((factor) => factor.status === "verified");
    if (verifiedMfa) {
      const scoped = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
      const { data, error } = await scoped.auth.getClaims(token);
      if (error || data?.claims.aal !== "aal2") return reply(403, { error: "Verify your two-factor code by signing in again, then retry." });
    }
    const verifier = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: verified, error: passwordError } = await verifier.auth.signInWithPassword({ email: user.email, password: body.password });
    if (passwordError || verified.user?.id !== user.id) return reply(403, { error: "Your password was not confirmed. Please retry." });
    if (verified.session) await admin.auth.admin.signOut(verified.session.access_token, "local");
    if (changingPassword) {
      const next = body.newPassword;
      if (typeof next !== "string" || next.length < 12 || next.length > 72 || !/[a-z]/.test(next) || !/[A-Z]/.test(next) || !/[0-9]/.test(next) || !/[^A-Za-z0-9]/.test(next) || next === body.password) return reply(400, { error: "Choose a different password with 12–72 characters, uppercase, lowercase, a number and a symbol." });
      const response = await fetch(`${url}/auth/v1/user`, {
        method: "PUT",
        headers: { "apikey": Deno.env.get("SUPABASE_ANON_KEY")!, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ password: next, current_password: body.password, ...(typeof body.nonce === "string" && body.nonce ? { nonce: body.nonce } : {}) }),
      });
      const result = await response.json();
      if (!response.ok) return reply(400, { error: result.msg || result.message || "Could not update password.", code: result.error_code });
      if (!result.id) return reply(500, { error: "Password update was not confirmed." });
      return reply(200, { updated: true });
    }
    // Only service_role can call this inventory RPC. Object removal uses Storage API.
    for (;;) {
      const { data: objects, error: inventoryError } = await admin.rpc("account_deletion_storage_inventory", { account_id: user.id });
      if (inventoryError) throw inventoryError;
      if (!objects?.length) break;
      const buckets = new Map<string, string[]>();
      for (const object of objects) buckets.set(object.bucket_id, [...(buckets.get(object.bucket_id) || []), object.name]);
      for (const [bucket, names] of buckets) {
        const { error } = await admin.storage.from(bucket).remove(names);
        if (error) throw error;
      }
    }
    const { error: revokeError } = await admin.auth.admin.signOut(token, "global");
    if (revokeError) throw revokeError;
    const { error: deletionError } = await admin.auth.admin.deleteUser(user.id);
    if (deletionError) throw deletionError;
    return reply(200, { deleted: true });
  } catch {
    return reply(500, { error: "Account deletion could not finish. Please retry; some uploaded files may already have been removed." });
  }
});
