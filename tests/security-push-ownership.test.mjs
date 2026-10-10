import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");

test("push registration never deletes another member's device subscription", () => {
  const source = read("supabase/functions/manage-web-push-subscription/index.ts");
  const registration = source.split('if (action === "register")')[1]?.split('if (action === "test")')[0];
  assert.ok(registration, "expected push registration handler");
  assert.ok(!registration.includes('.delete()'), "push registration must not delete rows by endpoint");
  assert.match(registration, /current\.user_id !== user\.id/);
  assert.match(registration, /return json\([^;]*409\)/);
  assert.match(registration, /\.eq\("user_id", user\.id\)/);
  assert.match(registration, /result\.error\.code === "23505"/);
  assert.match(registration, /endpoint\.length > 2048/);
});

test("unregister can remove only the caller's own subscription", () => {
  const source = read("supabase/functions/manage-web-push-subscription/index.ts");
  const unregister = source.split('if (action === "unregister")')[1];
  assert.match(unregister, /\.delete\(\)[\s\S]*?\.eq\("endpoint", endpoint\)[\s\S]*?\.eq\("user_id", user\.id\)/);
});

test("account deletion and password changes accept the canonical Nuru origin", () => {
  const source = read("supabase/functions/delete-account/index.ts");
  assert.match(source, /"https:\/\/app\.nurufaith\.co\.ke"/);
  assert.match(source, /"https:\/\/nurufaith\.website"/);
  assert.match(source, /if \(origin && !origins\.has\(origin\)\) return reply\(403/);
  assert.match(source, /auth\.getUser\(token\)/);
  assert.match(source, /verifiedMfa/);
  assert.match(source, /signInWithPassword/);
  assert.ok(!source.includes('"Access-Control-Allow-Origin": "*"'));
});
