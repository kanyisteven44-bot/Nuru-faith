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

test("protected Nuru routes enforce MFA requirements", () => {
  const route = read("src/routes/_authenticated/route.tsx");
  assert.match(route, /getMfaRequirement/);
  assert.match(route, /mode: "mfa"/);
  assert.match(route, /mode: "mfa-setup"/);
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
