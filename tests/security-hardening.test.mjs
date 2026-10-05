import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Vercel deploys browser security headers", () => {
  const config = JSON.parse(read("vercel.json"));
  const headers = config.headers?.[0]?.headers ?? [];
  const byName = new Map(headers.map((entry) => [entry.key.toLowerCase(), entry.value]));

  assert.match(byName.get("strict-transport-security") ?? "", /max-age=63072000/);
  assert.equal(byName.get("x-content-type-options"), "nosniff");
  assert.equal(byName.get("x-frame-options"), "DENY");
  assert.match(byName.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
  assert.match(byName.get("content-security-policy") ?? "", /object-src 'none'/);
  assert.match(byName.get("permissions-policy") ?? "", /geolocation=\(\)/);
});

test("protected Nuru routes require a session without an MFA redirect loop", () => {
  const route = read("src/routes/_authenticated/route.tsx");
  assert.match(route, /supabase\.auth\.getSession/);
  assert.match(route, /if \(error \|\| !user\) throw redirect/);
  assert.doesNotMatch(route, /getMfaRequirement/);
  assert.doesNotMatch(route, /mode: "mfa"/);
  assert.doesNotMatch(route, /mode: "mfa-setup"/);
});

test("staff database writes require AAL2", () => {
  const migration = read("supabase/migrations/20260922191500_require_staff_mfa.sql");
  assert.match(migration, /auth\.jwt\(\)->>'aal'/);
  assert.match(migration, /as restrictive for insert/);
  assert.match(migration, /as restrictive for update/);
  assert.match(migration, /as restrictive for delete/);
});

test("QA scripts never contain reconstructable credentials", () => {
  const script = read("scripts/capture-vercel-screenshots.mjs");
  assert.doesNotMatch(script, /nuru\.vercel\.qa\./i);
  assert.doesNotMatch(script, /NuruQA!/);
  assert.match(script, /NURU_QA_EMAIL/);
  assert.match(script, /NURU_QA_PASSWORD/);
});

test("new and reset passwords use the hardened validator", () => {
  const auth = read("src/routes/auth.tsx");
  const reset = read("src/routes/reset-password.tsx");
  const helper = read("src/lib/accountSecurity.ts");

  assert.match(auth, /newPasswordError/);
  assert.match(reset, /newPasswordError/);
  assert.match(helper, /password\.length < 12/);
  assert.match(helper, /\[A-Z\]/);
  assert.match(helper, /\[0-9\]/);
  assert.match(helper, /\[\^A-Za-z0-9\]/);
});

test("the metadata worker authorizes staff before loading the privileged client", () => {
  const worker = read("src/lib/musicCatalog.functions.ts");
  const roleCheck = worker.indexOf('if (roleError || !roles?.length)');
  const privilegedClient = worker.indexOf('await import("@/integrations/supabase/client.server")');
  assert.ok(roleCheck > 0 && privilegedClient > roleCheck);
  assert.match(worker, /middleware\(\[requireSupabaseAuth\]\)/);
  assert.match(worker, /if \(!trust\?\.is_verified \|\| !trustedChannel\(trust\.trust_level\)\)/);
  assert.match(worker, /ignoreDuplicates: true/);
  assert.doesNotMatch(worker, /\.from\("media_sources"\)[\s\S]{0,80}\.(insert|update|upsert)/);
});

test("import cursors cannot be supplied by clients and progress is not publicly writable", () => {
  const worker = read("src/lib/musicCatalog.functions.ts");
  const input = worker.slice(worker.indexOf('.inputValidator('), worker.indexOf('.handler('));
  assert.doesNotMatch(input, /channelId|pageToken|is_approved|title|external_id/);
  const migration = read("supabase/migrations/20261005055626_server_media_import_progress.sql");
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on public.media_catalog_imports from anon, authenticated/);
  assert.match(migration, /for select to authenticated using \(private.is_staff/);
});
