import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { hostedBuildEnvErrors } from "../scripts/check-hosted-build-env.mjs";
const base = { NETLIFY: "true", VITE_SUPABASE_URL: "https://qa.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test" };
const jwt = role => `header.${Buffer.from(JSON.stringify({role})).toString("base64url")}.signature`;

test("hosted clients require browser variables even when server variables exist", () => {
  assert.equal(hostedBuildEnvErrors({ NETLIFY: "true", SUPABASE_URL: base.VITE_SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY: base.VITE_SUPABASE_PUBLISHABLE_KEY }).length, 2);
  assert.equal(hostedBuildEnvErrors({ VERCEL: "1" }).length, 2);
  assert.deepEqual(hostedBuildEnvErrors({}), []);
});
test("accepts publishable and legacy anon keys but rejects privileged and unknown keys", () => {
  assert.deepEqual(hostedBuildEnvErrors(base), []);
  assert.deepEqual(hostedBuildEnvErrors({...base, VITE_SUPABASE_PUBLISHABLE_KEY:jwt("anon")}), []);
  for (const key of ["sb_secret_do-not-print", jwt("service_role"), "invalid"]) {
    const errors = hostedBuildEnvErrors({...base, VITE_SUPABASE_PUBLISHABLE_KEY:key});
    assert.equal(errors.length, 1);
    assert.ok(errors.every(error => !error.includes(key)));
  }
});
test("rejects insecure, malformed and credential-bearing backend URLs", () => {
  for (const url of ["http://qa.supabase.co", "bad", "https://user:secret@qa.supabase.co", "https://qa.supabase.co?token=secret"]) {
    assert.equal(hostedBuildEnvErrors({...base, VITE_SUPABASE_URL:url}).length, 1);
  }
});
test("the build preflight exits nonzero with redacted diagnostics", () => {
  const result = spawnSync(process.execPath, ["scripts/check-hosted-build-env.mjs"], {
    encoding:"utf8", env:{...process.env, ...base, VITE_SUPABASE_PUBLISHABLE_KEY:"sb_secret_do-not-print"},
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /privileged keys are forbidden/);
  assert.doesNotMatch(result.stderr, /sb_secret_do-not-print/);
});
